import os
import hmac
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List, Union

from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, Body, Request, Response
from fastapi.encoders import ENCODERS_BY_TYPE
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, get_sqlite_db, init_sqlite_db
from models import Usuario, PerfilLog
from security import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    create_session_token,
    generate_temp_password,
    get_signing_secret,
    hash_password,
    is_valid_rut_format,
    normalize_rut,
    verify_password,
    verify_session_token,
)

# Registro global para que jsonable_encoder de FastAPI serialice ObjectId automáticamente a string
ENCODERS_BY_TYPE[ObjectId] = str


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_sqlite_db()
    yield


app = FastAPI(
    title="API Restaurante - C'est doux P",
    description="Arquitectura híbrida: SQLite (Usuarios/Auth/Logs) + MongoDB Atlas (Operación)",
    lifespan=lifespan,
)

# ==============================================================================
# CORS — permite peticiones locales, túneles y dominios en la nube (Railway)
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "https://imprecise-hammock-rigid.ngrok-free.dev",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# ARCHIVOS ESTÁTICOS — Servir imágenes de los productos desde /Imagenes
# ==============================================================================
imagenes_dir = os.path.join(os.path.dirname(__file__), "Imagenes")
if not os.path.exists(imagenes_dir):
    os.makedirs(imagenes_dir, exist_ok=True)

try:
    from fastapi.staticfiles import StaticFiles
    app.mount("/Imagenes", StaticFiles(directory=imagenes_dir), name="imagenes")
except Exception as static_err:
    StaticFiles = None
    print(f"[STATIC INFO] Servidor de estáticos fallback FileResponse activo: {static_err}")


@app.get("/Imagenes/{nombre_archivo}", tags=["Archivos"])
async def obtener_imagen_estatica(nombre_archivo: str):
    ruta = os.path.join(imagenes_dir, nombre_archivo)
    if os.path.exists(ruta):
        return FileResponse(ruta)
    raise HTTPException(status_code=404, detail="Imagen no encontrada")


# ==============================================================================
# HELPERS — serialización, roles, cookies y bitácora por perfil (SQLite)
# ==============================================================================
VALID_ROLES = ("Administrador", "Cocinero", "Garzón")


def normalize_role(raw_role: Optional[str]) -> str:
    r = (raw_role or "").strip().lower()
    if r in ("admin", "administrador", "gerente"):
        return "Administrador"
    if r in ("cocinero", "cocina", "chef"):
        return "Cocinero"
    return "Garzón"


def serialize_usuario(u: Usuario) -> dict:
    """Retorna únicamente datos públicos seguros del usuario (nunca password_hash)."""
    return {
        "id": u.id,
        "_id": str(u.id),
        "rut": u.rut,
        "nombre": u.nombre,
        "apellido": u.apellido or "",
        "correo": u.correo,
        "username": u.username,
        "rol": u.rol,
        "cargo": u.rol,
        "telefono": u.telefono,
        "must_change_password": bool(u.must_change_password),
        "estado": "Activo" if u.activo else "Inactivo",
    }


def registrar_log(
    sqlite_db: Session,
    usuario: Optional[Usuario],
    rol: str,
    accion: str,
    detalle: Optional[str] = None,
):
    """Guarda un registro de actividad asociado estrictamente a un perfil/rol."""
    try:
        log = PerfilLog(
            usuario_id=usuario.id if usuario else None,
            rol=normalize_role(rol),
            accion=accion[:100],
            detalle=detalle[:255] if detalle else None,
        )
        sqlite_db.add(log)
        sqlite_db.commit()
    except Exception:
        sqlite_db.rollback()


def _is_https_request(request: Request) -> bool:
    forwarded_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip().lower()
    return request.url.scheme == "https" or forwarded_proto == "https"


def _set_session_cookie(response: Response, request: Request, token: str):
    is_https = _is_https_request(request)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none" if is_https else "lax",
        secure=is_https,
        max_age=SESSION_TTL_SECONDS,
        path="/",
    )


def _clear_session_cookie(response: Response, request: Request):
    is_https = _is_https_request(request)
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        samesite="none" if is_https else "lax",
        secure=is_https,
    )


def _extract_token(request: Request) -> Optional[str]:
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    auth_header = request.headers.get("Authorization") or ""
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


def get_current_user_allow_pwd_change(
    request: Request,
    sqlite_db: Session = Depends(get_sqlite_db),
) -> Usuario:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="NO_AUTENTICADO")
    secret = get_signing_secret(sqlite_db)
    payload = verify_session_token(token, secret)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="SESION_INVALIDA")
    try:
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="SESION_INVALIDA")

    user = sqlite_db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="USUARIO_INACTIVO")
    return user


def get_current_user(user: Usuario = Depends(get_current_user_allow_pwd_change)) -> Usuario:
    if user.must_change_password:
        raise HTTPException(status_code=403, detail="PASSWORD_CHANGE_REQUIRED")
    return user


def require_roles(*allowed_roles: str):
    normalized_allowed = {normalize_role(r) for r in allowed_roles}

    def dependency(user: Usuario = Depends(get_current_user)) -> Usuario:
        if normalize_role(user.rol) not in normalized_allowed:
            raise HTTPException(status_code=403, detail="ACCESO_DENEGADO_ROL")
        return user

    return dependency


MAPA_IMAGENES_POR_NOMBRE = {
    "plato principal alpha": "plato_alpha.jpg",
    "entrada especial beta": "entrada_beta.jpg",
    "sopa tradicional gamma": "sopa_gamma.jpg",
    "corte de carne delta": "corte_delta.jpg",
    "pasta artesanal epsilon": "pasta_epsilon.jpg",
    "postre tentación zeta": "postreUV.jpeg",
    "postre tentacion zeta": "postreUV.jpeg",
    "carpaccio de res trufado": "carpaccio_trufado.jpg",
    "bisque de mariscos del puerto": "bisque_mariscos.jpg",
    "ravioles de ricotta y nueces": "ravioles_ricotta.jpg",
    "limonada menta jengibre": "limonada_menta.jpg",
    "copa de vino reserva syrah": "vino_reserva.jpg",
}

MAPA_IMAGENES_POR_ID = {
    1: "plato_alpha.jpg",
    2: "entrada_beta.jpg",
    3: "sopa_gamma.jpg",
    4: "corte_delta.jpg",
    5: "pasta_epsilon.jpg",
    6: "postreUV.jpeg",
    7: "carpaccio_trufado.jpg",
    8: "bisque_mariscos.jpg",
    9: "ravioles_ricotta.jpg",
    10: "limonada_menta.jpg",
    11: "vino_reserva.jpg",
}


