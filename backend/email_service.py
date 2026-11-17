import asyncio
import html
import json
import os
import smtplib
import urllib.request
from email.message import EmailMessage
from typing import Any, Dict


def format_clp(amount: Any) -> str:
    try:
        value = int(round(float(amount or 0)))
    except Exception:
        value = 0
    return "$" + f"{value:,}".replace(",", ".")


def build_receipt_text(receipt: Dict[str, Any]) -> str:
    lines = [
        "C'est doux P — Comprobante Electrónico de Pago",
        f"Código: {receipt.get('comprobante_codigo', '')}",
        f"Local: {receipt.get('sucursal', 'Local 1 - Casa Matriz')}",
        f"Mesa: {receipt.get('num_mesa', '')}",
        f"Fecha: {receipt.get('fecha_legible', receipt.get('fecha_pago', ''))}",
        f"Método de pago: {receipt.get('metodo_pago_label', receipt.get('metodo_pago', ''))}",
        "",
        "Detalle del consumo:",
    ]
    for it in receipt.get("items") or []:
        qty = int(it.get("cantidad", 1) or 1)
        name = it.get("nombre", "Platillo")
        unit = float(it.get("precio_unitario", 0) or 0)
        lines.append(f"  - {qty}x {name} ({format_clp(unit * qty)})")
    lines.extend([
        "",
        f"Subtotal: {format_clp(receipt.get('subtotal', 0))}",
        f"Propina ({receipt.get('propina_porcentaje', 0)}%): {format_clp(receipt.get('propina_monto', 0))}",
        f"TOTAL PAGADO: {format_clp(receipt.get('total_pagado', 0))}",
        "",
        "¡Gracias por tu visita en C'est doux P!",
    ])
    return "\n".join(lines)


