import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { VILLAGES } from '@/lib/utils';

export type SyncStatus = 'queued' | 'syncing' | 'synced';

export interface SyncRecord {
  id: string;
  kind: string;
  village: string;
  district: string;
  status: SyncStatus;
  addedAt: number;
}

interface SyncContextValue {
  /** Whether the platform currently believes it can reach the district server. */
  online: boolean;
  /** True when the offline state was set by hand rather than reported by the browser. */
  simulated: boolean;
  records: SyncRecord[];
  queued: number;
  synced: number;
  goOffline: () => void;
  goOnline: () => void;
  toggle: () => void;
  /** Push one new record into the ledger, exactly as an offline save would. */
  enqueue: (kind: string) => void;
}

const KINDS = [
  'Encounter · fever follow-up',
  'Prescription · amlodipine 5 mg',
  'Vaccination · measles dose 1',
  'Stock count · paracetamol 500 mg',
  'Referral · district hospital',
  'Antenatal check · 28 weeks',
];

const SyncContext = createContext<SyncContextValue | null>(null);

let sequence = 0;
const nextId = () => `REC-${String(++sequence + 4100).padStart(4, '0')}`;

function makeRecord(kind: string, status: SyncStatus): SyncRecord {
  const place = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
  return { id: nextId(), kind, village: place.name, district: place.district, status, addedAt: Date.now() };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [simulated, setSimulated] = useState(false);
  const [records, setRecords] = useState<SyncRecord[]>(() =>
    Array.from({ length: 5 }, (_, i) => makeRecord(KINDS[i % KINDS.length], i === 4 ? 'queued' : 'synced')),
  );
  const drainTimer = useRef<number | null>(null);
  const arriveTimer = useRef<number | null>(null);

  const enqueue = useCallback((kind: string) => {
    setRecords((current) => [makeRecord(kind, 'queued'), ...current].slice(0, 24));
  }, []);

  // The browser is the honest source for a real disconnect; the buttons add a demo one.
  useEffect(() => {
    const up = () => { setOnline(true); setSimulated(false); };
    const down = () => { setOnline(false); setSimulated(false); };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // One record leaves for the district server at a time, oldest first.
  useEffect(() => {
    if (!online) return;
    drainTimer.current = window.setInterval(() => {
      setRecords((current) => {
        const oldest = [...current].reverse().find((record) => record.status === 'queued');
        if (!oldest) return current;
        const promoted = current.map((record) => (record.id === oldest.id ? { ...record, status: 'syncing' as SyncStatus } : record));
        window.setTimeout(() => {
          setRecords((latest) => latest.map((record) => (record.id === oldest.id ? { ...record, status: 'synced' as SyncStatus } : record)));
        }, 620);
        return promoted;
      });
    }, 1400);
    return () => { if (drainTimer.current) window.clearInterval(drainTimer.current); };
  }, [online]);

  // Care keeps happening offline, so the queue grows whether or not there is a signal.
  useEffect(() => {
    arriveTimer.current = window.setInterval(() => {
      enqueue(KINDS[Math.floor(Math.random() * KINDS.length)]);
    }, 7000);
    return () => { if (arriveTimer.current) window.clearInterval(arriveTimer.current); };
  }, [enqueue]);

  const goOffline = useCallback(() => { setOnline(false); setSimulated(true); }, []);
  const goOnline = useCallback(() => { setOnline(true); setSimulated(false); }, []);
  const toggle = useCallback(() => {
    setOnline((current) => { setSimulated(true); return !current; });
  }, []);

  const value = useMemo(() => {
    const queued = records.filter((record) => record.status !== 'synced').length;
    const synced = records.filter((record) => record.status === 'synced').length;
    return { online, simulated, records, queued, synced, goOffline, goOnline, toggle, enqueue };
  }, [online, simulated, records, goOffline, goOnline, toggle, enqueue]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside SyncProvider');
  return context;
}
