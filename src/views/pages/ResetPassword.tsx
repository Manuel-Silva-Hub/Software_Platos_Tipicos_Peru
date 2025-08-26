// src/views/pages/ResetPassword.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useNavigate } from "react-router-dom";

/**
 * ResetPassword page:
 * - Lee tokens desde el fragmento (#access_token=...&refresh_token=...) o desde query (?access_token=...&refresh_token=...)
 * - Si encuentra access_token + refresh_token llama supabase.auth.setSession(...)
 * - Si hay sesión válida permite actualizar la contraseña con updateUser({ password })
 * - Si no hay sesión (enlace inválido/ya usado) muestra instrucciones
 */

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionPresent, setSessionPresent] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // nuevo estado para mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    const parseFromHash = (hash: string) => {
      const h = hash.startsWith("#") ? hash.slice(1) : hash;
      const params = new URLSearchParams(h);
      return {
        access_token: params.get("access_token"),
        refresh_token: params.get("refresh_token"),
      };
    };

    const parseFromQuery = (search: string) => {
      const params = new URLSearchParams(search);
      return {
        access_token: params.get("access_token"),
        refresh_token: params.get("refresh_token"),
      };
    };

    const trySetSessionFromUrl = async () => {
      try {
        const fromHash = parseFromHash(window.location.hash || "");
        const fromQuery = parseFromQuery(window.location.search || "");

        // prefer hash tokens if present (Supabase suele devolver tokens en el fragmento)
        const access_token = fromHash.access_token ?? fromQuery.access_token;
        const refresh_token = fromHash.refresh_token ?? fromQuery.refresh_token;

        if (access_token && refresh_token) {
          // Ambos están presentes: establecer sesión
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          } as { access_token: string; refresh_token: string });

          if (error) {
            console.error("Error setting session from URL tokens:", error);
            if (mounted) {
              setMessage({ type: "error", text: "No se pudo establecer la sesión automáticamente." });
            }
          } else {
            if (mounted) {
              setSessionPresent(Boolean(data?.session));
              setMessage({ type: "info", text: "Puedes cambiar tu contraseña." });
            }
          }

          try {
            const clean = new URL(window.location.origin + window.location.pathname);
            window.history.replaceState({}, document.title, clean.toString());
          } catch (e) {
            // ignore
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            if (mounted) {
              setSessionPresent(true);
              setMessage({ type: "info", text: "Puedes cambiar tu contraseña." });
            }
          } else {
            if (mounted) {
              setSessionPresent(false);
              setMessage({ type: "error", text: "No se detectó sesión. Utiliza el enlace que te llegó al correo." });
            }
          }
        }
      } catch (err: any) {
        console.error("ResetPassword error:", err);
        if (mounted) setMessage({ type: "error", text: "Ocurrió un error al procesar la solicitud." });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    trySetSessionFromUrl();
    return () => { mounted = false; };
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("Error updating password:", error);
        setMessage({ type: "error", text: error.message || "No se pudo actualizar la contraseña." });
      } else {
        setMessage({ type: "success", text: "Contraseña actualizada correctamente. Ahora puedes iniciar sesión." });
        // opcional: cerrar sesión local y redirigir al login
        try { await supabase.auth.signOut(); } catch {}
        setTimeout(() => navigate("/login"), 1400);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Ocurrió un error inesperado." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 520, maxWidth: '96%', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-md)' }}>
        <h2 style={{ marginTop: 0 }}>Restablecer contraseña</h2>

        {loading ? (
          <p>Procesando enlace...</p>
        ) : (
          <>
            {message && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: message.type === "error" ? "#fff4f4" : message.type === "success" ? "#ecfdf5" : "#f0f9ff", color: message.type === "error" ? "#b91c1c" : message.type === "success" ? "#065f46" : "#0369a1" }}>
                {message.text}
              </div>
            )}

            {sessionPresent ? (
              <form onSubmit={handleChangePassword}>
                <label style={{ display: 'block', marginBottom: 12, position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 44px 12px 14px', 
                    borderRadius: 8, 
                    border: '1px solid var(--color-border)' 
                  }}
                />

                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 34,
                    minWidth: 42,
                    border: 'none',
                    background: 'rgba(0,0,0,0.03)',   
                    color: 'var(--color-text-secondary)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    padding: '6px 8px',
                    fontWeight: 600,
                  }}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>

                <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700 }}>
                  {submitting ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </form>
            ) : (
              <div>
                <p>El enlace parece estar incompleto o ya fue usado. Revisa el correo y vuelve a intentar, o solicita uno nuevo desde la pantalla de login.</p>
                <button onClick={() => navigate("/login")} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent' }}>Ir a Login</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
