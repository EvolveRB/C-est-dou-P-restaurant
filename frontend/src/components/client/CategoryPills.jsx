import { useRef } from 'react';
import { CATEGORIES } from '../../data/initialProducts';
import { X } from 'lucide-react';

// Hook interno para scroll táctil fluido y arrastre por mouse en pantallas móviles y desktop
function useSwipeScroll() {
  const scrollRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Arrastre con mouse (PC / emulador táctil en navegador)
  const handleMouseDown = (e) => {
    isDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeftRef.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e) => {
    if (!isDownRef.current || !scrollRef.current) return;
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.25;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUp = () => {
    isDownRef.current = false;
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  };

  const handleMouseLeave = () => {
    isDownRef.current = false;
  };

  // Gestos táctiles nativos en teléfono celular
  const handleTouchStart = (e) => {
    hasMovedRef.current = false;
    if (e.touches && e.touches[0] && scrollRef.current) {
      startXRef.current = e.touches[0].pageX - scrollRef.current.offsetLeft;
      scrollLeftRef.current = scrollRef.current.scrollLeft;
    }
  };

  const handleTouchMove = (e) => {
    if (!scrollRef.current || !e.touches || !e.touches[0]) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 6) {
      hasMovedRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  };

  const handleClick = (callback, e) => {
    if (hasMovedRef.current) return; // Si el usuario estaba deslizando con el dedo, no acciona el clic
    callback();
    if (e?.currentTarget?.scrollIntoView) {
      e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  return {
    scrollRef,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    handleClick
  };
}

export default function CategoryPills({
  activeCategory = 'todos',
  onSelectCategory,
  activeTag = null,
  onSelectTag,
  availableTags = []
}) {
  const catSwipe = useSwipeScroll();
  const tagSwipe = useSwipeScroll();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {/* 1. Fila de Categorías Principales (Desplazable con el tactil en teléfono) */}
      <div
        ref={catSwipe.scrollRef}
        {...catSwipe.handlers}
        className="category-pills-row"
        role="tablist"
        aria-label="Categorías del menú"
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              className={`category-pill ${isActive ? 'active' : ''}`}
              onClick={(e) => catSwipe.handleClick(() => onSelectCategory(cat.id), e)}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 2. Fila de Filtros por Etiquetas de Productos (Sin emojis, texto limpio estandarizado) */}
      {availableTags && availableTags.length > 0 && (
        <div className="tag-filter-wrapper">
          <div
            ref={tagSwipe.scrollRef}
            {...tagSwipe.handlers}
            className="tag-filter-row"
            role="toolbar"
            aria-label="Filtro por etiquetas dietéticas"
          >
            {/* Pill 'Todas' */}
            <button
              type="button"
              className={`tag-filter-pill ${!activeTag ? 'active' : ''}`}
              onClick={(e) => tagSwipe.handleClick(() => onSelectTag && onSelectTag(null), e)}
              title="Ver todas las etiquetas"
            >
              <span>Todas</span>
            </button>

            {/* Chips dinámicos extraídos de los productos */}
            {availableTags.map((item) => {
              const isSelected = activeTag === item.tag;
              return (
                <button
                  key={item.tag}
                  type="button"
                  className={`tag-filter-pill ${isSelected ? 'active' : ''}`}
                  onClick={(e) =>
                    tagSwipe.handleClick(
                      () => onSelectTag && onSelectTag(isSelected ? null : item.tag),
                      e
                    )
                  }
                  title={`Filtrar por ${item.label || item.tag}`}
                >
                  <span>{item.label || item.tag}</span>
                  <span className="tag-pill-count">{item.count}</span>
                  {isSelected && <X size={11} strokeWidth={2.5} style={{ marginLeft: '2px' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