def resolver_imagen_producto(doc: dict) -> str:
    """Garantiza que siempre retorne la ruta de imagen correcta del catálogo."""
    img = doc.get("imagen")
    if img and str(img).strip():
        img_str = str(img).strip()
        if img_str.startswith("http://") or img_str.startswith("https://") or img_str.startswith("/"):
            return img_str
        return f"/Imagenes/{img_str.lstrip('/')}"

    nombre_norm = str(doc.get("nombre", "")).strip().lower()
    if nombre_norm in MAPA_IMAGENES_POR_NOMBRE:
        return f"/Imagenes/{MAPA_IMAGENES_POR_NOMBRE[nombre_norm]}"

    for k, v in MAPA_IMAGENES_POR_NOMBRE.items():
        if k in nombre_norm or nombre_norm in k:
            return f"/Imagenes/{v}"

    id_plato = doc.get("id_plato")
    if id_plato in MAPA_IMAGENES_POR_ID:
        return f"/Imagenes/{MAPA_IMAGENES_POR_ID[id_plato]}"

    return "/Imagenes/plato_alpha.jpg"


def serializar_doc(val):
    """Convierte recursivamente cualquier ObjectId o datetime a formato serializable JSON."""
    if isinstance(val, ObjectId):
        return str(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, dict):
        return {str(k): serializar_doc(v) for k, v in val.items()}
    if isinstance(val, (list, tuple, set)):
        return [serializar_doc(item) for item in val]
    return val


def build_producto_filter(id_producto: str) -> dict:
    """Permite buscar un producto tanto por su ObjectId (_id) como por id_plato (int)."""
    try:
        return {"_id": ObjectId(id_producto)}
    except Exception:
        try:
            return {"id_plato": int(id_producto)}
        except Exception:
            return {"_id": id_producto}


async def build_mesa_pedidos_filter(num_mesa: int, db) -> dict:
    """Construye un filtro para pedidos de una mesa, incluyendo int y str y los que vienen por id_visita."""
    mesa_conditions = [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]
    try:
        visitas_docs = await db.visitas.find(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"id_visita": 1},
        ).to_list(length=100)
        visitas_ids = [v["id_visita"] for v in visitas_docs if "id_visita" in v]
        if visitas_ids:
            return {"$or": [*mesa_conditions, {"id_visita": {"$in": visitas_ids}}]}
    except Exception:
        pass
    return {"$or": mesa_conditions}


# ==============================================================================
# MODELOS PYDANTIC
# ==============================================================================
class MesaCreate(BaseModel):
    num_mesa: int
    estado: str = "Libre"
    piso: int = 1
    qr_token: Optional[str] = None
    visita_activa_id: Optional[str] = None


class MesaUpdateEstado(BaseModel):
    estado: str


class ProductoCreate(BaseModel):
    nombre: str
    categoria: str = "Platos de Fondo"
    precio: float
    etiquetas: List[str] = []
    disponibilidad: str = "En stock"
    imagen: Optional[str] = None
    tiempo_preparacion: int = 15
    descripcion: Optional[str] = None


class ProductoUpdatePrecio(BaseModel):
    precio: float


class ProductoDisponibilidad(BaseModel):
    disponible: bool


class ItemPedido(BaseModel):
    producto_id: Optional[str] = "1"
    nombre: Optional[str] = "Plato"
    precio_unitario: Optional[float] = 0.0
    cantidad: Optional[int] = 1
    observaciones: Optional[str] = None


class PedidoCreate(BaseModel):
    num_mesa: Union[int, str]
    visita_id: Optional[str] = None
    empleado_id: Optional[str] = None
    estado_pedido: Optional[str] = "Pendiente"
    hora_pedido: Optional[str] = None
    items: Optional[List[ItemPedido]] = []
    notas: Optional[str] = None


class SolicitudGarzon(BaseModel):
    activa: bool = False
    hora_solicitud: Optional[str] = None
    motivo: Optional[str] = None


class PagoVisita(BaseModel):
    metodo: str = "Efectivo"
    monto: float = 0.0
    hora: Optional[str] = None


class VisitaCreate(BaseModel):
    num_mesa: int
    hora_inicio: Optional[str] = None
    estado_visita: str = "Activa"
    solicitud_garzon: Optional[SolicitudGarzon] = None
    pagos: List[PagoVisita] = []


class LlamarGarzonInput(BaseModel):
    motivo: str = "Necesito atención"


class SetupAdminInput(BaseModel):
    rut: str
    nombre: str
    apellido: Optional[str] = ""
    correo: Optional[str] = None
    telefono: Optional[str] = None
    password: str
    confirm_password: str
    setup_code: Optional[str] = None


class LoginInput(BaseModel):
    rut: Optional[str] = None
    username: Optional[str] = None
    password: str


class ChangePasswordInput(BaseModel):
    new_password: str
    confirm_password: str
    current_password: Optional[str] = None


class EmpleadoCreate(BaseModel):
    rut: str
    nombre: str
    apellido: Optional[str] = ""
    correo: Optional[str] = None
    username: Optional[str] = None
    rol: str = "Garzón"
    telefono: Optional[str] = None


class EmpleadoUpdateRol(BaseModel):
    rol: str


class MesasCantidadInput(BaseModel):
    cantidad: int


# ==============================================================================
# AUTH & ASISTENTE DE ACTIVACIÓN INICIAL (SQLite)
# ==============================================================================
@app.get("/auth/status", tags=["Auth"])
async def auth_status(sqlite_db: Session = Depends(get_sqlite_db)):
    """Indica si el sistema requiere configurar el Administrador inicial (sin exponer datos)."""
    admin_count = (
        sqlite_db.query(Usuario)
        .filter(Usuario.rol == "Administrador", Usuario.activo == True)
        .count()
    )
    setup_code_env = (os.getenv("ADMIN_SETUP_CODE") or "").strip()
    return {
        "needs_admin_setup": admin_count == 0,
        "requires_setup_code": bool(setup_code_env),
    }


