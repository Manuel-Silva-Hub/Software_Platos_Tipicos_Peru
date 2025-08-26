// src/views/pages/Home.tsx
import { supabase } from "../../services/supabase";
import React, { useEffect, useState } from "react";
import TopMenu from "../components/TopMenu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthContext";

type ReviewRow = {
  id: number;
  dish_id?: number | null;
  user_id?: string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
  dishes?: { id?: number; name?: string; img?: string } | null;
};

type TopDish = {
  dish_id: number;
  name?: string | null;
  img?: string | null;
  avgRating: number;
  count: number;
};

const POSSIBLE_NAME_KEYS = ["name", "title", "nombre", "titulo", "dish_name"];
const POSSIBLE_IMAGE_KEYS = ["photo_url", "img", "image", "photo", "image_url", "url", "src", "picture", "imagen"];

const pickStringField = (obj: any, keys: string[]) => {
  if (!obj) return null;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k]) return String(obj[k]);
  }
  return null;
};

const isAbsoluteUrl = (s?: string | null) => !!s && /^(https?:)?\/\//i.test(s);

const resolvePublicUrlFromStorage = (path: string | null) => {
  if (!path) return null;
  const buckets = ["dishes", "photos", "images", "public"];
  for (const bucket of buckets) {
    try {
      // @ts-ignore
      const res = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl =
        (res && res.data && (res.data.publicUrl || (res.data as any).publicURL)) ||
        (res && (res as any).publicURL) ||
        null;
      if (publicUrl) return publicUrl;
    } catch (e) {}
  }
  return null;
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth() as any; // usar signOut desde el contexto

  const [goodReviews, setGoodReviews] = useState<ReviewRow[]>([]);
  const [loadingGoodReviews, setLoadingGoodReviews] = useState(true);
  const [goodReviewsError, setGoodReviewsError] = useState<string | null>(null);

  const [topDishes, setTopDishes] = useState<TopDish[]>([]);
  const [loadingTopDishes, setLoadingTopDishes] = useState(true);
  const [topDishesError, setTopDishesError] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchGoodReviews = async () => {
      setLoadingGoodReviews(true);
      setGoodReviewsError(null);
      try {
        const { data, error } = await supabase
          .from<ReviewRow>("reviews")
          .select("id, dish_id, user_id, rating, comment, created_at, dishes(id, name)")
          .gte("rating", 4)
          .not("comment", "is", null)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        if (!mounted) return;
        setGoodReviews(data ?? []);
      } catch (err: any) {
        console.error("Error fetching good reviews:", err);
        if (!mounted) return;
        setGoodReviews([]);
        setGoodReviewsError("No se pudieron cargar los comentarios positivos.");
      } finally {
        if (mounted) setLoadingGoodReviews(false);
      }
    };

    fetchGoodReviews();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchTopDishes = async () => {
      setLoadingTopDishes(true);
      setTopDishesError(null);

      try {
        const { data: reviews, error: revErr } = await supabase
          .from("reviews")
          .select("dish_id, rating")
          .not("dish_id", "is", null)
          .not("rating", "is", null)
          .limit(20000);

        if (revErr) throw revErr;

        if (!mounted) return;

        if (!reviews || reviews.length === 0) {
          setTopDishes([]);
          setTopDishesError("No hay reseñas con dish_id y rating.");
          return;
        }

        const map = new Map<number, { sum: number; count: number }>();
        for (const r of reviews as any[]) {
          const did = Number(r.dish_id);
          if (!did || Number.isNaN(did)) continue;
          const rating = typeof r.rating === "number" ? r.rating : parseFloat(r.rating) || 0;
          const cur = map.get(did);
          if (cur) {
            cur.sum += rating;
            cur.count += 1;
          } else {
            map.set(did, { sum: rating, count: 1 });
          }
        }

        if (map.size === 0) {
          setTopDishes([]);
          setTopDishesError("No hay reseñas válidas para agrupar.");
          return;
        }

        const aggregated: TopDish[] = Array.from(map.entries()).map(([dish_id, v]) => ({
          dish_id,
          avgRating: parseFloat((v.sum / v.count).toFixed(2)),
          count: v.count,
        }));

        aggregated.sort((a, b) => {
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          return b.count - a.count;
        });

        const topCandidateIds = aggregated.slice(0, 10).map((x) => x.dish_id);

        let dishesData: any[] = [];
        if (topCandidateIds.length) {
          const { data: dishes, error: dishesErr } = await supabase
            .from("dishes")
            .select("*")
            .in("id", topCandidateIds);

          if (dishesErr) {
            console.warn("Warning fetching dishes info:", dishesErr);
          } else {
            dishesData = dishes || [];
          }
        }

        const dishesMap = new Map<number, any>();
        (dishesData || []).forEach((d) => dishesMap.set(Number(d.id), d));

        const merged = aggregated
          .map((a) => {
            const dishRow = dishesMap.get(a.dish_id) || {};
            const name = pickStringField(dishRow, POSSIBLE_NAME_KEYS) ?? null;
            let imgCandidate = pickStringField(dishRow, POSSIBLE_IMAGE_KEYS) ?? null;
            if (!imgCandidate && dishRow && dishRow.photo_url) imgCandidate = String(dishRow.photo_url);

            let imgUrl: string | null = null;
            if (isAbsoluteUrl(imgCandidate)) {
              imgUrl = imgCandidate!;
            } else if (imgCandidate) {
              const publicUrl = resolvePublicUrlFromStorage(imgCandidate);
              if (publicUrl) imgUrl = publicUrl;
              else imgUrl = imgCandidate;
            }

            return { ...a, name, img: imgUrl } as TopDish;
          })
          .filter(Boolean);

        const top3 = merged.slice(0, 3);
        if (!mounted) return;
        setTopDishes(top3);
      } catch (err: any) {
        console.error("Error fetching/aggregating top dishes:", err);
        if (!mounted) return;
        setTopDishes([]);
        setTopDishesError("No se pudieron calcular los platos mejor valorados.");
      } finally {
        if (mounted) setLoadingTopDishes(false);
      }
    };

    fetchTopDishes();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (signOut && typeof signOut === "function") await signOut();
      else localStorage.clear();
      // permanecer en home al cerrar sesión
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  // navegar a /dishes y abrir modal (no requiere login)
  const goToDish = (dishId: number) => {
    navigate("/dishes", { state: { openDishId: dishId } });
  };

  return (
    <div className="app home-container" role="main">
      <TopMenu />

      <header className="home-header" aria-labelledby="home-title" style={{ position: "relative" }}>
        <h1 id="home-title" className="home-title">Bienvenidos a la Cocina Peruana</h1>
        <p className="home-description">Recetas, ingredientes y cultura gastronómica de la costa, sierra y selva.</p>

        <div style={{ height: 12 }} aria-hidden />
      </header>

      <section aria-labelledby="topd-title" style={{ marginTop: 36 }}>
        <h2 id="topd-title" style={{ textAlign: "center", marginBottom: 12 }}>Top 3 - Platos mejor valorados</h2>

        {loadingTopDishes ? (
          <div className="loading-state">Calculando los platos mejor valorados...</div>
        ) : topDishesError ? (
          <div className="error-state">
            <p className="error-title">Error</p>
            <p className="error-message">{topDishesError}</p>
          </div>
        ) : topDishes.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No hay datos suficientes para mostrar el top</p>
            <p className="empty-message">Aún no hay reseñas asociadas a los platos.</p>
          </div>
        ) : (
          <div className="dishes-grid" style={{ maxWidth: 1100, margin: "0 auto" }}>
            {topDishes.map((d) => (
              <article key={d.dish_id} className="dish-card" tabIndex={0} aria-labelledby={`topd-${d.dish_id}-name`}>
                <div className="dish-image-container">
                  {d.img ? <img src={d.img} alt={d.name ?? `Plato ${d.dish_id}`} className="dish-image loaded" /> : <div className="image-placeholder">Sin imagen</div>}
                </div>

                <div className="dish-content">
                  <div className="dish-header">
                    <div id={`topd-${d.dish_id}-name`} className="dish-name">{d.name ?? `Plato #${d.dish_id}`}</div>
                  </div>

                  <div className="dish-body">
                    <p className="dish-description">Promedio: <strong>{d.avgRating}</strong> • {d.count} reseña{d.count > 1 ? "s" : ""}</p>
                  </div>

                  <div className="dish-footer" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => goToDish(d.dish_id)} className="home-cta">Ver plato</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="good-reviews-title" style={{ marginTop: 48 }}>
        <h2 id="good-reviews-title" style={{ textAlign: "center", marginBottom: 12 }}>Comentarios destacados</h2>

        {loadingGoodReviews ? (
          <div className="loading-state">Cargando comentarios...</div>
        ) : goodReviewsError ? (
          <div className="error-state">
            <p className="error-title">Error al cargar comentarios</p>
            <p className="error-message">{goodReviewsError}</p>
          </div>
        ) : goodReviews.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No hay comentarios positivos todavía</p>
            <p className="empty-message">Aún no hay reseñas con rating alto o no fue posible cargarlas.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 12 }}>
            {goodReviews.map((r) => (
              <article key={r.id} className="testimonial-card" aria-labelledby={`rev-${r.id}-who`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div id={`rev-${r.id}-who`} style={{ fontWeight: 700 }}>
                      {r.dishes?.name ? r.dishes.name : (r.user_id ? `Usuario ${String(r.user_id).slice(0, 8)}` : "Usuario")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
                  </div>

                  <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>⭐ {r.rating ?? "—"}</div>
                </div>

                <p style={{ marginTop: 10 }}>{r.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: 56, paddingBottom: 48, textAlign: "center" }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} Cocina Peruana — Todos los derechos reservados</p>
      </footer>
    </div>
  );
};

export default Home;