def build_receipt_html(receipt: Dict[str, Any]) -> str:
    rows_html = []
    for it in receipt.get("items") or []:
        qty = int(it.get("cantidad", 1) or 1)
        name = html.escape(str(it.get("nombre", "Platillo")))
        unit = float(it.get("precio_unitario", 0) or 0)
        rows_html.append(
            f"""
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #F2E3D8;color:#1F242E;font-size:14px;">
                <strong>{qty}x</strong> {name}
              </td>
              <td style="padding:8px 0;border-bottom:1px solid #F2E3D8;color:#1F242E;font-size:14px;text-align:right;font-weight:700;">
                {format_clp(unit * qty)}
              </td>
            </tr>
            """
        )

    items_block = "".join(rows_html) or (
        '<tr><td colspan="2" style="padding:8px 0;color:#6B7280;">Consumo en mesa</td></tr>'
    )

    codigo = html.escape(str(receipt.get("comprobante_codigo", "")))
    sucursal = html.escape(str(receipt.get("sucursal", "Local 1 - Casa Matriz")))
    mesa = html.escape(str(receipt.get("num_mesa", "")))
    fecha = html.escape(str(receipt.get("fecha_legible", receipt.get("fecha_pago", ""))))
    metodo = html.escape(str(receipt.get("metodo_pago_label", receipt.get("metodo_pago", ""))))
    propina_pct = int(receipt.get("propina_porcentaje", 0) or 0)

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Comprobante {codigo}</title></head>
<body style="margin:0;padding:24px;background-color:#FCF8F5;font-family:'Segoe UI',Arial,sans-serif;color:#3D1A1E;">
  <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:20px;border:1px solid #EEDCD4;overflow:hidden;">
    <div style="background:#5C1D24;color:#FFFFFF;padding:24px 28px;">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#FCD9BD;font-weight:700;">
        Comprobante Electrónico
      </div>
      <h1 style="margin:6px 0 0;font-size:24px;font-weight:800;">C&apos;est doux P</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#F6ECE7;">{sucursal} &bull; Mesa {mesa}</p>
    </div>

    <div style="padding:24px 28px;">
      <div style="background:#FAF5F0;border:1px solid #EEDCD4;border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
        <div><strong>Código:</strong> {codigo}</div>
        <div style="margin-top:4px;"><strong>Fecha:</strong> {fecha}</div>
        <div style="margin-top:4px;"><strong>Medio de pago:</strong> {metodo}</div>
      </div>

      <h3 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#5C1D24;">
        Detalle de la cuenta
      </h3>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>{items_block}</tbody>
      </table>

      <div style="margin-top:18px;padding-top:14px;border-top:2px solid #F2E3D8;font-size:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#6B7280;">
          <span>Subtotal</span>
          <span>{format_clp(receipt.get('subtotal', 0))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;color:#6B7280;">
          <span>Propina ({propina_pct}%)</span>
          <span>{format_clp(receipt.get('propina_monto', 0))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#5C1D24;">
          <span>Total Pagado</span>
          <span>{format_clp(receipt.get('total_pagado', 0))}</span>
        </div>
      </div>

      <p style="margin:24px 0 0;font-size:12.5px;color:#8E5F64;text-align:center;">
        Gracias por tu preferencia en C&apos;est doux P. Este correo corresponde a tu comprobante digital de consumo.
      </p>
    </div>
  </div>
</body>
</html>"""


def _send_smtp_sync(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    smtp_host = (os.getenv("SMTP_HOST") or "").strip()
    smtp_port = int((os.getenv("SMTP_PORT") or "587").strip())
    smtp_user = (os.getenv("SMTP_USER") or "").strip()
    smtp_password = (os.getenv("SMTP_PASSWORD") or "").strip()
    smtp_from = (os.getenv("SMTP_FROM") or smtp_user or "no-reply@cestdouxp.cl").strip()
    use_tls = (os.getenv("SMTP_USE_TLS") or "true").strip().lower() not in ("0", "false", "no")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)


def _send_resend_sync(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    sender = (os.getenv("RESEND_FROM") or os.getenv("SMTP_FROM") or "C'est doux P <onboarding@resend.dev>").strip()
    payload = json.dumps({
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "text": text_body,
        "html": html_body,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CestDouxP/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"Resend HTTP {resp.status}")


async def send_receipt_email(to_email: str, receipt: Dict[str, Any]) -> Dict[str, Any]:
    """
    Envía el comprobante electrónico al correo del cliente vía Resend API (HTTPS) o SMTP.
    Si no hay credenciales configuradas en .env, registra el comprobante sin bloquear el pago.
    """
    codigo = receipt.get("comprobante_codigo", "Comprobante")
    subject = f"Tu comprobante C'est doux P ({codigo})"
    text_body = build_receipt_text(receipt)
    html_body = build_receipt_html(receipt)

    resend_key = (os.getenv("RESEND_API_KEY") or "").strip()
    if resend_key:
        try:
            await asyncio.to_thread(_send_resend_sync, to_email, subject, text_body, html_body)
            return {
                "sent": True,
                "status": "enviado",
                "detail": f"Comprobante enviado correctamente a {to_email}",
            }
        except Exception as exc:
            return {
                "sent": False,
                "status": "error_email",
                "detail": f"No se pudo enviar por Resend: {exc}",
            }

    smtp_host = (os.getenv("SMTP_HOST") or "").strip()
    smtp_user = (os.getenv("SMTP_USER") or "").strip()
    smtp_password = (os.getenv("SMTP_PASSWORD") or "").strip()

    if not smtp_host or not smtp_user or not smtp_password:
        return {
            "sent": False,
            "status": "registrado_sin_smtp",
            "detail": "Comprobante registrado en base de datos. Falta configurar un servicio de correo (RESEND_API_KEY o SMTP_*).",
        }

    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, text_body, html_body)
        return {
            "sent": True,
            "status": "enviado",
            "detail": f"Comprobante enviado correctamente a {to_email}",
        }
    except Exception as exc:
        return {
            "sent": False,
            "status": "error_smtp",
            "detail": f"No se pudo enviar por SMTP: {exc}",
        }
