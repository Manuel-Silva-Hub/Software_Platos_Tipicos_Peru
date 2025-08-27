// src/views/components/Filters.tsx
import { useState, useEffect } from 'react';

type Props = {
  regions: string[]; // regions coming from Home (can be empty)
  value?: string; // selected region (controlled by Home)
  onSearch: (q: string) => void;
  onRegionChange: (region: string) => void;
  onSortChange: (sortKey: string) => void;
  showOnlyFavorites: boolean;
  onToggleFavorites: (v: boolean) => void;
};

export function Filters({
  regions,
  value = '',
  onSearch,
  onRegionChange,
  onSortChange,
  showOnlyFavorites,
  onToggleFavorites
}: Props) {
  const [q, setQ] = useState('');

  // debounce simple
  useEffect(() => {
    const t = setTimeout(() => onSearch(q), 250);
    return () => clearTimeout(t);
  }, [q, onSearch]);

  // default regions we want to always show (even if DB doesn't have)
  const defaultRegions = ['Costa', 'Sierra', 'Selva'];

  // merge preserving order and avoiding duplicates (case-insensitive)
  const mergedRegions = (() => {
    const map = new Map<string, string>();
    const push = (name: string) => {
      const key = name?.toString().trim();
      if (!key) return;
      const lower = key.toLowerCase();
      if (!map.has(lower)) map.set(lower, key);
    };
    defaultRegions.forEach(push);
    (regions || []).forEach(push);
    return Array.from(map.values());
  })();

  return (
    <div className="filters" aria-label="Filtros">
      <div className="filters-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* Buscador */}
        <label style={{ flex: '1 1 240px' }}>
          <span className="sr-only">Buscar platos</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar platos..."
            aria-label="Buscar platos"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}
          />
        </label>

        {/* Select de regiones */}
        <label>
          <span className="sr-only">Filtrar por región</span>
          <select
            value={value ?? ''}
            onChange={(e) => onRegionChange(e.target.value)}
            aria-label="Filtrar por región"
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}
          >
            <option value="">Todas las regiones</option>
            {mergedRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        {/* Orden */}
        <label>
          <span className="sr-only">Ordenar platos</span>
          <select onChange={(e) => onSortChange(e.target.value)} aria-label="Ordenar platos" defaultValue="name-asc" style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
            <option value="name-asc">Nombre: A → Z</option>
            <option value="name-desc">Nombre: Z → A</option>
            <option value="region-asc">Región: A → Z</option>
            <option value="region-desc">Región: Z → A</option>
          </select>
        </label>

        {/* Favoritos */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={showOnlyFavorites}
            onChange={(e) => onToggleFavorites(e.target.checked)}
            aria-label="Mostrar solo favoritos"
          />
          <span>Favoritos</span>
        </label>
      </div>
    </div>
  );
}
