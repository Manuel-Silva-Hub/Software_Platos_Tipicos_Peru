// src/views/pages/Login.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../services/AuthContext';

const STORAGE_KEY = 'remembered_emails';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const from = (location.state as any)?.from || '/home';

  const [showRegistrationMessage, setShowRegistrationMessage] = useState(false);
  const params = new URLSearchParams(location.search);
  const verified = params.get('verified');

  useEffect(() => {
    const registrationSuccess = (location.state as any)?.registrationSuccess;
    if (registrationSuccess) {
      setShowRegistrationMessage(true);
      setTimeout(() => setShowRegistrationMessage(false), 5000);
    }
  }, [location.state]);

  // --- NUEVO: manejar hash que envía Supabase (access_token / refresh_token)
  useEffect(() => {
    const handleSupabaseHash = async () => {
      try {
        const hash = window.location.hash || '';
        if (!hash) return;

        // transform "#access_token=...&refresh_token=...&..." => "access_token=...&refresh_token=..."
        const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
        const h = new URLSearchParams(cleanHash);

        const access_token = h.get('access_token');
        const refresh_token = h.get('refresh_token');
        const type = h.get('type'); // e.g. "signup" or "recovery"

        if (!access_token && !refresh_token) return;

        // If we have both tokens, set the session so the user becomes authenticated in the client.
        // This uses the supabase auth client to persist the session in local storage.
        if (access_token && refresh_token) {
          try {
            // setSession expects an object: { access_token, refresh_token }
            await supabase.auth.setSession({ access_token, refresh_token });
            console.log('Login: sesión establecida desde hash.');
          } catch (err) {
            console.warn('Login: setSession falló, intentando setAuth como fallback', err);
            // fallback: try setAuth with just access token (less ideal)
            try {
              // @ts-ignore - some versions expose setAuth
              await supabase.auth.setAuth?.(access_token);
            } catch (e) {
              console.warn('Login: fallback setAuth falló', e);
            }
          }
        } else if (access_token && !refresh_token) {
          // If only access_token is present, try setAuth as a fallback
          try {
            // @ts-ignore possible in some versions
            await supabase.auth.setAuth?.(access_token);
            console.log('Login: setAuth fallback aplicado.');
          } catch (e) {
            console.warn('Login: setAuth fallback falló', e);
          }
        }

        // Redirect to a clean URL and show the verified flag (so the UI displays the success message).
        // Use replace to avoid leaving the token-hash in history.
        const target = `${window.location.origin}/login?verified=true`;
        window.location.replace(target);
      } catch (e) {
        console.error('Login: error procesando hash de Supabase', e);
      }
    };

    // Run once on mount
    handleSupabaseHash();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // --- FIN del bloque nuevo

  // form status
  const [email, setEmail] = useState(''); // <-- starts empty
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  // dropdown / remembered emails
  const [rememberedEmails, setRememberedEmails] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reset password
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // load remembered emails (but DO NOT fill in the email field)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(arr)) setRememberedEmails(arr);

      // IMPORTANT: We don't automatically fill in the email input.
      // setEmail will remain empty until the user selects an email.
    } catch (e) {
      console.warn('Error reading remembered emails', e);
    }
  }, []);

  // close dropdown on click outside
  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(t) &&
        wrapperRef.current &&
        !wrapperRef.current.contains(t)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [dropdownOpen]);

  // redirect only if the user logs in from the form and we are in /login
  // IMPORTANT: don't auto-redirect away from /login if the url contains ?verified=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isVerifiedParam = params.get('verified') === 'true';

    if (!authLoading && user && !resetMode && location.pathname === '/login' && !isVerifiedParam) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, navigate, from, resetMode, location.pathname, location.search]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const saveRememberedEmails = (list: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }
  };

  const addRememberedEmail = (em: string) => {
    const emailNorm = em.trim();
    if (!emailNorm) return;
    setRememberedEmails((prev) => {
      const next = Array.from(new Set([emailNorm, ...prev]));
      saveRememberedEmails(next);
      return next;
    });
  };

  const removeRememberedEmail = (em: string) => {
    setRememberedEmails((prev) => {
      const next = prev.filter((x) => x !== em);
      saveRememberedEmails(next);
      if (email === em) setEmail('');
      return next;
    });
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Introduce un correo válido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signError } = await signIn(email.trim(), password);
      if (signError) {
        console.error('SignIn error:', signError);
        setError(signError.message ?? String(signError));
      } else if (data?.user) {
        console.log('Login: Inicio de sesión exitoso');
        // We only save if the user explicitly checked "Remember me"
        if (remember) addRememberedEmail(email.trim());
      }
    } catch (err: any) {
      console.error('Login unexpected error', err);
      setError(err?.message ?? 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    setResetMessage(null);
    setResetLoading(true);

    if (!validateEmail(resetEmail)) {
      setResetMessage('Introduce un correo válido para recuperar contraseña.');
      setResetLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/ResetPassword`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetErr) {
        console.error('Reset error', resetErr);
        setResetMessage(resetErr.message ?? 'No se pudo enviar el correo de recuperación.');
      } else {
        setResetMessage('Correo de recuperación enviado. Revisa tu bandeja.');
      }
    } catch (e: any) {
      console.error('Unexpected reset error', e);
      setResetMessage('Ocurrió un error al solicitar recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  const pickEmail = (em: string) => {
    setEmail(em);
    setDropdownOpen(false);
    // we don't automatically check "remember": the user decides to check the box.
  };

  const handleRememberToggle = (checked: boolean) => {
    setRemember(checked);
    if (checked && email && validateEmail(email)) {
      addRememberedEmail(email.trim());
    }
  };

  // filter for dropdown
  const inputLower = email.toLowerCase().trim();
  const filtered = inputLower
    ? rememberedEmails.filter((e) => e.toLowerCase().includes(inputLower))
    : rememberedEmails.slice(0, 10);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`
        /* Compact dropdown styles */
        .remember-wrapper { position: relative; }
        .remember-dropdown {
          position: absolute;
          z-index: 2200;
          top: calc(100% + 6px);
          left: 0;
          width: 320px;
          max-width: calc(100% - 40px);
          min-width: 200px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          font-size: 14px;
        }

        .remember-dropdown .arrow {
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 6px solid rgba(9,10,11,1);
          margin-left: 14px;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
        }

        .remember-dropdown .menu {
          background: rgba(9,10,11,1);
          border-radius: 6px;
          padding: 6px;
          box-shadow: 0 8px 20px rgba(2,6,23,0.55);
          border: 1px solid rgba(255,255,255,0.03);
          max-height: 180px;
          overflow-y: auto;
        }

        .remember-dropdown .item {
          padding: 8px 10px;
          border-radius: 6px;
          margin-bottom: 6px;
          background: transparent;
          color: #fff;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          line-height: 1.1;
        }
        .remember-dropdown .item:hover { background: rgba(255,255,255,0.02); }

        .remember-dropdown .item .label { flex: 1; min-width: 0; font-size: 13.5px; }

        @media (max-width: 640px) {
          .remember-dropdown {
            left: 0;
            right: 0;
            width: 100%;
            max-width: none;
            top: calc(100% + 6px);
            margin: 0;
          }
          .remember-dropdown .arrow { margin-left: 12px; transform: scale(0.95); }
          .remember-dropdown .menu { border-radius: 8px; padding: 8px; }
        }
      `}</style>

      <div style={{
        width: 460,
        maxWidth: '96%',
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>Iniciar sesión</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
            Accede con tu correo para ver y guardar platos.
          </p>
        </div>

        {verified && (
          <div role="alert" style={{
            background: '#ecfdf5',
            color: '#065f46',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #6ee7b7'
          }}>
            ✅ Tu correo fue confirmado, ahora inicia sesión
          </div>
        )}

        {showRegistrationMessage && (
          <div role="alert" aria-live="polite" style={{
            background: '#f0f9ff',
            color: '#0369a1',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #7dd3fc'
          }}>
            <strong>¡Registro exitoso!</strong> Tu cuenta ha sido creada. Ahora inicia sesión con tus credenciales.
          </div>
        )}

        {error && (
          <div role="alert" aria-live="assertive" style={{ background: '#fff4f4', color: 'var(--color-error)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {!resetMode ? (
          <form onSubmit={handleSubmit}>
            <div className="remember-wrapper" ref={wrapperRef}>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setDropdownOpen(true); }}
                  placeholder="Correo electrónico"
                  aria-label="Correo electrónico"
                  required
                  onFocus={() => setDropdownOpen(true)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                />
              </label>

              {dropdownOpen && filtered.length > 0 && (
                <div className="remember-dropdown" ref={dropdownRef} role="listbox" aria-label="Correos recordados">
                  <div className="arrow" />
                  <div className="menu">
                    {filtered.map((em) => (
                      <div
                        key={em}
                        role="option"
                        onMouseDown={(e) => { e.preventDefault(); pickEmail(em); }}
                        className="item"
                        title={em}
                      >
                        <div className="label">{em}</div>
                        <button
                          type="button"
                          onMouseDown={(ev) => { ev.preventDefault(); removeRememberedEmail(em); }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.9)',
                            cursor: 'pointer',
                            marginLeft: 8,
                            fontSize: 14,
                            lineHeight: 1
                          }}
                          aria-label={`Eliminar ${em}`}
                        >
                          ✖
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <label style={{ display: 'block', marginBottom: 12, position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                aria-label="Contraseña"
                required
                style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: 34,
                  minWidth: 42,
                  border: 'none',
                  background: showPassword ? 'var(--color-primary)' : 'rgba(0,0,0,0.03)',
                  color: showPassword ? '#fff' : 'var(--color-text-secondary)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: '6px 8px'
                }}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => handleRememberToggle(e.target.checked)}
                  aria-label="Recordarme"
                />
                <span style={{ color: 'var(--color-text-secondary)' }}>Recordarme</span>
              </label>

              <button
                type="button"
                onClick={() => { setResetMode(true); setResetEmail(email || ''); setResetMessage(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
              >
                ¿Olvidaste la contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: 'none',
                background: loading ? 'var(--color-primary-hover)' : 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer'
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendReset}>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
              Escribe tu correo y te enviaremos un enlace para restablecer la contraseña.
            </p>

            {resetMessage && (
              <div role="status" aria-live="polite" style={{ marginBottom: 8, color: resetMessage.includes('enviado') ? 'var(--color-success)' : 'var(--color-error)' }}>
                {resetMessage}
              </div>
            )}

            <label style={{ display: 'block', marginBottom: 12 }}>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Correo para recuperación"
                aria-label="Correo para recuperación"
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: resetLoading ? 'var(--color-primary-hover)' : 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: resetLoading ? 'wait' : 'pointer'
                }}
              >
                {resetLoading ? 'Enviando...' : 'Enviar correo'}
              </button>

              <button
                type="button"
                onClick={() => { setResetMode(false); setResetMessage(null); }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Volver
              </button>
            </div>
          </form>
        )}

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>¿No tienes cuenta?</p>
          <button
            onClick={() => navigate('/register')}
            style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            Regístrate
          </button>
        </div>
      </div>
    </div>
  );
}
