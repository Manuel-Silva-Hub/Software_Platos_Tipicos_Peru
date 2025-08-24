// src/views/pages/Home.tsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDishesController } from '../../controllers/useDishesController';
import { DishCard } from '../components/DishCard';

/**
 * Home page component - Main view for displaying typical dishes
 *
 * - Fixed component import path for DishCard
 * - Keeps loading/error/empty states unchanged
 * - Uses semantic & accessible structure
 */
import { Filters } from '../components/Filters';
import { DishModal } from '../components/DishModal';
import { SkeletonCard } from '../components/SkeletonCard';
import { MapView } from '../components/MapView';
import type { Dish } from '../../models/dish';
import { supabase } from '../../services/supabase';
import '../../index.css';

const PAGE_SIZE = 8;

type RegionMarker = {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  count?: number;
};

export default function Home() {
  const { dishes, loading, error } = useDishesController();

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(''); // '' => todas las regiones
  const [sortKey, setSortKey] = useState('name-asc');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // region markers (Map)
  const [regionMarkers, setRegionMarkers] = useState<RegionMarker[]>([]);
  const [markersLoading, setMarkersLoading] = useState(false);
  const [markersError, setMarkersError] = useState<string | null>(null);

  // ---------- Helpers ----------
  const getRegionName = (d: Dish | any): string => {
    const cand =
      d?.region?.name ??
      (Array.isArray(d?.regions) && d.regions[0]?.name) ??
      d?.region_name ??
      d?.regionName ??
      '';
    return String(cand ?? '').trim();
  };

  const normalize = (s?: string) => {
    const raw = (s ?? '').toString();
    try {
      return raw
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();
    } catch {
      return raw.trim().toLowerCase();
    }
  };

  // Debug temporal: muestra qué trae dishes
  useEffect(() => {
    if (!Array.isArray(dishes)) {
      console.warn('DEBUG: dishes is not an array', dishes);
      return;
    }
    console.info('DEBUG loaded dishes count:', dishes.length);
    console.info(
      'DEBUG sample dishes:',
      dishes.slice(0, 8).map((d) => ({
        id: d.id,
        name: d.name,
        regionRaw: (d as any).region ?? (d as any).regions?.[0] ?? null,
        regionName: getRegionName(d)
      }))
    );
  }, [dishes]);

  // derive list of region names from dishes
  const regions = useMemo(() => {
    if (!Array.isArray(dishes)) return [];

    const setNames = new Set<string>();
    dishes.forEach((d) => {
      let r = getRegionName(d);
      if (r && r.toString().toLowerCase() !== 'false') {
        setNames.add(r.toString().trim());
      }
    });

    return Array.from(setNames).sort((a, b) => a.localeCompare(b));
  }, [dishes]);

  // fetch region markers from Supabase
  useEffect(() => {
    let mounted = true;
    const loadMarkers = async () => {
      setMarkersLoading(true);
      setMarkersError(null);
      try {
        const { data, error } = await supabase
          .from('regions')
          .select('id, name, lat, lng, dishes(id)')
          .not('lat', 'is', null)
          .not('lng', 'is', null);

        if (error) {
          console.error('Error loading region markers:', error);
          if (mounted) setMarkersError(String(error.message ?? error));
          return;
        }

        const markers: RegionMarker[] = (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          lat: Number(r.lat),
          lng: Number(r.lng),
          count: Array.isArray(r.dishes) ? r.dishes.length : 0
        }));

        if (mounted) setRegionMarkers(markers);
      } catch (err) {
        console.error('Unexpected error loading region markers:', err);
        if (mounted) setMarkersError(String((err as any)?.message ?? err));
      } finally {
        if (mounted) setMarkersLoading(false);
      }
    };

    loadMarkers();
    return () => {
      mounted = false;
    };
  }, []);

  // Procesar lista de platos con filtros
  const processed = useMemo(() => {
    if (!Array.isArray(dishes)) return [];

    let list = [...dishes];

    // Search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((d) => (d.name ?? '').toString().toLowerCase().includes(q));
    }

    // Region filter
    if (region && region !== '') {
      const target = normalize(region);
      list = list.filter((d) => {
        const rn = normalize(getRegionName(d));
        return rn && rn !== 'false' && rn === target;
      });
    }

    // Favorites filter
    if (showOnlyFavorites) {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('fav_dish_ids') : null;
      const favs = raw ? JSON.parse(raw) : [];
      list = list.filter((d) => favs.includes(Number(d?.id)));
    }

    // Sorting
    switch (sortKey) {
      case 'name-asc':
        list.sort((a, b) => (a?.name ?? '').toString().localeCompare((b?.name ?? '').toString()));
        break;
      case 'name-desc':
        list.sort((a, b) => (b?.name ?? '').toString().localeCompare((a?.name ?? '').toString()));
        break;
      case 'region-asc':
        list.sort((a, b) => normalize(getRegionName(a)).localeCompare(normalize(getRegionName(b))));
        break;
      case 'region-desc':
        list.sort((a, b) => normalize(getRegionName(b)).localeCompare(normalize(getRegionName(a))));
        break;
      default:
        break;
    }

    return list;
  }, [dishes, query, region, sortKey, showOnlyFavorites]);

  const paginated = useMemo(() => {
    const start = 0;
    const end = PAGE_SIZE * page;
    return processed.slice(start, end);
  }, [processed, page]);

  useEffect(() => {
    setPage(1);
  }, [query, region, sortKey, showOnlyFavorites]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && paginated.length < processed.length) {
            setPage((p) => p + 1);
          }
        });
      },
      { rootMargin: '200px' }
    );
    const el = sentinelRef.current;
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [processed.length, paginated.length]);

  const handleSearch = useCallback((q: string) => setQuery(q), []);
  const handleRegion = useCallback((r: string) => setRegion(r), []);
  const handleSort = useCallback((s: string) => setSortKey(s), []);
  const handleToggleFavs = useCallback((v: boolean) => setShowOnlyFavorites(v), []);

  const openModal = useCallback((d: Dish) => {
    setActiveDish(d);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setActiveDish(null);
  }, []);

  return (
    <main className="home-container" role="main" aria-labelledby="main-heading">
      <header className="home-header">
        <h1 id="main-heading" className="home-title">
          Platos Típicos Peruanos
        </h1>
        <p className="home-description">Explora la enorme tradición culinaria peruana y sus sabores regionales</p>
      </header>

      <Filters
        regions={regions}
        value={region}
        onSearch={handleSearch}
        onRegionChange={handleRegion}
        onSortChange={handleSort}
        showOnlyFavorites={showOnlyFavorites}
        onToggleFavorites={handleToggleFavs}
      />

      {loading && (
        <div className="loading-state" role="status" aria-live="polite">
          <div style={{ display: 'grid', gap: 12 }}>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-state" role="alert">
          <h2 className="error-title">Error</h2>
          <p className="error-message">{String(error)}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="dishes-section" aria-labelledby="dishes-heading">
            <h2 id="dishes-heading" className="sr-only">Dishes list</h2>

            {paginated.length === 0 ? (
              <div className="empty-state">
                <h2 className="empty-title">No dishes</h2>
                <p className="empty-message">Try different filters or clear search.</p>
              </div>
            ) : (
              <div className="dishes-grid" role="list">
                {paginated.map((dish) => (
                  <DishCard key={String(dish.id)} dish={dish} role="listitem" onOpen={openModal} />
                ))}
              </div>
            )}

            <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
          </section>

          <MapView regionMarkers={regionMarkers} />

          {markersLoading && <p style={{ textAlign: 'center', marginTop: 8 }}>Cargando mapa...</p>}
          {markersError && (
            <p style={{ textAlign: 'center', color: 'var(--color-error)' }}>
              Error cargando mapa: {markersError}
            </p>
          )}
        </>
      )}

      <DishModal open={modalOpen} dish={activeDish} onClose={closeModal} />
    </main>
  );
}
