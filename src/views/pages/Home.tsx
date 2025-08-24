// src/views/pages/Home.tsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDishesController } from "../../controllers/useDishesController";
import { DishCard } from "../components/DishCard";
import { DishModal } from "../components/DishModal";
import { SkeletonCard } from "../components/SkeletonCard";
import { MapView } from "../components/MapView";
import type { Dish } from "../../models/dish";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../services/AuthContext";
import "../../index.css";

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // menu fixed + dropdown
  const [showMenuButton, setShowMenuButton] = useState<boolean>(() => (typeof window !== "undefined" ? window.scrollY < 30 : true));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

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

  const [signingOut, setSigningOut] = useState(false);

  // user meta
  const userMeta = useMemo(() => {
    if (!user) return {};
    return ((user as any).user_metadata ?? (user as any).userMetadata ?? {}) as Record<string, any>;
  }, [user]);

  const userAvatar = useMemo(() => {
    return userMeta?.picture || userMeta?.avatar_url || userMeta?.avatar || (user as any)?.avatar_url || null;
  }, [userMeta, user]);

  const userName = useMemo(() => {
    const candidates = [
      userMeta?.name,
      userMeta?.full_name,
      userMeta?.given_name && userMeta?.family_name ? `${userMeta.given_name} ${userMeta.family_name}` : null,
      userMeta?.given_name,
      userMeta?.preferred_username,
    ];
    const name = candidates.find((c) => c && String(c).trim().length > 0);
    if (name) return String(name);
    return (user?.email ?? "").split("@")[0] || "Usuario";
  }, [userMeta, user]);

  // close dropdown on outside click or Escape
  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(t) && !menuBtnRef.current?.contains(t)) {
        setDropdownOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [dropdownOpen]);

  // hide menu button when user scrolls away from top
  useEffect(() => {
    const onScroll = () => {
      const atTop = window.scrollY < 30;
      setShowMenuButton(atTop);
      if (!atTop) setDropdownOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // dish processing (same)
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

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const res = await signOut();
      if (res?.error) console.error("Error al cerrar sesión:", res.error);
    } catch (err) {
      console.error("Unexpected signOut error", err);
    } finally {
      setSigningOut(false);
      setDropdownOpen(false);
      navigate("/login", { replace: true });
    }
  }, [signOut, navigate]);

  // CSS - menu fixed + dropdown only inside popover; grid unchanged
  const css = `
    :root { --pad: 16px; }
    .wrap { min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: var(--pad); box-sizing: border-box; }

    /* menu fixed in corner (does not affect layout flow) */
    .menu-fixed {
      position: fixed;
      left: 16px;
      top: 16px;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
      pointer-events: auto;
    }
    .menu-fixed .menu-btn {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      background: var(--menu-bg, #0b63ff);
      color: white;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.12);
      cursor: pointer;
    }

    /* dropdown popover - positioned relative to fixed button */
    .user-popover {
      position: absolute;
      left: 0;
      top: 56px;
      min-width: 220px;
      background: var(--popover-bg, #ffffff);
      color: var(--popover-text, #111827);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(2,6,23,0.4);
      padding: 12px;
      display: block;
    }

    .user-row { display:flex; gap:12px; align-items:center; }
    .avatar-fallback {
      width: 56px; height: 56px; border-radius: 50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-weight:700; color:#374151; font-size:20px;
    }
    .signout-btn {
      width:100%;
      padding: 8px 10px;
      border-radius: 8px;
      border: none;
      background: #ef4444;
      color: white;
      cursor: pointer;
    }

    /* header & filters + grid (kept compact) */
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
      .menu-fixed { left: 12px; top: 12px; }
      .user-popover { position: fixed; left: 12px; right: 12px; top: 72px; }
    }
  `;

  return (
    <>
      <style>{css}</style>

      {/* fixed menu (no extra visible avatar or signout unless dropdownOpen) */}
      <div className="menu-fixed" aria-hidden={false}>
        <button
          ref={menuBtnRef}
          className="menu-btn"
          aria-label="Abrir menú"
          onClick={() => setDropdownOpen((s) => !s)}
          style={{ transform: showMenuButton ? "translateY(0)" : "translateY(-120%)", opacity: showMenuButton ? 1 : 0, transition: "all .22s ease" }}
        >
          ☰
        </button>

        {/* popover only when open */}
        {dropdownOpen && (
          <div ref={dropdownRef} className="user-popover" role="dialog" aria-label="Cuenta">
            <div className="user-row">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div className="avatar-fallback">{userName.charAt(0).toUpperCase()}</div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{/* opcional: no mostramos email */}</div>
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "10px 0", borderRadius: 2 }} />

            <button className="signout-btn" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        )}
      </div>

      <div className="wrap">
        <div className="container">
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

          <DishModal open={modalOpen} dish={activeDish} onClose={closeModal} />
        </div>
      </div>
    </>
  );
}
