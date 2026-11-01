import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, FileDown, HeartHandshake, MapPin, ShieldCheck, Stethoscope, Truck, Users } from 'lucide-react';
import { Chip, Counter, EmptyState, Meter, NotConnected, Panel, Reveal, Stat } from '@/components/ui-kit';
import { PageHead, Workspace, type WorkspaceNavItem } from '@/components/workspace';
import { useSession } from '@/lib/session';
import { useSync } from '@/lib/sync';
import { VILLAGES, cn } from '@/lib/utils';
import { describeApiError, getAdminAnalytics, getApiHealth, type ApiHealth } from '@/lib/api';

type Analytics = Awaited<ReturnType<typeof getAdminAnalytics>>;

const nav: WorkspaceNavItem[] = [
  { to: '/admin', label: 'Network pulse', icon: Activity, end: true },
  { to: '/admin/villages', label: 'Villages', icon: MapPin },
  { to: '/admin/resources', label: 'Resources', icon: Truck },
  { to: '/admin/reports', label: 'Reports', icon: FileDown },
];

export function AdminWorkspace() {
  return <Workspace role="admin" workspaceName="District admin" brief="Aggregated, never individual" nav={nav} />;
}

function useAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getAdminAnalytics()
      .then((rows) => { if (active) setAnalytics(rows); })
      .catch((error) => toast.error('Analytics did not load', { description: describeApiError(error) }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { analytics, loading };
}

export function AdminOverview() {
  const { analytics, loading } = useAnalytics();
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const { queued, online } = useSync();
  const maxVillage = Math.max(1, ...(analytics?.villages.map((v) => v.patients) ?? [1]));

  useEffect(() => {
    getApiHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const chart = (analytics?.topConditions ?? []).map((row) => ({ name: row.name, cases: row.count }));

  return (
    <>
      <PageHead
        title="District network pulse"
        lede="Counts across the sampled communities. This screen is built so that no individual can be read out of it."
        actions={<Chip tone="good"><ShieldCheck className="h-3.5 w-3.5" /> Aggregated view</Chip>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="role" label="People on file" value={loading ? '…' : <Counter value={analytics?.totalPatients ?? 0} />} hint="Synthetic sample records" icon={<Users className="h-4 w-4" />} />
        <Stat label="Encounters today" value={loading ? '…' : <Counter value={analytics?.encountersToday ?? 0} />} hint="Imported same-day visits" icon={<Stethoscope className="h-4 w-4" />} />
        <Stat label="Communities" value={<Counter value={VILLAGES.length} />} hint="Configured in the importer" icon={<MapPin className="h-4 w-4" />} />
        <Stat
          tone={queued > 0 ? 'queued' : 'synced'}
          label="Records waiting"
          value={<Counter value={queued} />}
          hint={online ? 'Dispatching to the server' : 'Held on this device'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Reveal>
          <Panel eyebrow="Condition groups" title="What the sample reports" note="Counts are grouped by condition and community. Any group under five people is suppressed by the server before it reaches this page.">
            {chart.length === 0 ? (
              <p className="py-8 text-[14px] text-muted-foreground">{loading ? 'Loading condition groups…' : 'No aggregated condition groups are available yet.'}</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'hsl(25 64% 33% / 0.06)' }}
                      contentStyle={{ borderRadius: 10, border: '1px solid hsl(100 9% 87%)', fontSize: 13, fontFamily: 'Satoshi' }}
                    />
                    <Bar dataKey="cases" radius={[0, 6, 6, 0]} barSize={22}>
                      {chart.map((entry, index) => (
                        <Cell key={entry.name} fill={index === 0 ? 'hsl(25 64% 33%)' : 'hsl(25 64% 33% / 0.45)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </Reveal>

        <div className="space-y-6">
          <Panel eyebrow="Community load" title="People per community">
            <ul className="space-y-4">
              {(analytics?.villages ?? []).slice(0, 5).map((village) => (
                <li key={`${village.name}-${village.district}`}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-medium">{village.name}</span>
                    <span className="font-mono text-[13px] text-muted-foreground"><Counter value={village.patients} /></span>
                  </div>
                  <Meter value={(village.patients / maxVillage) * 100} />
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{village.district} district</p>
                </li>
              ))}
              {analytics?.villages.length === 0 && !loading && <p className="text-[14px] text-muted-foreground">Run the Synthea import to populate communities.</p>}
            </ul>
          </Panel>

          <Panel eyebrow="Live services" title="Server check">
            <ul className="space-y-3 text-[14px]">
              <li className="flex items-center justify-between gap-3 border-b pb-3">
                <span>API reachable</span>
                <Chip tone={health ? 'good' : 'bad'}>{health ? 'yes' : 'no'}</Chip>
              </li>
              <li className="flex items-center justify-between gap-3 border-b pb-3">
                <span>Database</span>
                <Chip tone={health?.database === 'connected' ? 'good' : 'warn'}>{health?.database ?? 'unknown'}</Chip>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Appointments on file</span>
                <span className="font-mono">{health?.data?.appointments?.toLocaleString('en-IN') ?? '—'}</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function AdminVillages() {
  const { analytics, loading } = useAnalytics();
  const [district, setDistrict] = useState('all');
  const villages = useMemo(() => analytics?.villages ?? [], [analytics]);
  const districts = useMemo(() => Array.from(new Set(villages.map((v) => v.district))), [villages]);
  const rows = district === 'all' ? villages : villages.filter((v) => v.district === district);

  return (
    <>
      <PageHead
        title="Village network"
        lede="Community-level counts only. A village row never lists the people behind the number."
        actions={
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="h-11 w-48 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              {districts.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Panel eyebrow={`${rows.length} communities`} title="Recorded population and visits">
        {loading ? (
          <p className="py-8 text-[14px] text-muted-foreground">Loading communities…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="No communities in this scope" body="Import the sample data or widen the district filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="sr-only">Village, district, patients and recorded visits</caption>
              <thead>
                <tr className="border-b">
                  {['Community', 'District', 'People', 'Recorded visits', 'Share'].map((heading) => (
                    <th key={heading} scope="col" className="label pb-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((village) => (
                  <tr key={`${village.name}-${village.district}`} className="border-b last:border-0">
                    <td className="py-4 font-medium">{village.name}</td>
                    <td className="py-4 text-muted-foreground">{village.district}</td>
                    <td className="py-4 font-mono">{village.patients.toLocaleString('en-IN')}</td>
                    <td className="py-4 font-mono">{village.visits.toLocaleString('en-IN')}</td>
                    <td className="w-40 py-4"><Meter value={(village.patients / Math.max(1, rows[0].patients)) * 100} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-5 border-t pt-4 text-[13px] text-muted-foreground">
          Patients and visits come from the imported sample only, so they describe the test dataset, not Uttarakhand.
        </p>
      </Panel>
    </>
  );
}

export function AdminResources() {
  return (
    <>
      <PageHead
        title="Resources"
        lede="What the platform can actually see about staff, vehicles and supply, as opposed to what a dashboard would like to see."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Connected" title="In this build">
          <ul className="space-y-4">
            {[
              { label: 'Patient and appointment records', detail: 'Written and read through the API with an audit row per change.', ok: true },
              { label: 'Pharmacy stock entries', detail: 'Typed by the pharmacy, published to the patient medicine catalog.', ok: true },
              { label: 'Aggregated condition counts', detail: 'Grouped by community, small groups suppressed server-side.', ok: true },
            ].map((entry) => (
              <li key={entry.label} className="flex gap-3 rounded-lg border p-4">
                <Chip tone={entry.ok ? 'good' : 'warn'}>{entry.ok ? 'live' : 'partial'}</Chip>
                <span>
                  <span className="block text-[15px] font-medium">{entry.label}</span>
                  <span className="block mt-1 text-[13px] leading-relaxed text-muted-foreground">{entry.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel eyebrow="Not connected" title="Feeds a real district would add">
            <div className="space-y-4">
              <NotConnected>
                <strong className="text-foreground">Staffing.</strong> No block health officer roster is attached, so vacant posts cannot be counted.
              </NotConnected>
              <NotConnected>
                <strong className="text-foreground">Ambulance availability.</strong> The vehicle fleet sits with the state 108 service and is not exposed to this platform.
              </NotConnected>
              <NotConnected>
                <strong className="text-foreground">Supply planning.</strong> Wholesale orders and cold-chain stock are not integrated, so stock-out risk cannot be forecast.
              </NotConnected>
            </div>
          </Panel>

          <Panel eyebrow="Reach support" title="Who to ask instead">
            <p className="text-[15px] leading-relaxed">
              Staff and vehicle questions move through the district hospital to the block medical officer.
              GramHealth records the clinical contact; it does not run the logistics side of the district.
            </p>
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-muted p-4">
              <HeartHandshake className="h-5 w-5 shrink-0 text-role" />
              <span className="text-[14px]">The ASHA and ANM network is the route these numbers would travel.</span>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

const reportTypes = [
  { value: 'network', label: 'Network pulse' },
  { value: 'villages', label: 'Community counts' },
  { value: 'conditions', label: 'Aggregated conditions' },
];

export function AdminReports() {
  const { analytics } = useAnalytics();
  const [type, setType] = useState('network');
  const [scope, setScope] = useState('all');
  const villages = analytics?.villages ?? [];
  const rows = scope === 'all' ? villages : villages.filter((v) => v.name === scope);

  const download = () => {
    if (!analytics) {
      toast.error('Nothing to export yet', { description: 'The analytics endpoint has not returned data.' });
      return;
    }
    const payload = {
      report: reportTypes.find((entry) => entry.value === type)?.label ?? type,
      scope,
      generatedAt: new Date().toISOString(),
      source: 'synthea-1k-sample',
      totals: { people: analytics.totalPatients, encountersToday: analytics.encountersToday },
      communities: rows,
      conditions: type === 'conditions' || type === 'network' ? analytics.topConditions : [],
      note: 'Synthetic engineering sample. Not evidence about real disease burden.',
    };
    const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = `gramhealth-${type}-report.json`;
    link.click();
    URL.revokeObjectURL(href);
    toast.success('Report downloaded', { description: 'Aggregated counts with the synthetic-data caveat attached.' });
  };

  return (
    <>
      <PageHead title="Reports" lede="Export the aggregated numbers you can see on screen, with the caveats that go with them." />

      <Panel eyebrow="Export centre" title="Build a report" className="max-w-3xl">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label mb-2 block">Report</span>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {reportTypes.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="label mb-2 block">Community</span>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All communities</SelectItem>
                {villages.map((village) => (
                  <SelectItem key={village.name} value={village.name}>{village.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className={cn('mt-6 rounded-lg border p-4 text-[14px]', 'bg-muted/60')}>
          <p className="label mb-2">In this file</p>
          <p className="leading-relaxed text-muted-foreground">
            {rows.length} communit{rows.length === 1 ? 'y' : 'ies'} · {rows.reduce((total, row) => total + row.patients, 0).toLocaleString('en-IN')} people ·{' '}
            {type === 'villages' ? 'no condition breakdown' : `${analytics?.topConditions.length ?? 0} aggregated condition groups`}
          </p>
        </div>

        <Button size="lg" onClick={download} className="mt-6 bg-role text-white hover:bg-role/90">
          <FileDown /> Download report
        </Button>
      </Panel>
    </>
  );
}
