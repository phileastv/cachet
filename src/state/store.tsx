import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { localTodayIso, toDay } from '../domain/dates';
import { emptyData } from '../domain/demo';
import type { AppData } from '../domain/types';
import { loadLocal, saveLocal } from './persistence';

interface Store {
  data: AppData;
  today: number;
  update: (fn: (d: AppData) => AppData) => void;
  replace: (d: AppData) => void;
  savedAt: number | null;
  storageOk: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadLocal() ?? emptyData());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const ok = saveLocal(data);
      setStorageOk(ok);
      if (ok) setSavedAt(Date.now());
    }, 300);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    const t = data.settings.theme ?? 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [data.settings.theme]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);
  const today = toDay(data.settings.todayOverride || localTodayIso());

  const value = useMemo(() => ({ data, today, update, replace: setData, savedAt, storageOk }), [data, today, update, savedAt, storageOk]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider manquant');
  return s;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
