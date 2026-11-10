import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';

/**
 * Carga datos con POST y maneja estados de carga / error / recarga.
 * Se vuelve a pedir cada vez que la pantalla gana foco.
 */
export function useApi(path, body = {}, { auto = true } = {}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(auto);
  const [refreshing, setRefreshing] = useState(false);
  const key = JSON.stringify(body);
  const first = useRef(true);

  const load = useCallback(
    async (mode: 'load' | 'refresh' | 'poll' = 'load') => {
      if (mode === 'refresh') setRefreshing(true);
      else if (first.current) setLoading(true);
      try {
        const d = await api(path, JSON.parse(key));
        setData(d);
        setError(null);
        return d;
      } catch (e) {
        // Las actualizaciones automáticas (mode 'poll') no tapan la pantalla si falla una sola vez
        if (mode !== 'poll') setError(e);
        return null;
      } finally {
        first.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path, key]
  );

  useFocusEffect(
    useCallback(() => {
      if (auto) load();
    }, [load, auto])
  );

  useEffect(() => {
    first.current = true;
  }, [key]);

  return { data, setData, error, loading, refreshing, reload: load, refresh: () => load('refresh') };
}

/** Ejecuta una acción (crear/editar/eliminar) con estado de envío y errores por campo. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<any>(null);

  const run = useCallback(async (path, body) => {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      return await api(path, body);
    } catch (e) {
      setFieldErrors(e.fields || {});
      setFormError(e);
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  return { run, busy, fieldErrors, setFieldErrors, formError, setFormError };
}