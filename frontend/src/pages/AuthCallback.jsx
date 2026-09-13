import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { useToast } from '../components/Toast.jsx';
import { oidcConsume } from '../api/auth.js';

/**
 * SSO return leg: the backend bounced here with ?ticket= (or ?error=).
 * Trades the one-time ticket for the standard HRMS session.
 */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const ticket = params.get('ticket');
      const errParam = params.get('error');
      const detail = params.get('detail');
      if (errParam) {
        setError(`SSO sign-in failed (${errParam})${detail ? `: ${detail}` : ''}.`);
        return;
      }
      if (!ticket) {
        setError('Missing SSO ticket.');
        return;
      }
      try {
        const data = await oidcConsume(ticket);
        if (cancelled) return;
        localStorage.setItem('auth', JSON.stringify({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          passwordAgeDays: data.passwordAgeDays,
          passwordExpired: data.passwordExpired,
        }));
        useAuthStore.setState({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          passwordAgeDays: data.passwordAgeDays,
          passwordExpired: data.passwordExpired,
        });
        toast('Signed in with SSO', 'success');
        navigate('/dashboard', { replace: true });
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error?.message || 'SSO sign-in failed.');
      }
    })();
    return () => { cancelled = true; };
  }, [params, navigate, toast]);

  return (
    <div className="min-h-screen bg-bg grid place-items-center p-6">
      <div className="card p-8 max-w-sm w-full text-center">
        <p className="mono-label mb-3">Single sign-on</p>
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold text-ink">Sign-in failed</h1>
            <p role="alert" className="text-sm text-error mt-2">{error}</p>
            <button type="button" className="btn btn-primary w-full mt-5" onClick={() => navigate('/', { replace: true })}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <span className="inline-block w-6 h-6 rounded-full border-2 border-accent/40 border-t-accent animate-spin" aria-hidden="true" />
            <h1 className="font-display text-xl font-bold text-ink mt-3">Completing sign-in…</h1>
            <p className="text-sm text-muted mt-1">Verifying with your identity provider.</p>
          </>
        )}
      </div>
    </div>
  );
}
