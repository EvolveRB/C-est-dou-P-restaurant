import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react' // Importamos el generador de QR

// ==========================================
// 1. LA VISTA DEL CLIENTE (La que ya hicimos)
// ==========================================
function VistaCliente() {
  const { numeroMesa } = useParams()
  const [carrito, setCarrito] = useState(() => {
    const carritoGuardado = localStorage.getItem('carrito_cest_dou_p')
    return carritoGuardado ? JSON.parse(carritoGuardado) : []
  })

  useEffect(() => {
    if (numeroMesa) localStorage.setItem('mesa_activa', numeroMesa)
  }, [numeroMesa])

  useEffect(() => {
    localStorage.setItem('carrito_cest_dou_p', JSON.stringify(carrito))
  }, [carrito])

  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto])
  }

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif" }}>
      <h2>📍 Estás en la Mesa {numeroMesa}</h2>
      <button onClick={() => agregarAlCarrito({ id: 1, nombre: "Hamburguesa Doble", precio: 8500 })}>
        + Agregar Hamburguesa
      </button>
      <div style={{ border: "1px solid #ccc", padding: "15px", marginTop: "20px" }}>
        <h3>🛒 Tu Carrito ({carrito.length} ítems)</h3>
        <ul>
          {carrito.map((item, index) => (
            <li key={index}>{item.nombre} - ${item.precio}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ==========================================
// 2. LA VISTA DEL ADMINISTRADOR (¡NUEVO!)
// ==========================================
function VistaAdminQR() {
  const totalMesas = 10; // Cambia este número según las mesas de tu local
  const mesas = Array.from({ length: totalMesas }, (_, i) => i + 1);
  
  // Obtenemos la URL base (ej: http://192.168.1.5:5173 o http://tu-dominio.com)
  const baseUrl = window.location.origin;

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif" }}>
      <h2>🖨️ Panel de Códigos QR para Mesas</h2>
      <p>Imprime esta pantalla y recorta los códigos para cada mesa.</p>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: "30px", marginTop: "20px" }}>
        {mesas.map(mesa => {
          const urlMesa = `${baseUrl}/mesa/${mesa}`;
          return (
            <div key={mesa} style={{ border: "2px dashed #000", padding: "20px", textAlign: "center", width: "150px" }}>
              <h2>Mesa {mesa}</h2>
              {/* Aquí se genera el QR apuntando a la URL exacta de esa mesa */}
              <QRCodeSVG value={urlMesa} size={130} />
              <p style={{ fontSize: "10px", wordWrap: "break-word" }}>{urlMesa}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==========================================
// 3. ENRUTADOR PRINCIPAL
// ==========================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/mesa/:numeroMesa" element={<VistaCliente />} />
        
        {/* Nueva ruta exclusiva para generar e imprimir los QR */}
        <Route path="/admin/qrs" element={<VistaAdminQR />} />
        
        <Route path="/" element={
          <div style={{padding:"20px"}}>
            <h2>Bienvenido a C'est dou P</h2>
            <p>Escanea el QR de tu mesa o ve al <Link to="/admin/qrs">Panel de QRs</Link>.</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App