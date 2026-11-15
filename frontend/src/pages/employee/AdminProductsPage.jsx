import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  FolderKanban,
  Utensils,
  X,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { DEFAULT_CATEGORIES, formatPrice } from '../../data/initialProducts';
import RoleLogsPanel from '../../components/employee/RoleLogsPanel';

const EMPTY_FORM = {
  nombre: '',
  categoria: 'Platos de Fondo',
  precio: '',
  tiempo_preparacion: 15,
  imagen: '',
  descripcion: '',
  disponibilidad: true,
  destacado: false,
  etiquetas: [],
};

export default function AdminProductsPage() {
  const {
    products,
    catalogFilters,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductAvailability,
    createCategory,
    renameCategory,
    deleteCategory,
    createTag,
    renameTag,
    deleteTag,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState('platos'); // 'platos' | 'filtros'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [availabilityFilter, setAvailabilityFilter] = useState('todos'); // 'todos' | 'disponibles' | 'ocultos'
  const [bannerMsg, setBannerMsg] = useState(null);

  // Modal de Plato (Crear / Editar)
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_FORM);
  const [customTagInput, setCustomTagInput] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Gestión de Categorías y Etiquetas
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [reassignTarget, setReassignTarget] = useState('Platos de Fondo');

  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  const categoryList = useMemo(() => {
    const serverCats = Array.isArray(catalogFilters?.categorias) ? catalogFilters.categorias : [];
    if (serverCats.length > 0) return serverCats;
    return DEFAULT_CATEGORIES.map((nombre) => ({ nombre, count: 0 }));
  }, [catalogFilters]);

  const tagList = useMemo(() => {
    return Array.isArray(catalogFilters?.etiquetas) ? catalogFilters.etiquetas : [];
  }, [catalogFilters]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((prod) => {
      if (categoryFilter !== 'Todas' && (prod.categoriaNombre || prod.categoria) !== categoryFilter) {
        return false;
      }
      if (availabilityFilter === 'disponibles' && !prod.disponibilidad) return false;
      if (availabilityFilter === 'ocultos' && prod.disponibilidad) return false;
      if (!q) return true;
      const tagsText = (prod.etiquetas || []).join(' ').toLowerCase();
      return (
        (prod.nombre || '').toLowerCase().includes(q) ||
        (prod.descripcion || '').toLowerCase().includes(q) ||
        (prod.categoriaNombre || '').toLowerCase().includes(q) ||
        tagsText.includes(q)
      );
    });
  }, [products, categoryFilter, availabilityFilter, searchTerm]);

  const notify = (type, text) => setBannerMsg({ type, text });

  const openCreateModal = () => {
    setEditingProductId(null);
    setProductForm({
      ...EMPTY_FORM,
      categoria: categoryList[0]?.nombre || 'Platos de Fondo',
    });
    setCustomTagInput('');
    setShowProductModal(true);
  };

  const openEditModal = (prod) => {
    setEditingProductId(prod.id);
    setProductForm({
      nombre: prod.nombre || '',
      categoria: prod.categoriaNombre || prod.categoria || 'Platos de Fondo',
      precio: String(prod.precio ?? ''),
      tiempo_preparacion: prod.tiempo ?? prod.tiempo_preparacion ?? 15,
      imagen: prod.imagenRaw || prod.imagen || '',
      descripcion: prod.descripcion || '',
      disponibilidad: prod.disponibilidad !== false,
      destacado: Boolean(prod.destacado),
      etiquetas: Array.isArray(prod.etiquetas) ? [...prod.etiquetas] : [],
    });
    setCustomTagInput('');
    setShowProductModal(true);
  };

  const toggleFormTag = (tagName) => {
    setProductForm((prev) => {
      const exists = prev.etiquetas.includes(tagName);
      return {
        ...prev,
        etiquetas: exists
          ? prev.etiquetas.filter((t) => t !== tagName)
          : [...prev.etiquetas, tagName],
      };
    });
  };

  const handleAddCustomTagToForm = () => {
    const clean = customTagInput.trim();
    if (!clean) return;
    if (!productForm.etiquetas.includes(clean)) {
      setProductForm((prev) => ({ ...prev, etiquetas: [...prev.etiquetas, clean] }));
    }
    setCustomTagInput('');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const numericPrice = Number(productForm.precio);
    if (!productForm.nombre.trim()) {
      notify('error', 'El nombre del plato es obligatorio.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      notify('error', 'Ingresa un precio válido mayor a 0.');
      return;
    }

    setSavingProduct(true);
    const payload = {
      nombre: productForm.nombre.trim(),
      categoria: productForm.categoria.trim() || 'Platos de Fondo',
      precio: numericPrice,
      tiempo_preparacion: Number(productForm.tiempo_preparacion) || 15,
      imagen: productForm.imagen.trim() || null,
      descripcion: productForm.descripcion.trim() || '',
      disponibilidad: Boolean(productForm.disponibilidad),
      destacado: Boolean(productForm.destacado),
      etiquetas: productForm.etiquetas,
    };

    const res = editingProductId
      ? await updateProduct(editingProductId, payload)
      : await createProduct(payload);

    setSavingProduct(false);
    if (res.success) {
      setShowProductModal(false);
      notify('ok', editingProductId ? 'Plato actualizado correctamente en MongoDB.' : 'Nuevo plato agregado a la carta.');
    } else {
      notify('error', res.error || 'No se pudo guardar el plato.');
    }
  };

  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`¿Eliminar "${prod.nombre}" de la base de datos?`)) return;
    const res = await deleteProduct(prod.id);
    if (res.success) {
      notify('ok', `"${prod.nombre}" fue eliminado de la carta.`);
    } else {
      notify('error', res.error || 'Error al eliminar el plato.');
    }
  };

  // Handlers de Categorías
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    const res = await createCategory(clean);
    if (res.success) {
      setNewCategoryName('');
      notify('ok', `Categoría "${clean}" creada.`);
    } else {
      notify('error', res.error);
    }
  };

  const handleRenameCategory = async (oldName) => {
    const clean = editingCatValue.trim();
    if (!clean || clean === oldName) {
      setEditingCat(null);
      return;
    }
    const res = await renameCategory(oldName, clean);
    setEditingCat(null);
    if (res.success) {
      notify('ok', `Categoría "${oldName}" renombrada a "${clean}" en todos los platos.`);
    } else {
      notify('error', res.error);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const target = reassignTarget === cat.nombre ? 'Platos de Fondo' : reassignTarget;
    if (!window.confirm(`¿Eliminar la categoría "${cat.nombre}"? Sus platos se reasignarán a "${target}".`)) return;
    const res = await deleteCategory(cat.nombre, target);
    if (res.success) {
      notify('ok', `Categoría "${cat.nombre}" eliminada.`);
    } else {
      notify('error', res.error);
    }
  };

  // Handlers de Etiquetas
  const handleCreateTag = async (e) => {
    e.preventDefault();
    const clean = newTagName.trim();
    if (!clean) return;
    const res = await createTag(clean);
    if (res.success) {
      setNewTagName('');
      notify('ok', `Etiqueta "${clean}" creada.`);
    } else {
      notify('error', res.error);
    }
  };

  const handleRenameTag = async (oldName) => {
    const clean = editingTagValue.trim();
    if (!clean || clean === oldName) {
      setEditingTag(null);
      return;
    }
    const res = await renameTag(oldName, clean);
    setEditingTag(null);
    if (res.success) {
      notify('ok', `Etiqueta "${oldName}" renombrada a "${clean}".`);
    } else {
      notify('error', res.error);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`¿Eliminar la etiqueta "${tag.nombre}" de todos los platos?`)) return;
    const res = await deleteTag(tag.nombre);
    if (res.success) {
      notify('ok', `Etiqueta "${tag.nombre}" eliminada.`);
    } else {
      notify('error', res.error);
    }
  };

  return (
    <div style={{ maxWidth: '1260px', margin: '0 auto', padding: '20px 18px 40px' }}>
      {/* Cabecera */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px',
      }}>
        <div>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--c-terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Administración de Catálogo • MongoDB & Azure Blob Storage
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#14171F', margin: '2px 0 4px' }}>
            Carta, Filtros y Etiquetas
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
            Administra los platos que entran a la base de datos, sus URLs de imagen externas y sus categorías o etiquetas.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 700,
          }}
        >
          <Plus size={16} />
          <span>Nuevo Plato</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('platos')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 16px',
            borderRadius: '12px',
            border: activeTab === 'platos' ? '1.5px solid var(--c-burgundy-800)' : '1px solid #EADBCE',
            background: activeTab === 'platos' ? 'var(--c-burgundy-800)' : '#FFFFFF',
            color: activeTab === 'platos' ? '#FFFFFF' : '#475569',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Utensils size={15} />
          <span>Platos de la Carta ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('filtros')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 16px',
            borderRadius: '12px',
            border: activeTab === 'filtros' ? '1.5px solid var(--c-burgundy-800)' : '1px solid #EADBCE',
            background: activeTab === 'filtros' ? 'var(--c-burgundy-800)' : '#FFFFFF',
            color: activeTab === 'filtros' ? '#FFFFFF' : '#475569',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <FolderKanban size={15} />
          <span>Filtros y Etiquetas ({categoryList.length} cat. / {tagList.length} etiq.)</span>
        </button>
      </div>

      {bannerMsg && (
        <div style={{
          marginBottom: '16px',
          padding: '11px 14px',
          borderRadius: '12px',
          border: `1px solid ${bannerMsg.type === 'ok' ? '#86EFAC' : '#FCA5A5'}`,
          background: bannerMsg.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          color: bannerMsg.type === 'ok' ? '#166534' : '#991B1B',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{bannerMsg.text}</span>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* TAB 1: PLATOS */}
      {activeTab === 'platos' && (
        <section style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid #EADBCE', padding: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '11px' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, descripción o etiqueta..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}
            >
              <option value="Todas">Todas las categorías</option>
              {categoryList.map((c) => (
                <option key={c.nombre} value={c.nombre}>{c.nombre} ({c.count})</option>
              ))}
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}
            >
              <option value="todos">Todos los estados</option>
              <option value="disponibles">Solo disponibles</option>
              <option value="ocultos">Solo ocultos</option>
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B', fontSize: '13.5px' }}>
              No se encontraron platos con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  style={{
                    border: '1px solid #EFE7DF',
                    borderRadius: '14px',
                    padding: '14px',
                    background: prod.disponibilidad ? '#FFFFFF' : '#F8FAFC',
                    opacity: prod.disponibilidad ? 1 : 0.78,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '12px',
                        background: '#F5EFEA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {prod.imagen ? (
                          <img
                            src={prod.imagen}
                            alt={prod.nombre}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon size={20} color="#94A3B8" />
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--c-terracotta)', textTransform: 'uppercase' }}>
                          {prod.categoriaNombre || prod.categoria}
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#14171F', margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prod.nombre}
                        </h3>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--c-burgundy-800)' }}>
                          {formatPrice(prod.precio)} <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>• {prod.tiempo} min</span>
                        </div>
                      </div>
                    </div>

                    {prod.descripcion && (
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 8px', lineHeight: 1.4 }}>
                        {prod.descripcion}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {prod.destacado && (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: '#FEF3C7', color: '#B45309' }}>
                          Destacado
                        </span>
                      )}
                      {(prod.etiquetas || []).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: '#F3ECE6',
                            color: 'var(--c-burgundy-800)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1EAE4', paddingTop: '10px', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => toggleProductAvailability(prod.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '9px',
                        border: '1px solid #E2E8F0',
                        background: prod.disponibilidad ? '#ECFDF5' : '#FEF2F2',
                        color: prod.disponibilidad ? '#15803D' : '#B91C1C',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {prod.disponibilidad ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{prod.disponibilidad ? 'Visible' : 'Oculto'}</span>
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(prod)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '9px',
                          border: '1px solid #EADBCE',
                          background: '#FAF5F0',
                          color: 'var(--c-burgundy-800)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Pencil size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod)}
                        style={{
                          padding: '6px 9px',
                          borderRadius: '9px',
                          border: '1px solid #FECACA',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          cursor: 'pointer',
                        }}
                        aria-label={`Eliminar ${prod.nombre}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CATEGORÍAS (FILTROS) Y ETIQUETAS */}
      {activeTab === 'filtros' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          {/* Categorías */}
          <section style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid #EADBCE', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <FolderKanban size={18} color="var(--c-burgundy-800)" />
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#14171F', margin: 0 }}>
                Categorías (Filtros del Menú)
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 14px' }}>
              Renombrar o eliminar una categoría actualiza automáticamente los platos asociados en MongoDB.
            </p>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva categoría (ej: Desayunos)"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
                Agregar
              </button>
            </form>

            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Al eliminar, reasignar platos a:</span>
              <select
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
              >
                {categoryList.map((c) => (
                  <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryList.map((cat) => (
                <div
                  key={cat.nombre}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #F1EAE4',
                    background: '#FCFBF9',
                  }}
                >
                  {editingCat === cat.nombre ? (
                    <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                      <input
                        type="text"
                        value={editingCatValue}
                        onChange={(e) => setEditingCatValue(e.target.value)}
                        style={{ flex: 1, padding: '5px 9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameCategory(cat.nombre)}
                        style={{ padding: '5px 9px', borderRadius: '8px', border: 'none', background: '#16A34A', color: '#FFFFFF', cursor: 'pointer' }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCat(null)}
                        style={{ padding: '5px 9px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#14171F' }}>{cat.nombre}</span>
                        <span style={{ marginLeft: '8px', fontSize: '11.5px', color: '#64748B' }}>({cat.count} platos)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { setEditingCat(cat.nombre); setEditingCatValue(cat.nombre); }}
                          style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}
                          aria-label={`Renombrar ${cat.nombre}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                          aria-label={`Eliminar ${cat.nombre}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Etiquetas */}
          <section style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid #EADBCE', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Tag size={18} color="var(--c-terracotta)" />
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#14171F', margin: 0 }}>
                Etiquetas de Platos
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 14px' }}>
              Crea o edita etiquetas (ej: Vegetariano, Sin Gluten, Picante, Rápido) y sincronízalas con toda la carta.
            </p>

            <form onSubmit={handleCreateTag} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nueva etiqueta (ej: Vegano)"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
                Agregar
              </button>
            </form>

            {tagList.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748B' }}>Aún no hay etiquetas registradas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tagList.map((tag) => (
                  <div
                    key={tag.nombre}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #F1EAE4',
                      background: '#FCFBF9',
                    }}
                  >
                    {editingTag === tag.nombre ? (
                      <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                        <input
                          type="text"
                          value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          style={{ flex: 1, padding: '5px 9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameTag(tag.nombre)}
                          style={{ padding: '5px 9px', borderRadius: '8px', border: 'none', background: '#16A34A', color: '#FFFFFF', cursor: 'pointer' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTag(null)}
                          style={{ padding: '5px 9px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--c-burgundy-800)' }}>#{tag.nombre}</span>
                          <span style={{ marginLeft: '8px', fontSize: '11.5px', color: '#64748B' }}>({tag.count} platos)</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => { setEditingTag(tag.nombre); setEditingTagValue(tag.nombre); }}
                            style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}
                            aria-label={`Renombrar etiqueta ${tag.nombre}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag)}
                            style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                            aria-label={`Eliminar etiqueta ${tag.nombre}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <RoleLogsPanel roleLabel="Administrador — Productos y Filtros" />

      {/* Modal Crear / Editar Plato */}
      {showProductModal && (
        <div
          className="modal-overlay"
          onClick={() => !savingProduct && setShowProductModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '22px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--c-burgundy-800)', margin: 0 }}>
                {editingProductId ? 'Editar Plato de la Carta' : 'Agregar Nuevo Plato'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Nombre del plato *</label>
                <input
                  type="text"
                  required
                  value={productForm.nombre}
                  onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Categoría *</label>
                  <select
                    value={productForm.categoria}
                    onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', background: '#FFFFFF' }}
                  >
                    {Array.from(new Set([...categoryList.map((c) => c.nombre), productForm.categoria])).filter(Boolean).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Precio (CLP) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={productForm.precio}
                    onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Tiempo prep. (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.tiempo_preparacion}
                    onChange={(e) => setProductForm({ ...productForm, tiempo_preparacion: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Imagen (URL Azure Blob o archivo)</label>
                  <input
                    type="text"
                    value={productForm.imagen}
                    onChange={(e) => setProductForm({ ...productForm, imagen: e.target.value })}
                    placeholder="https://...blob.core.windows.net/menu/plato.jpg"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Descripción</label>
                <textarea
                  rows={2}
                  value={productForm.descripcion}
                  onChange={(e) => setProductForm({ ...productForm, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', resize: 'vertical' }}
                />
              </div>

              {/* Etiquetas multi-select */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Etiquetas del plato</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {Array.from(new Set([...tagList.map((t) => t.nombre), ...productForm.etiquetas])).map((tagName) => {
                    const selected = productForm.etiquetas.includes(tagName);
                    return (
                      <button
                        key={tagName}
                        type="button"
                        onClick={() => toggleFormTag(tagName)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          border: selected ? '1.5px solid var(--c-burgundy-800)' : '1px solid #CBD5E1',
                          background: selected ? 'var(--c-burgundy-800)' : '#FFFFFF',
                          color: selected ? '#FFFFFF' : '#475569',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        #{tagName}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTagToForm();
                      }
                    }}
                    placeholder="Agregar otra etiqueta..."
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTagToForm}
                    style={{ padding: '7px 12px', borderRadius: '9px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Etiqueta
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '18px', paddingTop: '4px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.disponibilidad}
                    onChange={(e) => setProductForm({ ...productForm, disponibilidad: e.target.checked })}
                  />
                  Disponible en carta
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.destacado}
                    onChange={(e) => setProductForm({ ...productForm, destacado: e.target.checked })}
                  />
                  Destacado
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '11px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="btn-primary"
                  style={{ padding: '10px 18px', borderRadius: '11px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  {savingProduct ? 'Guardando...' : editingProductId ? 'Guardar Cambios' : 'Crear Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
