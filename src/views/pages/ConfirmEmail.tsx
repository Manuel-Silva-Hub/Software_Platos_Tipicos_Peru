// src/views/pages/ConfirmEmail.tsx
import { useEffect } from 'react';
import { supabase } from '../../services/supabase';

/**
This React component handles the email confirmation flow after
the user clicks the link sent via email (e.g., from Supabase).
While the logic is running, it displays a centered container with a message:
"Confirming your email..." and a notice that you will be redirected to login.
*/
export default function ConfirmEmail() {
  useEffect(() => {
    const handle = async () => {
      try {
        const hash = window.location.hash || '';
        const hasTokens = /access_token|refresh_token|type=/.test(hash);

        if (hasTokens) {
          // If Supabase left tokens in the URL, it may have automatically created a session.
          // We force signout to clear that automatic session and prevent direct access to the home page.
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
        // We replace the URL (cleaning hashes/params) and send it to the login with the verified flag
        const clean = `https://platostipicosperu.netlify.app//login?verified=true`;
        // use replace to not leave the hash in history
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
