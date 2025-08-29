// src/views/pages/ConfirmEmail.tsx
import { useEffect, type JSX } from 'react';
import { supabase } from '../../services/supabase';

export default function ConfirmEmail(): JSX.Element {
  useEffect(() => {
    // variable para poder desuscribir en el cleanup
    let subscription: { unsubscribe?: () => void } | null = null;

    const handle = async () => {
      try {
        const hash = window.location.hash || '';
        const hasTokens = /access_token|refresh_token|type=/.test(hash);

        if (hasTokens) {
          console.log('ConfirmEmail: tokens detectados en el hash — limpiando URL y forzando signOut.');

          // 1) Limpiar el hash de la URL sin recargar.
          const cleanUrl = window.location.pathname + window.location.search;
          try {
            window.history.replaceState(null, document.title, cleanUrl);
            console.log('ConfirmEmail: hash removido de la URL (history.replaceState).');
          } catch (e) {
            console.warn('ConfirmEmail: no se pudo limpiar la URL con replaceState', e);
          }

          // 2) Forzar signOut para evitar sesión automática.
          try {
            await supabase.auth.signOut();
            console.log('ConfirmEmail: signOut solicitado.');
          } catch (e) {
            console.warn('ConfirmEmail: error al solicitar signOut', e);
          }

          // 3) Esperar a que llegue el evento SIGNED_OUT (o timeout).
          // Nota: esto devuelve una Promise<void> — NO la llamamos como función.
          const waitForSignOut: Promise<void> = new Promise((resolve) => {
            // suscribirse a cambios de auth
            const { data } = supabase.auth.onAuthStateChange((event) => {
              console.log('ConfirmEmail: onAuthStateChange ->', event);
              if (event === 'SIGNED_OUT') {
                resolve();
              }
            });

            // Guardamos la suscripción para luego poder desuscribirla.
            // (usamos `any` cast implícito a través de la forma `data?.subscription`)
            // y comprobamos antes de llamar a unsubscribe.
            // @ts-ignore - supabase types a veces son distintas entre versiones
            subscription = data?.subscription ?? null;

            // Fallback si no llega SIGNED_OUT en 1500ms
            setTimeout(() => {
              console.warn('ConfirmEmail: timeout esperando SIGNED_OUT — continuando.');
              resolve();
            }, 1500);
          });

          // <-- IMPORTANT: await the promise, DO NOT call it like a function.
          await waitForSignOut;
          
          // desuscribirse si existe la función unsubscribe
          try {
            if (subscription && typeof subscription.unsubscribe === 'function') {
              subscription.unsubscribe();
            }
          } catch (e) {
            /* noop */
          }
        }
      } catch (err) {
        console.error('ConfirmEmail: error handling confirmation', err);
      } finally {
        // Redirigir al login limpio con flag verified
        const loginUrl = `${window.location.origin}/login?verified=true`;
        console.log('ConfirmEmail: redirigiendo a login limpio ->', loginUrl);
        window.location.replace(loginUrl);
      }
    };

    handle();

    return () => {
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      } catch {
        /* noop */
      }
    };
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
