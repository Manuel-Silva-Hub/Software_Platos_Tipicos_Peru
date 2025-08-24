import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../services/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Obtener la ruta de donde vino el usuario (si existe)
  const from = (location.state as any)?.from || '/home';
  
  // Estado para mostrar mensaje de usuario registrado (desde state)
  const [showRegistrationMessage, setShowRegistrationMessage] = useState(false);

  // Detectar query param ?verified=true (cuando el usuario confirma su correo)
  const params = new URLSearchParams(location.search);
  const verified = params.get('verified');

  // Verificar si viene desde registro (state) — mantiene tu comportamiento actual
  useEffect(() => {
    const registrationSuccess = (location.state as any)?.registrationSuccess;
    if (registrationSuccess) {
      setShowRegistrationMessage(true);
      // Limpiar el estado después de 5 segundos
      setTimeout(() => setShowRegistrationMessage(false), 5000);
    }
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password reset state
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // 🔹 Efecto único para manejar redirección cuando el usuario está autenticado
  // SOLO desde el formulario de login, no desde confirmación de email
  useEffect(() => {
    if (!authLoading && user && !resetMode) {
      console.log('Login: Usuario autenticado via login, redirigiendo a Home');
      navigate(from, { replace: true });
    }
  }, [authLoading, user, navigate, from, resetMode]);

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

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
        // La redirección se manejará en el useEffect cuando cambie el estado
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
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin + '/login'
      });
      if (resetErr) {
        console.error('Reset error', resetErr);
        setResetMessage(resetErr.message ?? 'No se pudo enviar el correo de recuperación.');
      } else {
        setResetMessage('Correo de recuperación enviado. Revisa tu bandeja (y spam).');
      }
    } catch (e: any) {
      console.error('Unexpected reset error', e);
      setResetMessage('Ocurrió un error al solicitar recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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

        {/* Banner cuando el user confirmó el correo haciendo click en el link del email */}
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

        {/* Login Form */}
        {!resetMode ? (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
            </label>

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
                  onChange={(e) => setRemember(e.target.checked)}
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
          // Reset password UI
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
