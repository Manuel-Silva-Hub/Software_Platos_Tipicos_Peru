// src/views/pages/Register.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "../../services/auth";

/**
 * Improved Register page
 * - Requests first name and last name and sends them to Supabase as metadata/display_name
 */

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Ingresa tu nombre y apellido.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Introduce un correo válido.");
      return;
    }
    if (!password || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signError } = await signUp(email.trim(), password, firstName.trim(), lastName.trim());
      if (signError) {
        console.error("Register signUp error:", signError);
        setError(signError.message ?? String(signError));
      } else {
        setSuccess("Registro OK. Revisa tu correo para confirmar la cuenta.");
        // navegar a login tras pequeño delay
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err: any) {
      console.error("Register unexpected error", err);
      setError(err?.message ?? "Error al registrar usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{
        width: 520,
        maxWidth: "96%",
        background: "var(--color-background)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 20,
        boxShadow: "var(--shadow-md)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>Registro</h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              Crea tu cuenta para guardar favoritos y agregar platos.
            </p>
          </div>
          <div>
            <button
              onClick={() => navigate(-1)}
              aria-label="Atrás"
              style={{
                border: '1px solid var(--color-border)',
                background: 'transparent',
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              Atrás
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" style={{ background: '#fff4f4', color: 'var(--color-error)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div role="status" style={{ background: '#ecfdf5', color: 'var(--color-success)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <label style={{ flex: 1 }}>
              <span className="sr-only">Nombre</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre"
                aria-label="Nombre"
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
            </label>

            <label style={{ flex: 1 }}>
              <span className="sr-only">Apellido</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido"
                aria-label="Apellido"
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <span className="sr-only">Correo</span>
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
            <span className="sr-only">Contraseña</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (min 6 caracteres)"
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>¿Ya tienes cuenta?</p>
          <button
            onClick={() => navigate('/login')}
            style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            Inicia sesión
          </button>
        </div>
      </div>
    </div>
  );
}
