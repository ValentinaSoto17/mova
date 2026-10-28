import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, publicApi, tokens, setSessionLostHandler, refreshAccess } from '../api/client';
import { scheduleReminders, clearReminders } from '../utils/reminders';

const AuthContext = createContext(null);

/**
 * Sesión global (Context API) con persistencia: los tokens quedan guardados de forma
 * segura y al abrir la app se restaura la sesión con el refresh token.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | guest | authed
  const [user, setUser] = useState(null);
  const [blocked, setBlocked] = useState(null); // datos del bloqueo para la pantalla instructiva

  const finishSession = useCallback(async (data) => {
    await tokens.save(data.accessToken, data.refreshToken);
    setUser(data.user);
    setBlocked(null);
    setStatus('authed');
    scheduleReminders().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await tokens.getRefresh();
    publicApi('/auth/logout', { refreshToken }).catch(() => {});
    await tokens.clear();
    clearReminders().catch(() => {});
    setUser(null);
    setStatus('guest');
  }, []);

  // Restaurar sesión al iniciar
  useEffect(() => {
    (async () => {
      const { refreshToken } = await tokens.load();
      if (!refreshToken) return setStatus('guest');
      try {
        const data = await refreshAccess();
        setUser(data.user);
        setStatus('authed');
      } catch (err) {
        if (err.code === 'ACCOUNT_BLOCKED') setBlocked(err.block);
        if (err.code === 'NETWORK' || err.code === 'TIMEOUT') {
          // Sin conexión: se mantiene la sesión guardada y se reintenta luego
          const me = await api('/auth/me').catch(() => null);
          if (me) {
            setUser(me);
            return setStatus('authed');
          }
        }
        await tokens.clear();
        setStatus('guest');
      }
    })();
  }, []);

  useEffect(() => {
    setSessionLostHandler(async (err) => {
      if (err?.code === 'ACCOUNT_BLOCKED') setBlocked(err.block || { motivo: 'Cuenta bloqueada' });
      await tokens.clear();
      setUser(null);
      setStatus('guest');
    });
  }, []);

  /** Resultado: { done:true } o { step:'verify_email'|'two_factor', pendingToken, email, devCode } */
  const handleAuthResponse = useCallback(
    async (data) => {
      if (data.accessToken) {
        await finishSession(data);
        return { done: true };
      }
      return data;
    },
    [finishSession]
  );

  const value = useMemo(
    () => ({
      status,
      user,
      blocked,
      clearBlocked: () => setBlocked(null),
      setUser,
      async login(email, password) {
        try {
          return await handleAuthResponse(await publicApi('/auth/login', { email, password }));
        } catch (err) {
          if (err.code === 'ACCOUNT_BLOCKED') setBlocked(err.block);
          throw err;
        }
      },
      async register(form) {
        return handleAuthResponse(await publicApi('/auth/register', form));
      },
      async verify(purpose, pendingToken, code) {
        const path = purpose === 'two_factor' ? '/auth/verify-2fa' : '/auth/verify-email';
        try {
          return await handleAuthResponse(await publicApi(path, { pendingToken, code }));
        } catch (err) {
          if (err.code === 'ACCOUNT_BLOCKED') setBlocked(err.block);
          throw err;
        }
      },
      resend: (purpose, pendingToken) => publicApi('/auth/resend-code', { purpose, pendingToken }),
      async social(payload) {
        try {
          return await handleAuthResponse(await publicApi('/auth/social', payload));
        } catch (err) {
          if (err.code === 'ACCOUNT_BLOCKED') setBlocked(err.block);
          throw err;
        }
      },
      async refreshUser() {
        const me = await api('/auth/me');
        setUser(me);
        return me;
      },
      logout,
    }),
    [status, user, blocked, handleAuthResponse, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
