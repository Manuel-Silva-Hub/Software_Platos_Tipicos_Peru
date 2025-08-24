// src/views/pages/ConfirmEmail.tsx
import React, { useEffect } from 'react';
import { supabase } from '../../services/supabase';

export default function ConfirmEmail() {
  useEffect(() => {
    const handle = async () => {
      try {
        const hash = window.location.hash || '';
        const hasTokens = /access_token|refresh_token|type=/.test(hash);

        if (hasTokens) {
          // Si Supabase dejó tokens en la URL, es posible que haya creado sesión automáticamente.
          // Forzamos signOut para borrar esa sesión automática y evitar entrar directo al Home.
          try {
            await supabase.auth.signOut();
            console.log('ConfirmEmail: sesión automática borrada (si existía).');
          } catch (e) {
            console.warn('ConfirmEmail: error al cerrar sesión automática', e);
          }
        }
      } catch (err) {
        console.error('ConfirmEmail: error handling confirmation', err);
      } finally {
        // Reemplazamos la URL (limpiando hashes/params) y enviamos al login con la flag verified
        const clean = `${window.location.origin}/login?verified=true`;
        // use replace para no dejar el hash en historial
        window.location.replace(clean);
      }
    };

    handle();
  }, []);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Confirmando tu correo...</h2>
        <p>Un momento, te redirigiremos al login para que ingreses tus credenciales.</p>
      </div>
    </div>
  );
}
