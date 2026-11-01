import { VILLAGES } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Counter } from '@/components/ui-kit';
import { useSync, type SyncRecord } from '@/lib/sync';
import { ArrowUpRight, Radio, WifiOff } from 'lucide-react';

const NODE_X = 118;
const DEST_X = 402;
const rowY = (index: number) => 34 + index * 54;
const link = (index: number) => `M ${NODE_X + 12} ${rowY(index)} C 210 ${rowY(index)}, 268 151, ${DEST_X - 16} 151`;

const statusTone: Record<SyncRecord['status'], string> = {
  queued: 'text-queued',
  syncing: 'text-[hsl(36_90%_70%)]',
  synced: 'text-synced',
};

/**
 * The concept made visible: one connection state, and every element of the drawing driven from
 * it. Cutting the network does not blank the screen, it moves work into the queue.
 */
export function SyncLedger({ compact = false }: { compact?: boolean }) {
  const { online, simulated, records, queued, synced, toggle, enqueue } = useSync();
  const latest = records.slice(0, compact ? 3 : 6);

  return (
    <section className={cn('band overflow-hidden rounded-[var(--radius-panel)]', compact ? 'p-5' : 'p-6 sm:p-8')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label mb-2 text-white/45">Sync ledger</p>
          <h2 className="display text-[26px] leading-tight sm:text-[32px]">
            {online ? 'Connected to the district server' : 'Working offline, holding records locally'}
          </h2>
        </div>
        <span className="chip bg-white/10 text-white/70">
          <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-synced beacon' : 'bg-queued')} />
          {online ? 'dispatching' : 'held on device'}
        </span>
      </div>

      <div className={cn('grid gap-8', compact ? 'mt-6' : 'mt-8 lg:mt-10', 'lg:grid-cols-[1.05fr_1fr]')}>
        <svg viewBox="0 0 480 300" className="w-full" role="img" aria-label={`Five village nodes and the district server. ${queued} records waiting, ${synced} dispatched.`}>
          <title>Village nodes dispatching records to the district server</title>
          {VILLAGES.map((village, index) => (
            <g key={village.name}>
              <path
                d={link(index)}
                fill="none"
                strokeWidth={online ? 1.4 : 1}
                strokeLinecap="round"
                className={cn(online && 'flow')}
                stroke={online ? 'hsl(154 57% 60%)' : 'hsl(80 10% 94% / 0.14)'}
                strokeDasharray={online ? undefined : '3 8'}
                opacity={online ? 0.75 : 1}
                style={{ animationDelay: `${index * 0.16}s` }}
              />
              <circle cx={NODE_X} cy={rowY(index)} r={5} fill={online ? 'hsl(154 57% 60%)' : 'hsl(36 83% 46%)'} className={online ? undefined : 'beacon'} style={{ animationDelay: `${index * 0.2}s` }} />
              <text x={NODE_X - 20} y={rowY(index) + 4} textAnchor="end" className="fill-white/70" style={{ font: '500 12px "JetBrains Mono", monospace' }}>
                {village.name}
              </text>
            </g>
          ))}

          <g transform={`translate(${DEST_X} 151)`}>
            <circle r="26" fill="none" stroke={online ? 'hsl(154 57% 60% / 0.35)' : 'hsl(80 10% 94% / 0.15)'} strokeWidth="1" />
            <circle r="38" fill="none" stroke={online ? 'hsl(154 57% 60% / 0.14)' : 'transparent'} strokeWidth="1" className={online ? 'beacon' : undefined} />
            <rect x="-11" y="-11" width="22" height="22" rx="5" fill={online ? 'hsl(154 57% 60%)' : 'hsl(36 83% 46%)'} />
            <path d="M-5 0h10M0 -5v10" stroke="hsl(158 21% 8%)" strokeWidth="2.4" strokeLinecap="round" />
            <text x="0" y="58" textAnchor="middle" className="fill-white/70" style={{ font: '500 11px "JetBrains Mono", monospace' }}>
              district server
            </text>
          </g>
        </svg>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/10">
            {[
              { label: 'queued', value: queued, tone: 'text-queued' },
              { label: 'synced', value: synced, tone: 'text-synced' },
              { label: 'villages', value: VILLAGES.length, tone: 'text-white' },
            ].map((cell) => (
              <div key={cell.label} className="bg-ink px-3 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">{cell.label}</p>
                <p className={cn('display mt-2 text-[28px] leading-none', cell.tone)} aria-live="polite">
                  <Counter value={cell.value} />
                </p>
              </div>
            ))}
          </div>

          <ul className="hairline-grid divide-white/10 border-y border-white/10">
            {latest.map((record) => (
              <li key={record.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                <span className="font-mono text-[11px] text-white/40">{record.id}</span>
                <span className="min-w-0 flex-1 truncate text-white/85">{record.kind}</span>
                <span className={cn('font-mono text-[10px] uppercase tracking-[0.1em]', statusTone[record.status])}>{record.status}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggle}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-medium transition',
                online ? 'bg-queued text-ink hover:bg-queued/90' : 'bg-synced text-ink hover:bg-synced/90',
              )}
              aria-pressed={!online}
            >
              {online ? <WifiOff className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              {online ? 'Cut the network' : 'Reconnect and dispatch'}
            </button>
            <button
              onClick={() => enqueue('Encounter · new village visit')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-[14px] font-medium text-white/80 transition hover:bg-white hover:text-ink"
            >
              Save a record <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[12px] leading-relaxed text-white/45">
            {simulated
              ? 'Simulated disconnect. Records shown here are a demonstration queue: the on-device store that survives a real shutdown is not wired up in this build.'
              : 'Browser reports a live connection. Cut it with the button above, or switch off your machine, to see the queue take over.'}
          </p>
        </div>
      </div>
    </section>
  );
}

/** The same driver, reduced to a strip, fixed into every workspace header. */
export function SyncRail() {
  const { online, queued, toggle } = useSync();
  return (
    <button
      onClick={toggle}
      className="group inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition hover:border-role/50 hover:bg-muted/60"
      aria-pressed={!online}
      aria-label={online ? `Connection online, ${queued} records queued. Simulate losing the connection.` : `Offline, ${queued} records held on device. Restore the connection.`}
      title="Simulate losing the connection"
    >
      <span className={cn('h-2 w-2 rounded-full', online ? 'bg-synced beacon' : 'bg-queued')} />
      <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
      <span className="font-mono text-muted-foreground" aria-live="polite">
        {queued === 0 ? 'clear' : `${queued} queued`}
      </span>
    </button>
  );
}
