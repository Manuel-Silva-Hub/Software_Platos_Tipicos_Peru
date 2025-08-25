// src/views/pages/Dishes.tsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDishesController } from "../../controllers/useDishesController";
import { DishCard } from "../components/DishCard";
import { DishModal } from "../components/DishModal";
import { SkeletonCard } from "../components/SkeletonCard";
import { MapView } from "../components/MapView";
import type { Dish } from "../../models/dish";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../services/AuthContext";
import TopMenu from "../components/TopMenu";
import "../../index.css";

const PAGE_SIZE = 8;

type RegionMarker = {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  count?: number;
};

export default function Dishes() {
  const { dishes, loading, error } = useDishesController();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Filters (manual)
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [sortKey, setSortKey] = useState("name-asc");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Pagination / modal
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Markers
  const [regionMarkers, setRegionMarkers] = useState<RegionMarker[]>([]);
  const [markersLoading, setMarkersLoading] = useState(false);
  const [markersError, setMarkersError] = useState<string | null>(null);

  // user meta (kept minimal if needed elsewhere)
  const userMeta = useMemo(() => {
    if (!user) return {};
    return ((user as any).user_metadata ?? (user as any).userMetadata ?? {}) as Record<string, any>;
  }, [user]);

  const getRegionName = (d: Dish | any): string => {
    const cand = d?.region?.name ?? (Array.isArray(d?.regions) && d.regions[0]?.name) ?? d?.region_name ?? d?.regionName ?? "";
    return String(cand ?? "").trim();
  };
  const normalize = (s?: string) => {
    const raw = (s ?? "").toString();
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
    } catch {
      return raw.trim().toLowerCase();
    }
  };
  const regions = useMemo(() => {
    if (!Array.isArray(dishes)) return [];
    const setNames = new Set<string>();
    dishes.forEach((d) => {
      let r = getRegionName(d);
      if (r && r.toString().toLowerCase() !== "false") setNames.add(r.toString().trim());
    });
    return Array.from(setNames).sort((a, b) => a.localeCompare(b));
  }, [dishes]);

  const processed = useMemo(() => {
    if (!Array.isArray(dishes)) return [];
    let list = [...dishes];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((d) => (d.name ?? "").toString().toLowerCase().includes(q));
    }
    if (region && region !== "") {
      const t = normalize(region);
      list = list.filter((d) => {
        const rn = normalize(getRegionName(d));
        return rn && rn !== "false" && rn === t;
      });
    }
    if (showOnlyFavorites) {
      const raw = typeof window !== "undefined" ? localStorage.getItem("fav_dish_ids") : null;
      const favs = raw ? JSON.parse(raw) : [];
      list = list.filter((d) => favs.includes(Number(d?.id)));
    }
    switch (sortKey) {
      case "name-asc":
        list.sort((a, b) => (a?.name ?? "").toString().localeCompare((b?.name ?? "").toString()));
        break;
      case "name-desc":
        list.sort((a, b) => (b?.name ?? "").toString().localeCompare((a?.name ?? "").toString()));
        break;
      case "region-asc":
        list.sort((a, b) => normalize(getRegionName(a)).localeCompare(normalize(getRegionName(b))));
        break;
      case "region-desc":
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

  useEffect(() => setPage(1), [query, region, sortKey, showOnlyFavorites]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && paginated.length < processed.length) setPage((p) => p + 1);
        });
      },
      { rootMargin: "200px" }
    );
    const el = sentinelRef.current;
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [processed.length, paginated.length]);

  // handlers
  const handleSearch = useCallback((q: string) => setQuery(q), []);
  const handleRegion = useCallback((r: string) => setRegion(r), []);
  const handleSort = useCallback((s: string) => setSortKey(s), []);
  const handleToggleFavs = useCallback((v: boolean) => setShowOnlyFavorites(v), []);
  const openModal = useCallback((d: Dish) => { setActiveDish(d); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setActiveDish(null); }, []);

  // load markers
  useEffect(() => {
    let mounted = true;
    const loadMarkers = async () => {
      setMarkersLoading(true);
      setMarkersError(null);
      try {
        const { data, error } = await supabase.from("regions").select("id, name, lat, lng, dishes(id)").not("lat", "is", null).not("lng", "is", null);
        if (error) {
          if (mounted) setMarkersError(String(error.message ?? error));
          return;
        }
        const markers: RegionMarker[] = (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          lat: Number(r.lat),
          lng: Number(r.lng),
          count: Array.isArray(r.dishes) ? r.dishes.length : 0,
        }));
        if (mounted) setRegionMarkers(markers);
      } catch (err) {
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

  // --- open modal automatically when location.state.openDishId or ?open=ID present ---
  useEffect(() => {
    let mounted = true;
    const tryOpenFromLocation = async () => {
      try {
        const stateId = (location.state as any)?.openDishId;
        const params = new URLSearchParams(location.search);
        const qId = params.get("open") ? Number(params.get("open")) : null;
        const idToOpen = typeof stateId === "number" ? stateId : qId;
        if (!idToOpen) return;

        // if dish is already loaded in `dishes` list, use it
        const found = Array.isArray(dishes) ? (dishes as any).find((x: any) => Number(x.id) === Number(idToOpen)) : null;
        if (found) {
          if (!mounted) return;
          setActiveDish(found);
          setModalOpen(true);
          try { navigate("/dishes", { replace: true, state: {} }); } catch { /*ignore*/ }
          return;
        }

        // otherwise fetch single dish row and open modal
        const { data, error } = await supabase.from("dishes").select("*").eq("id", idToOpen).single();
        if (error) {
          console.warn("Could not fetch dish by id:", error);
          return;
        }
        if (!mounted) return;
        setActiveDish(data as any);
        setModalOpen(true);
        try { navigate("/dishes", { replace: true, state: {} }); } catch { /* ignore */ }
      } catch (err) {
        console.error("Error opening dish from location:", err);
      }
    };
    tryOpenFromLocation();
    return () => { mounted = false; };
  }, [location.state, location.search, dishes, navigate]);

  // CSS - removed local menu styles; keep layout/grid styles
  const css = `
    :root { --pad: 16px; }
    .wrap { min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: var(--pad); box-sizing: border-box; }

    /* header & filters + grid */
    .header-grid { display: grid; grid-template-columns: 56px 1fr 56px; gap: 8px; align-items: center; margin-bottom: 6px; }
    .title-wrap { text-align:center; }
    .home-title { margin:0; font-size:1.8rem; }
    .home-subtitle { margin-top: 6px; color:var(--color-text-secondary); }

    .filters-row { display:flex; gap:8px; align-items:center; margin:6px 0; flex-wrap:wrap; }
    .compact-search-wrap { flex:1 1 420px; min-width:160px; }
    .compact-search { width:100%; height:42px; padding:8px 12px; border-radius:8px; border:1px solid rgba(0,0,0,.2); box-sizing:border-box; }

    .dishes-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      align-items: start;
      margin-top: 8px;
    }

    .card-wrap { display:flex; flex-direction:column; height:100%; box-sizing:border-box; }
    .card-wrap > * { display:flex; flex-direction:column; flex:1 1 auto; height:100%; box-sizing:border-box; }
    .card-wrap img { width:100%; height:200px; object-fit:cover; border-radius:8px; display:block; }
    .card-wrap p { margin:0 0 12px 0; flex:1 1 auto; overflow:hidden; }
    .card-wrap .card-footer, .card-wrap .footer { margin-top:auto; }

    @media (max-width: 1024px) {
      .dishes-grid { grid-template-columns: repeat(2, 1fr); }
      .card-wrap img { height:180px; }
    }
    @media (max-width: 640px) {
      .dishes-grid { grid-template-columns: 1fr; }
      .card-wrap img { height:160px; }
    }
  `;

  return (
    <>
      <style>{css}</style>

      <div className="wrap">
        <div className="container">
          <TopMenu />

          {/* Header (title centered) */}
          <div className="header-grid" role="banner">
            <div>{/* left spacer intentionally empty */}</div>

            <div className="title-wrap">
              <h1 className="home-title">Platos Típicos Peruanos</h1>
              <div className="home-subtitle">Explora la enorme tradición culinaria peruana y sus sabores regionales</div>
            </div>

            <div>{/* right spacer intentionally empty */}</div>
          </div>

          {/* Compact filters */}
          <div className="filters-wrapper" aria-label="Filtros">
            <div className="filters-row">
              <div className="compact-search-wrap">
                <input className="compact-search" type="search" placeholder="Buscar platos..." value={query} onChange={(e) => handleSearch(e.target.value)} />
              </div>

              <select className="select-compact" value={region} onChange={(e) => handleRegion(e.target.value)}>
                <option value="">Todas las regiones</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select className="select-compact" value={sortKey} onChange={(e) => handleSort(e.target.value)}>
                <option value="name-asc">Nombre: A → Z</option>
                <option value="name-desc">Nombre: Z → A</option>
                <option value="region-asc">Región: A → Z</option>
                <option value="region-desc">Región: Z → A</option>
              </select>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={showOnlyFavorites} onChange={(e) => handleToggleFavs(e.target.checked)} />
                <span>Favoritos</span>
              </label>
            </div>
          </div>

          {/* CONTENT */}
          {loading && (
            <div role="status" aria-live="polite" style={{ marginTop: 8 }}>
              <div style={{ display: "grid", gap: 12 }}>{Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}</div>
            </div>
          )}

          {error && <div role="alert" style={{ marginTop: 8 }}><strong>Error:</strong> {String(error)}</div>}

          {!loading && !error && (
            <>
              <section aria-labelledby="dishes-heading" style={{ marginTop: 8 }}>
                <h2 id="dishes-heading" className="sr-only">Lista de platos</h2>

                <div className="dishes-grid" role="list">
                  {paginated.map((dish) => (
                    <div key={String(dish.id)} className="card-wrap" role="listitem">
                      <DishCard dish={dish} onOpen={openModal} />
                    </div>
                  ))}
                </div>

                <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
              </section>

              <MapView regionMarkers={regionMarkers} />

              {markersLoading && <p style={{ textAlign: "center", marginTop: 8 }}>Cargando mapa...</p>}
              {markersError && <p style={{ textAlign: "center", color: "var(--color-error)" }}>Error cargando mapa: {markersError}</p>}
            </>
          )}

          <DishModal open={modalOpen} dish={activeDish} onClose={() => {
            closeModal();
            try { navigate("/dishes", { replace: true, state: {} }); } catch {}
          }} />
        </div>
      </div>
    </>
  );
}