@app.post("/auth/setup-admin", tags=["Auth"])
async def setup_initial_admin(
    payload: SetupAdminInput,
    request: Request,
    response: Response,
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """
    Asistente de activación inicial: crea el primer Administrador cuando aún no existe ninguno.
    Se bloquea permanentemente en cuanto el primer Administrador queda registrado en SQLite.
    """
    admin_count = (
        sqlite_db.query(Usuario)
        .filter(Usuario.rol == "Administrador", Usuario.activo == True)
        .count()
    )
    if admin_count > 0:
        raise HTTPException(status_code=403, detail="SETUP_ALREADY_COMPLETED")

    setup_code_env = (os.getenv("ADMIN_SETUP_CODE") or "").strip()
    if setup_code_env:
        provided_code = (payload.setup_code or "").strip()
        if not provided_code or not hmac.compare_digest(provided_code, setup_code_env):
            raise HTTPException(status_code=403, detail="INVALID_SETUP_CODE")

    if not is_valid_rut_format(payload.rut):
        raise HTTPException(status_code=400, detail="RUT inválido. Usa formato 12345678-9.")

    rut_norm = normalize_rut(payload.rut)
    nombre_clean = (payload.nombre or "").strip()
    apellido_clean = (payload.apellido or "").strip()
    if not nombre_clean:
        raise HTTPException(status_code=400, detail="El nombre del administrador es obligatorio.")

    pwd = (payload.password or "").strip()
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres.")
    if pwd != (payload.confirm_password or "").strip():
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden.")

    correo_clean = (payload.correo or "").strip().lower() or None
    if sqlite_db.query(Usuario).filter(Usuario.rut == rut_norm).first():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese RUT.")
    if correo_clean and sqlite_db.query(Usuario).filter(Usuario.correo == correo_clean).first():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")

    admin = Usuario(
        rut=rut_norm,
        nombre=nombre_clean,
        apellido=apellido_clean,
        correo=correo_clean,
        username=rut_norm,
        rol="Administrador",
        telefono=(payload.telefono or "").strip() or None,
        password_hash=hash_password(pwd),
        must_change_password=False,
        activo=True,
    )
    sqlite_db.add(admin)
    sqlite_db.commit()
    sqlite_db.refresh(admin)

    registrar_log(
        sqlite_db,
        admin,
        "Administrador",
        "Activación inicial del sistema",
        f"Administrador {admin.nombre} ({admin.rut}) configurado",
    )

    secret = get_signing_secret(sqlite_db)
    token = create_session_token(
        {"sub": str(admin.id), "rut": admin.rut, "rol": admin.rol, "pwd_change_only": False},
        secret,
    )
    _set_session_cookie(response, request, token)
    return {"mensaje": "Administrador inicial configurado correctamente", "user": serialize_usuario(admin)}


@app.post("/empleados/login", tags=["Auth"])
async def login_empleado(
    creds: LoginInput,
    request: Request,
    response: Response,
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Autentica empleados exclusivamente contra SQLite verificando hash de contraseña."""
    identifier = (creds.rut or creds.username or "").strip()
    password_clean = (creds.password or "").strip()

    if not identifier or not password_clean:
        raise HTTPException(status_code=401, detail="CREDENCIALES_INCORRECTAS")

    rut_norm = normalize_rut(identifier)
    ident_lower = identifier.lower()

    user = (
        sqlite_db.query(Usuario)
        .filter(
            (Usuario.rut == rut_norm)
            | (Usuario.correo == ident_lower)
            | (Usuario.username == ident_lower)
        )
        .first()
    )

    if not user or not user.activo or not verify_password(password_clean, user.password_hash):
        raise HTTPException(status_code=401, detail="CREDENCIALES_INCORRECTAS")

    registrar_log(
        sqlite_db,
        user,
        user.rol,
        "Primer ingreso (cambio de clave requerido)" if user.must_change_password else "Inicio de sesión",
        f"Acceso de {user.nombre} {user.apellido}".strip(),
    )

    secret = get_signing_secret(sqlite_db)
    token = create_session_token(
        {
            "sub": str(user.id),
            "rut": user.rut,
            "rol": user.rol,
            "pwd_change_only": bool(user.must_change_password),
        },
        secret,
    )
    _set_session_cookie(response, request, token)
    return serialize_usuario(user)


@app.get("/empleados/me", tags=["Auth"])
async def obtener_sesion_actual(user: Usuario = Depends(get_current_user_allow_pwd_change)):
    """Devuelve el usuario autenticado actual validado por la cookie HttpOnly."""
    return serialize_usuario(user)


@app.post("/empleados/logout", tags=["Auth"])
async def logout_empleado(
    request: Request,
    response: Response,
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Cierra sesión limpiando la cookie HttpOnly."""
    token = _extract_token(request)
    if token:
        secret = get_signing_secret(sqlite_db)
        payload = verify_session_token(token, secret)
        if payload and "sub" in payload:
            try:
                user = sqlite_db.query(Usuario).filter(Usuario.id == int(payload["sub"])).first()
                if user:
                    registrar_log(sqlite_db, user, user.rol, "Cierre de sesión", f"Salida de {user.nombre}")
            except Exception:
                pass
    _clear_session_cookie(response, request)
    return {"mensaje": "Sesión cerrada"}


@app.post("/empleados/cambiar-password", tags=["Auth"])
async def cambiar_password(
    payload: ChangePasswordInput,
    request: Request,
    response: Response,
    user: Usuario = Depends(get_current_user_allow_pwd_change),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """
    Cambia la contraseña del usuario autenticado.
    Obligatorio en primer ingreso antes de acceder a cualquier panel operativo.
    """
    new_pwd = (payload.new_password or "").strip()
    confirm_pwd = (payload.confirm_password or "").strip()

    if not user.must_change_password:
        curr_pwd = (payload.current_password or "").strip()
        if not curr_pwd or not verify_password(curr_pwd, user.password_hash):
            raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")

    if len(new_pwd) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres.")
    if new_pwd != confirm_pwd:
        raise HTTPException(status_code=400, detail="Las contraseñas nuevas no coinciden.")
    if verify_password(new_pwd, user.password_hash):
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser igual a la temporal.")

    user.password_hash = hash_password(new_pwd)
    user.must_change_password = False
    sqlite_db.commit()
    sqlite_db.refresh(user)

    registrar_log(
        sqlite_db,
        user,
        user.rol,
        "Contraseña actualizada",
        "Activación de clave definitiva completada",
    )

    secret = get_signing_secret(sqlite_db)
    token = create_session_token(
        {"sub": str(user.id), "rut": user.rut, "rol": user.rol, "pwd_change_only": False},
        secret,
    )
    _set_session_cookie(response, request, token)
    return {"mensaje": "Contraseña actualizada correctamente", "user": serialize_usuario(user)}


@app.get("/auth/logs", tags=["Auth"])
async def obtener_logs_por_perfil(
    user: Usuario = Depends(get_current_user),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Retorna exclusivamente los logs correspondientes al rol del usuario autenticado."""
    user_role = normalize_role(user.rol)
    rows = (
        sqlite_db.query(PerfilLog)
        .filter(PerfilLog.rol == user_role)
        .order_by(PerfilLog.id.desc())
        .limit(40)
        .all()
    )
    return [
        {
            "id": r.id,
            "rol": r.rol,
            "accion": r.accion,
            "detalle": r.detalle,
            "fecha": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# ==============================================================================
# EMPLEADOS — Registro exclusivo en SQLite (Solo Administrador)
# ==============================================================================
@app.get("/empleados", tags=["Empleados"])
async def listar_empleados(
    _admin: Usuario = Depends(require_roles("Administrador")),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Retorna la plantilla de trabajadores desde SQLite sin exponer contraseñas ni hashes."""
    users = sqlite_db.query(Usuario).order_by(Usuario.id.asc()).all()
    return [serialize_usuario(u) for u in users]


@app.post("/empleados", tags=["Empleados"])
async def crear_empleado(
    emp: EmpleadoCreate,
    admin: Usuario = Depends(require_roles("Administrador")),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """
    Crea un empleado en SQLite con contraseña temporal aleatoria y must_change_password=True.
    La contraseña temporal se devuelve una sola vez para que el Administrador la entregue al trabajador.
    """
    if not is_valid_rut_format(emp.rut):
        raise HTTPException(status_code=400, detail="RUT inválido. Usa formato 12345678-9.")

    rut_norm = normalize_rut(emp.rut)
    nombre_clean = (emp.nombre or "").strip()
    apellido_clean = (emp.apellido or "").strip()
    if not nombre_clean:
        raise HTTPException(status_code=400, detail="El nombre del trabajador es obligatorio.")

    rol = normalize_role(emp.rol)
    correo_clean = (emp.correo or "").strip().lower() or None
    username_clean = (emp.username or "").strip().lower() or rut_norm

    if sqlite_db.query(Usuario).filter(Usuario.rut == rut_norm).first():
        raise HTTPException(status_code=409, detail="Ya existe un trabajador registrado con ese RUT.")
    if correo_clean and sqlite_db.query(Usuario).filter(Usuario.correo == correo_clean).first():
        raise HTTPException(status_code=409, detail="Ya existe un trabajador registrado con ese correo.")
    if sqlite_db.query(Usuario).filter(Usuario.username == username_clean).first():
        username_clean = rut_norm

    temp_password = generate_temp_password()
    nuevo = Usuario(
        rut=rut_norm,
        nombre=nombre_clean,
        apellido=apellido_clean,
        correo=correo_clean,
        username=username_clean,
        rol=rol,
        telefono=(emp.telefono or "").strip() or None,
        password_hash=hash_password(temp_password),
        must_change_password=True,
        activo=True,
    )
    sqlite_db.add(nuevo)
    sqlite_db.commit()
    sqlite_db.refresh(nuevo)

    registrar_log(
        sqlite_db,
        admin,
        "Administrador",
        "Alta de trabajador",
        f"Se creó a {nuevo.nombre} {nuevo.apellido} ({nuevo.rol}, RUT {nuevo.rut})".strip(),
    )

    return {
        "mensaje": "Empleado creado en SQLite",
        "empleado": serialize_usuario(nuevo),
        "temporary_password": temp_password,
    }


@app.post("/empleados/{id_empleado}/reset-password", tags=["Empleados"])
async def resetear_password_empleado(
    id_empleado: int,
    admin: Usuario = Depends(require_roles("Administrador")),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Genera una nueva contraseña temporal aleatoria y exige cambiarla en el próximo ingreso."""
    target = sqlite_db.query(Usuario).filter(Usuario.id == id_empleado).first()
    if not target:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    temp_password = generate_temp_password()
    target.password_hash = hash_password(temp_password)
    target.must_change_password = True
    sqlite_db.commit()
    sqlite_db.refresh(target)

    registrar_log(
        sqlite_db,
        admin,
        "Administrador",
        "Reseteo de contraseña",
        f"Nueva clave temporal generada para {target.nombre} ({target.rut})",
    )

    return {
        "mensaje": "Contraseña temporal regenerada",
        "empleado": serialize_usuario(target),
        "temporary_password": temp_password,
    }


@app.put("/empleados/{id_empleado}/rol", tags=["Empleados"])
@app.patch("/empleados/{id_empleado}/rol", tags=["Empleados"])
async def actualizar_rol_empleado(
    id_empleado: int,
    data: EmpleadoUpdateRol,
    admin: Usuario = Depends(require_roles("Administrador")),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Actualiza el rol de un trabajador en SQLite."""
    target = sqlite_db.query(Usuario).filter(Usuario.id == id_empleado).first()
    if not target:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    new_role = normalize_role(data.rol)
    if target.rol == "Administrador" and new_role != "Administrador":
        other_admins = (
            sqlite_db.query(Usuario)
            .filter(Usuario.rol == "Administrador", Usuario.activo == True, Usuario.id != target.id)
            .count()
        )
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Debe existir al menos un Administrador activo.")

    target.rol = new_role
    sqlite_db.commit()
    sqlite_db.refresh(target)

    registrar_log(
        sqlite_db,
        admin,
        "Administrador",
        "Cambio de rol",
        f"{target.nombre} ({target.rut}) asignado a {new_role}",
    )

    return {"mensaje": f"Rol actualizado a {new_role}", "id": id_empleado, "rol": new_role}


@app.delete("/empleados/{id_empleado}", tags=["Empleados"])
async def eliminar_empleado(
    id_empleado: int,
    admin: Usuario = Depends(require_roles("Administrador")),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Elimina un trabajador de SQLite."""
    target = sqlite_db.query(Usuario).filter(Usuario.id == id_empleado).first()
    if not target:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta activa.")
    if target.rol == "Administrador":
        other_admins = (
            sqlite_db.query(Usuario)
            .filter(Usuario.rol == "Administrador", Usuario.activo == True, Usuario.id != target.id)
            .count()
        )
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="No puedes eliminar al único Administrador.")

    nombre_ref = f"{target.nombre} ({target.rut})"
    sqlite_db.delete(target)
    sqlite_db.commit()

    registrar_log(sqlite_db, admin, "Administrador", "Baja de trabajador", f"Eliminado: {nombre_ref}")
    return {"mensaje": "Trabajador eliminado correctamente", "id": id_empleado}


# ==============================================================================
# MESAS — MongoDB Atlas
# ==============================================================================
@app.get("/mesas", tags=["Mesas"])
async def listar_mesas(
    _staff: Usuario = Depends(require_roles("Administrador", "Cocinero", "Garzón")),
    db=Depends(get_db),
):
    """Retorna las mesas registradas (normalizadas por número único) y las llamadas activas."""
    try:
        cursor = db.mesas.find({}).sort("num_mesa", 1)
        raw_mesas = await cursor.to_list(length=200)

        mesas_por_num = {}
        for m in raw_mesas:
            try:
                num_m = int(m.get("num_mesa"))
                if 1 <= num_m <= 50 and num_m not in mesas_por_num:
                    m_copy = serializar_doc(m)
                    m_copy["num_mesa"] = num_m
                    mesas_por_num[num_m] = m_copy
            except Exception:
                pass

        mesas_ordenadas = [mesas_por_num[k] for k in sorted(mesas_por_num.keys())]
        total_mesas = max(mesas_por_num.keys()) if mesas_por_num else len(mesas_ordenadas)

        llamadas_cursor = db.visitas.find(
            {"estado_visita": {"$ne": "Finalizada"}, "solicitud_garzon.activa": True},
            {"num_mesa": 1, "solicitud_garzon": 1},
        )
        llamadas_docs = await llamadas_cursor.to_list(length=200)
        llamadas_activas = {}
        for v in llamadas_docs:
            try:
                num_m = int(v.get("num_mesa"))
                if num_m <= total_mesas:
                    sol = v.get("solicitud_garzon") or {}
                    llamadas_activas[str(num_m)] = {
                        "motivo": sol.get("motivo") or "Atención solicitada en mesa",
                        "hora_solicitud": sol.get("hora_solicitud"),
                    }
            except Exception:
                pass

        return {
            "total": total_mesas if total_mesas > 0 else len(mesas_ordenadas),
            "mesas": mesas_ordenadas,
            "llamadas_activas": llamadas_activas,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/mesas/cantidad", tags=["Mesas"])
async def ajustar_cantidad_mesas(
    data: MesasCantidadInput,
    admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Ajusta dinámicamente la cantidad total de mesas del restaurante (1 a 50)."""
    try:
        nueva_cantidad = max(1, min(50, int(data.cantidad)))

        # Normalizar y asegurar mesas 1..nueva_cantidad
        for n in range(1, nueva_cantidad + 1):
            await db.mesas.update_one(
                {"$or": [{"num_mesa": n}, {"num_mesa": str(n)}]},
                {
                    "$set": {"num_mesa": n},
                    "$setOnInsert": {"estado": "Libre", "piso": 1, "visita_activa_id": None},
                },
                upsert=True,
            )

        # Eliminar cualquier mesa excedente (> nueva_cantidad), duplicada o inválida (int o str)
        mesas_existentes = await db.mesas.find({}).to_list(length=500)
        seen = set()
        excedentes = []
        for m in mesas_existentes:
            try:
                n = int(m.get("num_mesa"))
            except Exception:
                await db.mesas.delete_one({"_id": m["_id"]})
                continue

            if n < 1 or n > nueva_cantidad or n in seen:
                await db.mesas.delete_one({"_id": m["_id"]})
                if n > nueva_cantidad:
                    excedentes.extend([n, str(n)])
            else:
                seen.add(n)

        # Archivar pedidos activos y apagar llamadas de mesas retiradas para mantener coherencia
        if excedentes:
            await db.pedidos.update_many(
                {"num_mesa": {"$in": excedentes}, "estado_pedido": {"$nin": ["Archivado", "Entregado"]}},
                {"$set": {"estado_pedido": "Archivado"}},
            )
            await db.visitas.update_many(
                {"num_mesa": {"$in": excedentes}},
                {"$set": {"estado_visita": "Finalizada", "solicitud_garzon.activa": False}},
            )

        total_final = await db.mesas.count_documents({})
        registrar_log(
            sqlite_db,
            admin,
            "Administrador",
            "Capacidad de mesas ajustada",
            f"Salón configurado a {nueva_cantidad} mesas",
        )
        return {
            "mensaje": f"Capacidad del salón ajustada a {nueva_cantidad} mesas",
            "cantidad": nueva_cantidad,
            "total_registradas": total_final,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 1. INSERT (MongoDB Atlas)
# ==============================================================================
@app.post("/mesas", tags=["1. INSERT (3)"])
async def crear_mesa(
    mesa: MesaCreate,
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.mesas.insert_one(mesa.model_dump())
        return {"mensaje": "Mesa creada", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/productos", tags=["1. INSERT (3)"])
async def crear_producto(
    producto: ProductoCreate,
    _staff: Usuario = Depends(require_roles("Cocinero", "Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.producto.insert_one(producto.model_dump())
        return {"mensaje": "Producto creado", "id": str(resultado.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/pedidos", tags=["1. INSERT (3)"])
async def crear_pedido(pedido: PedidoCreate, db=Depends(get_db)):
    """
    Inserta un pedido con items embebidos en la colección 'pedidos',
    o acumula los nuevos platos si la mesa ya tiene una comanda activa en cocina.
    """
    try:
        pedido_dict = pedido.model_dump()
        try:
            pedido_dict["num_mesa"] = int(pedido_dict["num_mesa"])
        except Exception:
            pass

        if not pedido_dict.get("hora_pedido"):
            try:
                from datetime import timezone, timedelta
                chile_tz = timezone(timedelta(hours=-3))
                pedido_dict["hora_pedido"] = datetime.now(chile_tz).strftime("%H:%M")
            except Exception:
                pedido_dict["hora_pedido"] = datetime.now().strftime("%H:%M")

        items_nuevos = pedido_dict.get("items") or []
        filtro_mesa = await build_mesa_pedidos_filter(pedido_dict["num_mesa"], db)

        pedido_activo = await db.pedidos.find_one({
            **filtro_mesa,
            "estado_pedido": {"$in": ["Pendiente", "En preparación", "Esperando", "Listo"]},
        })

        if pedido_activo:
            items_totales = (pedido_activo.get("items") or []) + items_nuevos
            subtotal_total = sum(
                float(it.get("precio_unitario", 0) or 0) * int(it.get("cantidad", 1) or 1)
                for it in items_totales
            )
            notas_previas = pedido_activo.get("notas", "")
            nueva_nota = pedido_dict.get("notas", "")
            notas_acumuladas = f"{notas_previas} | {nueva_nota}".strip(" |") if nueva_nota else notas_previas

            await db.pedidos.update_one(
                {"_id": pedido_activo["_id"]},
                {"$set": {
                    "items": items_totales,
                    "subtotal": subtotal_total,
                    "total": subtotal_total,
                    "notas": notas_acumuladas,
                    "hora_pedido": pedido_dict["hora_pedido"],
                }},
            )
            return {
                "mensaje": "Platos adicionales agregados a la comanda activa",
                "id": str(pedido_activo["_id"]),
                "acumulado": True,
            }

        subtotal = sum(
            float(item.get("precio_unitario", 0) or 0) * int(item.get("cantidad", 1) or 1)
            for item in items_nuevos
        )
        pedido_dict["subtotal"] = subtotal
        pedido_dict["total"] = subtotal
        pedido_dict["estado_pedido"] = "Pendiente"

        await db.pedidos.update_many(
            {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
            {"$set": {"estado_pedido": "Archivado"}},
        )

        resultado = await db.pedidos.insert_one(pedido_dict)

        await db.mesas.update_one(
            {"$or": [{"num_mesa": pedido_dict["num_mesa"]}, {"num_mesa": str(pedido_dict["num_mesa"])}]},
            {"$set": {"estado": "Pendiente", "num_mesa": pedido_dict["num_mesa"]}},
            upsert=True,
        )

        return {"mensaje": "Pedido creado", "id": str(resultado.inserted_id), "acumulado": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/visitas", tags=["Visita"])
async def crear_visita(visita: VisitaCreate, db=Depends(get_db)):
    try:
        visita_dict = visita.model_dump()
        if not visita_dict.get("hora_inicio"):
            visita_dict["hora_inicio"] = datetime.now().isoformat()
        if visita_dict.get("solicitud_garzon") is None:
            visita_dict["solicitud_garzon"] = {"activa": False, "hora_solicitud": None, "motivo": None}

        resultado = await db.visitas.insert_one(visita_dict)
        visita_id_str = str(resultado.inserted_id)

        await db.mesas.update_one(
            {"$or": [{"num_mesa": visita.num_mesa}, {"num_mesa": str(visita.num_mesa)}]},
            {"$set": {"visita_activa_id": visita_id_str}},
        )

        return {"mensaje": "Visita creada", "id": visita_id_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 2. SELECT (MongoDB Atlas)
# ==============================================================================
@app.get("/productos/filtrados", tags=["2. SELECT (3)"])
async def select_productos_por_precio(precio_maximo: float = 10000, db=Depends(get_db)):
    """
    Obtiene los productos con precio menor al filtro desde la colección 'producto'.
    Garantiza que cada plato tenga su imagen correspondiente resuelta y sincronizada.
    """
    try:
        cursor = db.producto.find(
            {"precio": {"$lt": precio_maximo}},
            {"_id": 1, "id_plato": 1, "nombre": 1, "precio": 1, "disponibilidad": 1,
             "categoria": 1, "descripcion": 1, "tiempo_preparacion": 1, "imagen": 1,
             "etiquetas": 1},
        )
        docs = await cursor.to_list(length=200)
        docs_con_imagen = []
        for d in docs:
            img_res = resolver_imagen_producto(d)
            if not d.get("imagen") or d.get("imagen") != img_res:
                d["imagen"] = img_res
                try:
                    await db.producto.update_one({"_id": d["_id"]}, {"$set": {"imagen": img_res}})
                except Exception:
                    pass
            docs_con_imagen.append(serializar_doc(d))
        return docs_con_imagen
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/pedidos/mesa/{num_mesa}", tags=["2. SELECT (3)"])
async def select_pedido_mesa_cliente(num_mesa: int, db=Depends(get_db)):
    """Retorna únicamente el pedido activo de la mesa solicitada para la vista del comensal."""
    try:
        filtro_mesa = await build_mesa_pedidos_filter(num_mesa, db)
        pedido = await db.pedidos.find_one(
            {**filtro_mesa, "estado_pedido": {"$nin": ["Archivado", "Entregado"]}},
            sort=[("_id", -1)],
        )
        if not pedido:
            return None
        return serializar_doc(pedido)
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/pedidos/info-mesas", tags=["2. SELECT (3)"])
async def select_pedidos_info_mesas(
    _staff: Usuario = Depends(require_roles("Administrador", "Cocinero", "Garzón")),
    db=Depends(get_db),
):
    try:
        pipeline = [
            {
                "$lookup": {
                    "from": "visitas",
                    "let": {"vid": "$id_visita"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$ne": ["$$vid", None]},
                                        {"$eq": ["$id_visita", "$$vid"]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "visita_info",
                }
            },
            {
                "$addFields": {
                    "num_mesa": {
                        "$convert": {
                            "input": {
                                "$ifNull": [
                                    "$num_mesa",
                                    {"$arrayElemAt": ["$visita_info.num_mesa", 0]},
                                ]
                            },
                            "to": "int",
                            "onError": None,
                            "onNull": None,
                        }
                    }
                }
            },
            {"$match": {"num_mesa": {"$ne": None}, "estado_pedido": {"$ne": "Archivado"}}},
            {"$sort": {"_id": -1}},
            {
                "$group": {
                    "_id": "$num_mesa",
                    "doc_id": {"$first": "$_id"},
                    "id_pedido": {"$first": {"$ifNull": ["$id_pedido", "$_id"]}},
                    "estado_pedido": {"$first": "$estado_pedido"},
                    "hora_pedido": {"$first": "$hora_pedido"},
                    "items": {"$first": "$items"},
                    "subtotal": {"$first": "$subtotal"},
                    "total": {"$first": "$total"},
                    "notas": {"$first": "$notas"},
                    "solicitud_garzon": {"$first": {"$arrayElemAt": ["$visita_info.solicitud_garzon", 0]}},
                }
            },
            {
                "$project": {
                    "_id": "$doc_id",
                    "num_mesa": "$_id",
                    "id_pedido": 1,
                    "estado_pedido": 1,
                    "hora_pedido": 1,
                    "items": 1,
                    "subtotal": 1,
                    "total": 1,
                    "notas": 1,
                    "solicitud_garzon": 1,
                }
            },
        ]
        docs = await db.pedidos.aggregate(pipeline).to_list(length=200)
        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/pedidos/detalles-platos", tags=["2. SELECT (3)"])
async def select_detalles_platos(
    _staff: Usuario = Depends(require_roles("Administrador", "Cocinero", "Garzón")),
    db=Depends(get_db),
):
    try:
        cursor = db.pedidos.find({}, {"_id": 1, "num_mesa": 1, "items": 1})
        docs = await cursor.to_list(length=200)
        return [serializar_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 3. UPDATE (MongoDB Atlas)
# ==============================================================================
@app.put("/mesas/{num_mesa}/estado", tags=["3. UPDATE (2)"])
async def update_estado_mesa(
    num_mesa: int,
    update_data: MesaUpdateEstado,
    staff: Usuario = Depends(require_roles("Administrador", "Cocinero", "Garzón")),
    db=Depends(get_db),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    try:
        nuevo_estado = update_data.estado
        await db.mesas.update_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado": nuevo_estado, "num_mesa": num_mesa}},
            upsert=True,
        )

        filtro_mesa = await build_mesa_pedidos_filter(num_mesa, db)

        if nuevo_estado in ["Libre", "Entregado"]:
            await db.pedidos.update_many(
                {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
                {"$set": {"estado_pedido": "Entregado"}},
            )
        else:
            await db.pedidos.update_many(
                {**filtro_mesa, "estado_pedido": {"$nin": ["Entregado", "Archivado"]}},
                {"$set": {"estado_pedido": nuevo_estado}},
            )

        registrar_log(
            sqlite_db,
            staff,
            staff.rol,
            f"Mesa {num_mesa} -> {nuevo_estado}",
            f"Actualizado por {staff.nombre}",
        )
        return {"mensaje": f"Mesa {num_mesa} actualizada a '{nuevo_estado}'"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/mesas/{num_mesa}/liberar", tags=["3. UPDATE (2)"])
async def liberar_mesa(num_mesa: int, db=Depends(get_db)):
    try:
        await db.mesas.update_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado": "Libre", "num_mesa": num_mesa, "visita_activa_id": None}},
            upsert=True,
        )
        filtro_mesa = await build_mesa_pedidos_filter(num_mesa, db)
        await db.pedidos.update_many(
            filtro_mesa,
            {"$set": {"estado_pedido": "Entregado"}},
        )
        await db.visitas.update_many(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]},
            {"$set": {"estado_visita": "Finalizada", "solicitud_garzon.activa": False}},
        )
        return {"mensaje": f"Mesa {num_mesa} liberada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.put("/productos/{id_producto}/precio", tags=["3. UPDATE (2)"])
async def update_precio_producto(
    id_producto: str,
    update_data: ProductoUpdatePrecio,
    _staff: Usuario = Depends(require_roles("Cocinero", "Administrador")),
    db=Depends(get_db),
):
    try:
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.update_one(
            filtro,
            {"$set": {"precio": update_data.precio}},
        )
        if resultado.matched_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {"mensaje": f"Precio actualizado a {update_data.precio}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.patch("/productos/{id_producto}/disponible", tags=["3. UPDATE (2)"])
async def toggle_disponibilidad_producto(
    id_producto: str,
    data: ProductoDisponibilidad,
    staff: Usuario = Depends(require_roles("Cocinero", "Administrador")),
    db=Depends(get_db),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    try:
        disponibilidad_str = "En stock" if data.disponible else "Agotado"
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.update_one(
            filtro,
            {"$set": {"disponibilidad": disponibilidad_str}},
        )
        if resultado.matched_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        registrar_log(
            sqlite_db,
            staff,
            staff.rol,
            "Disponibilidad de plato actualizada",
            f"Plato {id_producto} -> {disponibilidad_str}",
        )
        return {
            "mensaje": f"Producto actualizado a '{disponibilidad_str}'",
            "disponible": data.disponible,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# VISITAS — Llamar garzón y validar QR
# ==============================================================================
@app.patch("/visitas/{visita_id}/llamar-garzon", tags=["Visita"])
async def llamar_garzon(visita_id: str, datos: LlamarGarzonInput, db=Depends(get_db)):
    try:
        solicitud_payload = {
            "activa": True,
            "hora_solicitud": datetime.utcnow().isoformat(),
            "motivo": datos.motivo,
        }

        try:
            filtro_id = {"_id": ObjectId(visita_id)}
        except Exception:
            filtro_id = {"_id": visita_id}

        resultado = await db.visitas.update_one(
            filtro_id,
            {"$set": {"solicitud_garzon": solicitud_payload}},
        )

        if resultado.matched_count == 0:
            try:
                num_m = int(visita_id)
                res_mesa = await db.visitas.update_one(
                    {"$or": [{"num_mesa": num_m}, {"num_mesa": str(num_m)}], "estado_visita": "Activa"},
                    {"$set": {"solicitud_garzon": solicitud_payload}},
                )
                if res_mesa.matched_count > 0:
                    return {"mensaje": "Garzón llamado exitosamente", "visita_id": visita_id}

                nueva_visita = {
                    "num_mesa": num_m,
                    "hora_inicio": datetime.utcnow().isoformat(),
                    "estado_visita": "Activa",
                    "solicitud_garzon": solicitud_payload,
                    "pagos": [],
                }
                nueva_res = await db.visitas.insert_one(nueva_visita)
                await db.mesas.update_one(
                    {"$or": [{"num_mesa": num_m}, {"num_mesa": str(num_m)}]},
                    {"$set": {"visita_activa_id": str(nueva_res.inserted_id)}},
                    upsert=True,
                )
                return {"mensaje": "Garzón llamado exitosamente", "visita_id": str(nueva_res.inserted_id)}
            except Exception:
                pass

            raise HTTPException(status_code=404, detail="Visita no encontrada")

        return {"mensaje": "Garzón llamado exitosamente", "visita_id": visita_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.patch("/visitas/{visita_id}/atender-garzon", tags=["Visita"])
async def atender_garzon(
    visita_id: str,
    staff: Usuario = Depends(require_roles("Garzón", "Administrador")),
    db=Depends(get_db),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    """Desactiva cualquier solicitud de garzón activa para la visita o mesa indicada."""
    try:
        ahora_iso = datetime.utcnow().isoformat()
        update_payload = {
            "$set": {
                "solicitud_garzon.activa": False,
                "solicitud_garzon.hora_atendida": ahora_iso,
            }
        }

        if ObjectId.is_valid(visita_id):
            filtro_id = {"_id": ObjectId(visita_id)}
            doc = await db.visitas.find_one(filtro_id, {"num_mesa": 1})
            await db.visitas.update_one(filtro_id, update_payload)
            if doc and doc.get("num_mesa") is not None:
                try:
                    num_m = int(doc["num_mesa"])
                    await db.visitas.update_many(
                        {"$or": [{"num_mesa": num_m}, {"num_mesa": str(num_m)}]},
                        update_payload,
                    )
                except Exception:
                    pass
        else:
            await db.visitas.update_many({"_id": visita_id}, update_payload)
            try:
                num_m = int(visita_id)
                await db.visitas.update_many(
                    {"$or": [{"num_mesa": num_m}, {"num_mesa": str(num_m)}]},
                    update_payload,
                )
            except Exception:
                pass

        registrar_log(
            sqlite_db,
            staff,
            staff.rol,
            "Llamado a garzón atendido",
            f"Mesa/Visita {visita_id} atendida por {staff.nombre}",
        )
        return {"mensaje": "Solicitud de garzón atendida exitosamente", "visita_id": visita_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/mesas/{num_mesa}/validar-qr", tags=["Mesa"])
async def validar_qr(num_mesa: int, token: str, db=Depends(get_db)):
    try:
        mesa = await db.mesas.find_one(
            {"$or": [{"num_mesa": num_mesa}, {"num_mesa": str(num_mesa)}]}
        )
        if not mesa:
            raise HTTPException(status_code=403, detail="QR inválido: mesa no encontrada")

        token_db = mesa.get("qr_token")
        if token_db is not None and token_db != token:
            raise HTTPException(status_code=403, detail="QR inválido: token no coincide")

        return {
            "mensaje": "QR válido",
            "num_mesa": num_mesa,
            "visita_activa_id": str(mesa.get("visita_activa_id")) if mesa.get("visita_activa_id") else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 4. DELETE (MongoDB Atlas)
# ==============================================================================
@app.delete("/productos/{id_producto}", tags=["4. DELETE (2)"])
async def delete_producto(
    id_producto: str,
    _staff: Usuario = Depends(require_roles("Cocinero", "Administrador")),
    db=Depends(get_db),
):
    try:
        filtro = build_producto_filter(id_producto)
        resultado = await db.producto.delete_one(filtro)
        if resultado.deleted_count == 0:
            raise HTTPException(status_code=404, detail="El producto no existe")
        return {"mensaje": "Producto eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/mesas/{num_mesa}", tags=["4. DELETE (2)"])
async def delete_mesa_condicionada(
    num_mesa: int,
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.mesas.delete_one({"num_mesa": num_mesa, "estado": "Libre"})
        if resultado.deleted_count == 0:
            raise HTTPException(status_code=400, detail="La mesa no existe o no está en estado 'Libre'")
        return {"mensaje": f"Mesa {num_mesa} eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# 5. ALTER / DROP (MongoDB Atlas — Solo Administrador)
# ==============================================================================
@app.post("/admin/alter-1", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_telefono_empleado(
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.empleados.update_many({}, {"$set": {"telefono": None}})
        return {"mensaje": "Atributo 'telefono' agregado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/alter-1/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_telefono(
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.empleados.update_many({}, {"$unset": {"telefono": ""}})
        return {"mensaje": "Atributo 'telefono' eliminado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/admin/alter-2", tags=["5. ALTER y DROP (3)"])
async def alter_agregar_fecha_entrega_pedido(
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.pedidos.update_many({}, {"$set": {"fecha_entrega": None}})
        return {"mensaje": "Atributo 'fecha_entrega' agregado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/alter-2/revertir", tags=["5. ALTER y DROP (3)"])
async def revertir_alter_fecha_entrega(
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        resultado = await db.pedidos.update_many({}, {"$unset": {"fecha_entrega": ""}})
        return {"mensaje": "Atributo 'fecha_entrega' eliminado", "modificados": resultado.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.post("/admin/preparar-temporada", tags=["5. ALTER y DROP (3)"])
async def preparar_coleccion_promociones(
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        count = await db.promocion_temporada.count_documents({})
        if count > 0:
            return {"mensaje": "La colección ya existe."}
        await db.promocion_temporada.insert_one({"nombre_promo": "SEMILLA", "descuento": 0.0})
        return {"mensaje": "Colección 'promocion_temporada' creada."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.delete("/admin/drop/promociones", tags=["5. ALTER y DROP (3)"])
async def drop_coleccion_promociones(
    _admin: Usuario = Depends(require_roles("Administrador")),
    db=Depends(get_db),
):
    try:
        await db.promocion_temporada.drop()
        return {"mensaje": "Coleccion 'promocion_temporada' eliminada con exito (DROP)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# REINICIO Y LIMPIEZA DE PRUEBAS (Cocinero / Administrador)
# ==============================================================================
@app.post("/sistema/reiniciar-pruebas", tags=["Pruebas"])
@app.post("/mesas/reiniciar-pruebas", tags=["Pruebas"])
async def reiniciar_sistema_pruebas(
    staff: Usuario = Depends(require_roles("Cocinero", "Administrador")),
    db=Depends(get_db),
    sqlite_db: Session = Depends(get_sqlite_db),
):
    try:
        await db.pedidos.update_many(
            {"estado_pedido": {"$nin": ["Archivado", "Entregado"]}},
            {"$set": {"estado_pedido": "Archivado"}},
        )

        mesas_count = await db.mesas.count_documents({})
        cant_mesas = max(2, mesas_count)
        for num in range(1, cant_mesas + 1):
            await db.mesas.update_one(
                {"$or": [{"num_mesa": num}, {"num_mesa": str(num)}]},
                {"$set": {"num_mesa": num, "estado": "Libre", "visita_activa_id": None}},
                upsert=True,
            )

        hora_test = datetime.now().strftime("%H:%M")
        pedido_mesa_2 = {
            "num_mesa": 2,
            "empleado_id": None,
            "estado_pedido": "Pendiente",
            "hora_pedido": hora_test,
            "notas": "Mesa de prueba: esperando a elaboración",
            "items": [
                {
                    "producto_id": "1",
                    "nombre": "Plato Principal Alpha",
                    "precio_unitario": 12500,
                    "cantidad": 1,
                    "observaciones": "Término medio",
                },
                {
                    "producto_id": "2",
                    "nombre": "Entrada Especial Beta",
                    "precio_unitario": 8000,
                    "cantidad": 1,
                    "observaciones": "Sin sal añadida",
                },
            ],
            "subtotal": 20500,
            "total": 20500,
            "fecha_creacion": datetime.now(),
        }
        res_pedido_2 = await db.pedidos.insert_one(pedido_mesa_2)

        await db.mesas.update_one(
            {"$or": [{"num_mesa": 2}, {"num_mesa": "2"}]},
            {"$set": {"num_mesa": 2, "estado": "Pendiente", "visita_activa_id": None}},
            upsert=True,
        )

        await db.mesas.update_one(
            {"$or": [{"num_mesa": 1}, {"num_mesa": "1"}]},
            {"$set": {"num_mesa": 1, "estado": "Libre", "visita_activa_id": None}},
            upsert=True,
        )

        prods = await db.producto.find({}).to_list(100)
        for p in prods:
            img_res = resolver_imagen_producto(p)
            if not p.get("imagen") or p.get("imagen") != img_res:
                await db.producto.update_one({"_id": p["_id"]}, {"$set": {"imagen": img_res}})

        registrar_log(sqlite_db, staff, staff.rol, "Reinicio de pruebas", "Mesa 1 libre / Mesa 2 en espera")
        return {
            "mensaje": "Estado de pruebas reiniciado con éxito",
            "mesa_1": "Libre (lista para tiempo real)",
            "mesa_2": "Esperando a elaboración (comanda activa)",
            "pedido_mesa_2_id": str(res_pedido_2.inserted_id),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


# ==============================================================================
# ARCHIVOS ESTÁTICOS / FRONTEND SPA (Producción en Railway / Docker)
# ==============================================================================
frontend_dist = os.environ.get("STATIC_FRONTEND_PATH", os.path.join(os.path.dirname(__file__), "frontend-dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if StaticFiles is not None and os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    frontend_dist_real = os.path.realpath(frontend_dist)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.realpath(os.path.join(frontend_dist_real, full_path))
        if (
            full_path
            and file_path.startswith(frontend_dist_real + os.sep)
            and os.path.exists(file_path)
            and os.path.isfile(file_path)
        ):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist_real, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Archivo frontend no encontrado")
