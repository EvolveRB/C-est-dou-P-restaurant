import { CATEGORIES } from '../../data/initialProducts';

export default function CategoryPills({ activeCategory, onSelectCategory }) {
  return (
    <div className="category-pills-row" role="tablist" aria-label="Categorías del menú">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            className={`category-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
