// src/views/components/TopMenu.tsx
import React, { useEffect, useRef, useState, type JSX } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../services/AuthContext";
import { supabase } from "../../services/supabase";

/**
TopMenu:
- attempts to get the avatar from user metadata -> profiles.avatar_url
- if none exists, uses ui-avatars.com to generate an avatar by name (automatic fallback)
- if the image fails, a box with the initial is displayed
*/

export default function TopMenu(): JSX.Element {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;
  const signOutFn = auth?.signOut ?? null;
  const navigate = useNavigate();
  const location = useLocation();

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // visibility by scroll
  const [visible, setVisible] = useState(true);
  const lastY = useRef<number>(0);
  const ticking = useRef<boolean>(false);

  // final avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // avatar brought from the profiles table (if it exists)
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // metadata (handles different shapes that supabase can bring)
  const userMeta = (user?.user_metadata ?? user?.userMetadata ?? {}) as any;
  const rawMeta = (user?.raw_user_meta_data ?? user?.rawUserMetaData ?? {}) as any;

  // build display name
  const displayName =
    userMeta?.display_name ||
    rawMeta?.display_name ||
    [rawMeta?.first_name, rawMeta?.last_name].filter(Boolean).join(" ").trim() ||
    (user?.email ? String(user.email).split("@")[0] : "Usuario") ||
    "Usuario";

  // priority possible avatars from metadata
  const avatarFromMeta =
    (userMeta?.picture || userMeta?.avatar || rawMeta?.picture || rawMeta?.avatar || (user as any)?.avatar_url) ?? null;

  const email = (user?.email ?? "") as string;

  // adjust padding-top of the body
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const height = el.offsetHeight || 92;
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = `${height}px`;
    document.documentElement.style.setProperty("--topmenu-height", `${height}px`);
    return () => {
      document.body.style.paddingTop = prev;
      document.documentElement.style.removeProperty("--topmenu-height");
    };
  }, []);

  // if there is user and no avatarFromMeta, try to read profiles.avatar_url
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!user || avatarFromMeta) {
        if (mounted) setProfileAvatar(null);
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (!mounted) return;
        const url = (data as any)?.avatar_url ?? null;
        setProfileAvatar(url);
      } catch (err) {
        if (mounted) setProfileAvatar(null);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [user, avatarFromMeta]);

  // build final avatarUrl: metadata -> profile -> ui-avatars fallback
  useEffect(() => {
    let mounted = true;
    const build = () => {
      if (avatarFromMeta) {
        if (mounted) setAvatarUrl(String(avatarFromMeta));
        return;
      }
      if (profileAvatar) {
        if (mounted) setAvatarUrl(profileAvatar);
        return;
      }
      // fallback: use ui-avatars to ensure image for any user
      const name = displayName || (email ? email.split("@")[0] : "U");
      const ui = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=253341&color=ffffff&size=256&rounded=true`;
      if (mounted) setAvatarUrl(ui);
    };
    build();
    return () => { mounted = false; };
  }, [avatarFromMeta, profileAvatar, displayName, email]);

  // close popover with click outside or ESC
  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (open && popRef.current && !popRef.current.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // scroll listener (hide/show)
  useEffect(() => {
    lastY.current = window.scrollY || 0;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const delta = y - lastY.current;
        const threshold = 10;
        const topReveal = 120;
        if (y <= topReveal) setVisible(true);
        else if (delta > threshold) setVisible(false);
        else if (delta < -threshold) setVisible(true);
        lastY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // if the menu is hidden we close the popover
  useEffect(() => { if (!visible && open) setOpen(false); }, [visible, open]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      if (signOutFn) {
        const res = await signOutFn();
        if (res && res.error) console.error("SignOut error:", res.error);
      } else {
        localStorage.clear();
      }
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setLoading(false);
      setOpen(false);
      // stay home when logged out
      navigate("/", { replace: true });
    }
  };

  const handleGotoLogin = () => {
    setOpen(false);
    navigate("/login", { state: { from: location.pathname } });
  };

  // Avatar component: test image and if it fails show initial
  const Avatar: React.FC<{ size?: number }> = ({ size = 80 }) => {
    const initials = String(displayName || "U").trim().charAt(0).toUpperCase();
    const boxStyle: React.CSSProperties = {
      width: size,
      height: size,
      borderRadius: 10,
      background: "#253341",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#cfe7ff",
      fontWeight: 800,
      fontSize: Math.round(size / 2.6),
    };

    // local state for image error so we fallback to initials on error
    const [imgErrored, setImgErrored] = useState(false);
    useEffect(() => setImgErrored(false), [avatarUrl]);

    if (!avatarUrl || imgErrored) return <div style={boxStyle}>{initials}</div>;

    return (
      <img
        src={avatarUrl}
        alt={`Avatar ${displayName}`}
        style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", boxShadow: "0 8px 30px rgba(2,6,23,0.4)" }}
        onError={() => setImgErrored(true)}
      />
    );
  };

  return (
    <>
      <style>{`
        .topmenu-fullwrap { position: fixed; top: 0; left: 0; right: 0; z-index: 1600; display:flex; justify-content:center; pointer-events:none; }
        .topmenu-full { pointer-events:auto; width:100%; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:18px 36px; min-height:92px; box-sizing:border-box; background: linear-gradient(180deg, rgba(12,18,24,0.66), rgba(6,10,14,0.66)); border-bottom:1px solid rgba(255,255,255,0.02); color:var(--color-text-primary,#fff); backdrop-filter: blur(6px) saturate(120%); box-shadow: 0 10px 40px rgba(2,6,23,0.45); transform: translateY(0); opacity:1; transition: transform 360ms cubic-bezier(.2,.9,.25,1), opacity 300ms ease; will-change: transform, opacity; }
        .topmenu-hidden { transform: translateY(calc(-100% - 12px)); opacity:0; pointer-events:none; }
        .tm-left { display:flex; align-items:center; gap:14px; min-width:64px; }
        .tm-hamb { width:56px; height:56px; border-radius:12px; border:none; display:inline-flex; align-items:center; justify-content:center; background: linear-gradient(180deg,#1f6feb,#0b63ff); color:white; font-size:20px; cursor:pointer; box-shadow: 0 8px 20px rgba(3,102,214,0.16); transition: transform .12s ease, box-shadow .12s; }
        .tm-hamb:active { transform: translateY(1px) scale(.99); }
        .tm-center { flex:1; display:flex; justify-content:center; gap:34px; align-items:center; }
        .tm-center a { color:var(--color-text-primary,#fff); text-decoration:none; font-weight:700; padding:8px 10px; border-radius:8px; transition: background .12s, transform .12s; font-size:18px; }
        .tm-center a:hover { background: rgba(255,255,255,0.03); transform: translateY(-2px); }
        .tm-right { display:flex; align-items:center; gap:12px; min-width:72px; position:relative; }
        .tm-pop { position:absolute; top: calc(100% + 10px); left: 18px; min-width:300px; max-width:420px; background: linear-gradient(180deg,#0f1724,#0b1220); color:#e6eef6; border-radius:12px; box-shadow: 0 22px 60px rgba(2,6,23,0.6); padding:18px; border:1px solid rgba(255,255,255,0.03); z-index:1700; transform-origin: top left; animation: popIn 240ms cubic-bezier(.2,.9,.2,1); }
        @keyframes popIn { from { opacity:0; transform: translateY(-6px) scale(.98);} to { opacity:1; transform: translateY(0) scale(1);} }
        .tm-pop .user-row { display:flex; gap:14px; align-items:center; margin-bottom:12px; }
        .tm-pop .user-info { min-width:0; }
        .tm-pop .user-name { font-weight:800; font-size:1.05rem; margin-bottom:4px; }
        .tm-pop .user-email { font-size:0.95rem; color: rgba(230,238,246,0.85); margin-bottom:8px; overflow-wrap:anywhere; }
        .tm-pop .signout-btn, .tm-pop .signin-btn { width:100%; padding:12px 14px; border-radius:10px; color:white; border:none; cursor:pointer; font-weight:800; }
        .tm-pop .signout-btn { background: linear-gradient(180deg,#ef4444,#dc2626); }
        .tm-pop .signin-btn { background: linear-gradient(180deg,#2563eb,#1d4ed8); }
        @media (max-width: 980px) { .topmenu-full { padding: 14px 20px; min-height:84px; } .tm-center a { font-size:16px; } .tm-pop { left:12px; right:12px; min-width:auto; max-width: calc(100% - 24px); } }
        @media (max-width: 520px) { .topmenu-full { padding:10px 12px; min-height:72px; } .tm-hamb { width:48px; height:48px; } .tm-center { gap:16px; } }
      `}</style>

      <div className="topmenu-fullwrap" role="navigation" aria-label="Top menu">
        <div className={`topmenu-full ${visible ? "" : "topmenu-hidden"}`} ref={wrapperRef}>
          <div className="tm-left">
            <button ref={btnRef} aria-expanded={open} aria-controls="tm-pop" className="tm-hamb" onClick={() => setOpen((s) => !s)} aria-label="Abrir opciones de usuario">☰</button>
          </div>

          <div className="tm-center" role="menubar" aria-label="Navegación principal">
            <Link to="/" role="menuitem">Home</Link>
            <Link to="/dishes" role="menuitem">Dishes</Link>
            <Link to="/about" role="menuitem">About</Link>
          </div>

          <div className="tm-right" aria-hidden>{/* espacio a la derecha */}</div>

          {open && (
            <div id="tm-pop" ref={popRef} className="tm-pop" role="dialog" aria-label="Cuenta y sesión">
              {user ? (
                <>
                  <div className="user-row">
                    <Avatar size={80} />
                    <div className="user-info">
                      <div className="user-name">{displayName}</div>
                      <div className="user-email">{email}</div>
                      <div style={{ fontSize: 13, color: "rgba(230,238,246,0.68)" }}>Cuenta</div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: "rgba(255,255,255,0.02)", margin: "12px 0", borderRadius: 4 }} />

                  <button className="signout-btn" onClick={handleSignOut} disabled={loading} aria-label="Cerrar sesión">
                    {loading ? "Cerrando..." : "Cerrar sesión"}
                  </button>
                </>
              ) : (
                <>
                  <div className="user-row" style={{ alignItems: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 10, background: "#253341", display: "flex", alignItems: "center", justifyContent: "center", color: "#cfe7ff", fontWeight: 700, fontSize: 20, marginRight: 12 }}>🔒</div>
                    <div className="user-info">
                      <div className="user-name">Iniciar sesión</div>
                      <div className="user-email" style={{ fontSize: 13, color: "rgba(230,238,246,0.8)" }}>Accede para guardar favoritos y publicar reseñas</div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: "rgba(255,255,255,0.02)", margin: "12px 0", borderRadius: 4 }} />

                  <button className="signin-btn" onClick={handleGotoLogin} aria-label="Ir a iniciar sesión">Iniciar sesión</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
