import { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ChefHat,
  Utensils,
  Plus,
  Minus,
  Trash2,
  X,
  Phone,
  Mail,
  UserCheck,
  Layers,
  Sparkles
} from 'lucide-react';

export default function AdminDashboardPage() {
  const {
    tables,
    setTableCount,
    employees,
    addEmployee,
    updateEmployeeRole,
    deleteEmployee
  } = useRestaurant();

  // Estados de formulario para nuevo trabajador
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newCorreo, setNewCorreo] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newRol, setNewRol] = useState('Garzón');
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState('todos'); // 'todos', 'Cocinero', 'Garzón', 'Administrador'

  const totalOcupadas = tables.filter((t) => t.estado !== 'Libre').length;
  const totalLibres = tables.filter((t) => t.estado === 'Libre').length;

  const handleIncrement = () => {
    if (tables.length < 50) {
      setTableCount(tables.length + 1);
    }
  };

  const handleDecrement = () => {
    if (tables.length > 1) {
      setTableCount(tables.length - 1);
    }
  };

  const handleRoleChange = async (empId, newRole) => {
    await updateEmployeeRole(empId, newRole);
  };

  const handleDelete = async (empId, name) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${name} de la plantilla?`)) {
      await deleteEmployee(empId);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setFormError('El nombre del trabajador es obligatorio.');
      return;
    }
    setFormError('');
    await addEmployee({
      nombre: newNombre,
      apellido: newApellido,
      correo: newCorreo,
      telefono: newTelefono,
      rol: newRol
    });

    setNewNombre('');
    setNewApellido('');
    setNewCorreo('');
    setNewTelefono('');
    setNewRol('Garzón');
    setShowAddModal(false);
  };

  const filteredEmployees = employees.filter((e) => {
    if (activeTab === 'todos') return true;
    return (e.rol || e.cargo) === activeTab;
  });

  return (
    <div style={{
      flex: 1,
      minHeight: 'calc(100vh - 67px)',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 28px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        flex: 1,
        backgroundColor: '#FFF9F5',
        borderRadius: '24px',
        border: '1px solid #EEDBCE',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Encabezado sin botón de generador de QR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #F2E3D8',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#14171F', margin: 0 }}>
              Panel de Administrador
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5D8CC',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#4B5563'
            }}>
              <Users size={15} color="var(--c-burgundy-800)" />
              <span>{employees.length} Trabajadores</span>
            </span>

            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5D8CC',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#4B5563'
            }}>
              <Layers size={15} color="var(--c-terracotta)" />
              <span>{tables.length} Mesas Activas</span>
            </span>
          </div>
        </div>

        {/* ====================================================================
            SECCIÓN 1: MODIFICACIÓN DINÁMICA DE MESAS DEL SALÓN
            El cambio se refleja al instante tanto en Cocineros como en Garzones
           ==================================================================== */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #EADBCE',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="var(--c-terracotta)" />
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)', margin: 0 }}>
                  Capacidad de Mesas del Salón
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
                El número de mesas no es estático: modifícalo aquí y se sincronizará automáticamente para Cocineros y Garzones.
              </p>
            </div>

            {/* Controles para aumentar y disminuir mesas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FAF7F2',
                padding: '4px 10px',
                borderRadius: '14px',
                border: '1px solid #E5D8CC'
              }}>
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={tables.length <= 1}
                  title="Disminuir una mesa"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: tables.length <= 1 ? '#F1F5F9' : '#FFFFFF',
                    color: tables.length <= 1 ? '#94A3B8' : '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: tables.length <= 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>

                <div style={{
                  minWidth: '56px',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--c-burgundy-800)'
                }}>
                  {tables.length}
                </div>

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={tables.length >= 50}
                  title="Aumentar una mesa"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: tables.length >= 50 ? '#F1F5F9' : '#FFFFFF',
                    color: tables.length >= 50 ? '#94A3B8' : '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: tables.length >= 50 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Botones de ajuste rápido */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[8, 10, 12, 16].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTableCount(num)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: tables.length === num ? '1.5px solid var(--c-burgundy-800)' : '1px solid #E2E8F0',
                      backgroundColor: tables.length === num ? 'var(--c-burgundy-800)' : '#FFFFFF',
                      color: tables.length === num ? '#FFFFFF' : '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {num} mesas
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Estado actual de ocupación */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', paddingTop: '12px', borderTop: '1px solid #F3EAE1' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>
              ● {totalLibres} {totalLibres === 1 ? 'mesa libre' : 'mesas libres'}
            </span>
            <span style={{ color: '#B45309', fontWeight: 600 }}>
              ● {totalOcupadas} {totalOcupadas === 1 ? 'mesa con pedido' : 'mesas con pedido'}
            </span>
            <span style={{ color: '#6B7280' }}>
              (Total configurado en el restaurante: {tables.length} mesas)
            </span>
          </div>
        </div>

        {/* ====================================================================
            SECCIÓN 2: PLANTILLA DE TRABAJADORES ACTUALES
            Incluye a Marcela Soto (Cocinero), Ana Morales (Garzón), etc.
           ==================================================================== */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #EADBCE',
          padding: '24px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
          {/* Cabecera de la plantilla y botón para agregar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="var(--c-burgundy-800)" />
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-burgundy-800)', margin: 0 }}>
                  Plantilla de Trabajadores
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
                Supervisa al personal actual, gestiona y cambia sus roles (Cocinero, Garzón) o incorpora nuevo equipo.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                backgroundColor: 'var(--c-burgundy-800)',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(74, 21, 26, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <UserPlus size={16} />
              <span>+ Agregar Personal</span>
            </button>
          </div>

          {/* Filtros de rol */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'todos', label: `Todos (${employees.length})` },
              { id: 'Cocinero', label: `Cocineros (${employees.filter(e => (e.rol || e.cargo) === 'Cocinero').length})` },
              { id: 'Garzón', label: `Garzones (${employees.filter(e => (e.rol || e.cargo) === 'Garzón').length})` },
              { id: 'Administrador', label: `Administradores (${employees.filter(e => (e.rol || e.cargo) === 'Administrador').length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id)}
                style={{
                  backgroundColor: activeTab === f.id ? 'var(--c-terracotta-light)' : '#FFFFFF',
                  color: activeTab === f.id ? 'var(--c-burgundy-800)' : '#6B7280',
                  border: activeTab === f.id ? '1.5px solid var(--c-terracotta)' : '1px solid #E5D8CC',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista de trabajadores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px' }}>
            {filteredEmployees.map((emp) => {
              const empId = emp._id || emp.id;
              const nombreCompleto = `${emp.nombre || ''} ${emp.apellido || ''}`.trim();
              const rolActual = emp.rol || emp.cargo || 'Garzón';

              const isCocinero = rolActual === 'Cocinero';
              const isGarzon = rolActual === 'Garzón' || rolActual === 'Mesero';
              const isAdmin = rolActual === 'Administrador';

              return (
                <div
                  key={empId}
                  style={{
                    backgroundColor: '#FFFBF8',
                    border: '1px solid #EEDBCE',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div>
                    {/* Fila superior: avatar, nombre y botón de eliminar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: isCocinero ? '#FEF3C7' : isGarzon ? '#F3E8FF' : '#FEE2E2',
                          color: isCocinero ? '#B45309' : isGarzon ? '#7E22CE' : '#991B1B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isCocinero && <ChefHat size={22} />}
                          {isGarzon && <Utensils size={22} />}
                          {isAdmin && <ShieldCheck size={22} />}
                        </div>

                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1F242E', margin: 0 }}>
                            {nombreCompleto || 'Trabajador'}
                          </h3>
                          <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                            @{emp.username || 'personal'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(empId, nombreCompleto)}
                        title="Eliminar de la plantilla"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Datos de contacto */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4B5563', margin: '8px 0 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} color="#9CA3AF" />
                        <span>{emp.correo || `${emp.username || 'emp'}@restaurant.cl`}</span>
                      </div>
                      {emp.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} color="#9CA3AF" />
                          <span>{emp.telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selector y administración de rol en tiempo real */}
                  <div style={{
                    paddingTop: '10px',
                    borderTop: '1px solid #F2E3D8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#6B7280' }}>
                      Rol actual:
                    </label>

                    <select
                      value={rolActual}
                      onChange={(e) => handleRoleChange(empId, e.target.value)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: isCocinero ? '#FEF3C7' : isGarzon ? '#F3E8FF' : '#FEE2E2',
                        color: isCocinero ? '#B45309' : isGarzon ? '#7E22CE' : '#991B1B',
                        border: '1px solid #CBD5E1',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Cocinero">👨‍🍳 Cocinero</option>
                      <option value="Garzón">🍽️ Garzón</option>
                      <option value="Administrador">🛡️ Administrador</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====================================================================
          MODAL: AGREGAR NUEVO TRABAJADOR
         ==================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--c-burgundy-800)" />
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--c-burgundy-800)', margin: 0 }}>
                  Nuevo Personal
                </h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {formError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Nombre: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Marcela / Ana / Ignacio"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Apellido:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Soto / Morales"
                  value={newApellido}
                  onChange={(e) => setNewApellido(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Rol de Trabajo: *
                </label>
                <select
                  value={newRol}
                  onChange={(e) => setNewRol(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700, backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="Garzón">🍽️ Garzón (Atención de mesas)</option>
                  <option value="Cocinero">👨‍🍳 Cocinero (Carta de elaboración)</option>
                  <option value="Administrador">🛡️ Administrador (Gestión total)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Correo Electrónico (opcional):
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@restaurant.cl"
                  value={newCorreo}
                  onChange={(e) => setNewCorreo(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Teléfono (opcional):
                </label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
                >
                  Guardar Trabajador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
