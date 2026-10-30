import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getFromStorage } from '@/lib/utils';
import { getAdminAnalytics } from '@/lib/api';
import { PortalShell, Panel, Stat, Pill } from '@/components/portal';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Users, AlertTriangle, TrendingUp, MapPin, FileDown, ShieldCheck, Stethoscope } from 'lucide-react';

export default function AdminPortal({ onLogout }: { onLogout: () => void }) {
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [reportType, setReportType] = useState('health');
  const [analytics,setAnalytics]=useState<Awaited<ReturnType<typeof getAdminAnalytics>>|null>(null);
  useEffect(()=>{getAdminAnalytics().then(setAnalytics).catch(()=>toast.error('Could not load analytics'));},[]);
  const userMobile = (getFromStorage('userMobile') as string) || '9876543210';
  const actualVillages=analytics?.villages ?? [];
  const rows = selectedVillage === 'all' ? actualVillages : actualVillages.filter((v) => v.name === selectedVillage);
  const generateReport = () => {
    const payload = { type: reportType, scope: selectedVillage, generatedAt: new Date().toISOString(), villages: rows };
    const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = `${reportType}-report.json`;
    link.click();
    URL.revokeObjectURL(href);
    toast.success('Report downloaded');
  };
  return (
    <PortalShell role="admin" portalName="Network command" title={<>Good morning, <em>Administrator.</em></>} subtitle={`Operations overview · Signed in as administrator #${userMobile}`} user={`Admin ${userMobile.slice(-4)}`} defaultValue="overview" onLogout={onLogout} nav={[
      { value: 'overview', label: 'Overview', icon: Activity }, { value: 'villages', label: 'Village network', icon: MapPin }, { value: 'resources', label: 'Resources', icon: Users }, { value: 'reports', label: 'Reports', icon: FileDown },
    ]} headerExtra={<Pill tone="good"><ShieldCheck className="h-3.5 w-3.5" /> Network operational</Pill>}>
      <TabsContent value="overview" className="mt-0 space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat accent label="People registered" value={analytics?.totalPatients ?? '…'} hint="Synthetic records" icon={Users} />
          <Stat label="Consultations today" value={analytics?.encountersToday ?? '…'} hint="Imported encounters" icon={Stethoscope} />
          <Stat label="Needs attention" value="—" hint="No live triage feed" icon={AlertTriangle} />
          <Stat label="Village coverage" value={analytics?.villages.length ?? '…'} hint="Configured communities" icon={TrendingUp} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel eyebrow="Field operations" title="Village network" action={<Button variant="outline" size="sm" onClick={() => document.querySelector('[data-value="villages"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>All villages <MapPin /></Button>}>
            <div className="divide-y">{actualVillages.slice(0, 3).map((v) => <div key={v.name} className="flex items-center gap-4 py-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-role/10 text-role"><MapPin className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="font-medium">{v.name}</p><p className="text-sm text-muted-foreground">{v.district} district · {v.patients} synthetic patients</p></div></div>)}</div>
          </Panel>
          <Panel eyebrow="Prototype status" title="Resource availability"><p className="text-sm leading-relaxed text-muted-foreground">Live staff, ambulance, and pharmacy resource feeds are not connected yet. Inventory entered by a pharmacy is available in the patient medicine catalog.</p></Panel>
        </div>
        <Panel eyebrow="Regional pulse" title="Aggregated conditions"><div className="grid gap-4 sm:grid-cols-3">{(analytics?.topConditions??[]).slice(0,3).map((condition)=><div key={condition.name} className="rounded-2xl bg-muted/60 p-5"><p className="eyebrow">Condition group</p><p className="mt-3 font-display text-xl">{condition.name}</p><p className="mt-1 text-sm text-muted-foreground">{condition.count} aggregated cases</p></div>)}</div></Panel>
      </TabsContent>
      <TabsContent value="villages" className="mt-0"><Panel eyebrow="Regional directory" title="Village health network"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-widest text-muted-foreground"><th className="pb-4 font-medium">Community</th><th className="pb-4 font-medium">District</th><th className="pb-4 font-medium">Synthetic patients</th><th className="pb-4 font-medium">Recorded visits</th></tr></thead><tbody>{actualVillages.map((v) => <tr key={v.name} className="border-b last:border-0"><td className="py-5 font-medium">{v.name}</td><td className="py-5">{v.district}</td><td className="py-5">{v.patients}</td><td className="py-5">{v.visits}</td></tr>)}</tbody></table></div></Panel></TabsContent>
      <TabsContent value="resources" className="mt-0"><Panel eyebrow="Connections" title="Operational feeds"><p className="text-sm leading-relaxed text-muted-foreground">Staffing, ambulance dispatch, and supply planning feeds are not configured. Pharmacy inventory is connected; other resource metrics are not shown as live data.</p></Panel></TabsContent>
      <TabsContent value="reports" className="mt-0"><Panel eyebrow="Export centre" title="Generate a field report"><p className="mb-8 max-w-lg text-muted-foreground">Download a snapshot of imported synthetic community data.</p><div className="grid max-w-2xl gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Report type<Select value={reportType} onValueChange={setReportType}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="health">Community health</SelectItem><SelectItem value="resources">Resource availability</SelectItem><SelectItem value="operations">Field operations</SelectItem></SelectContent></Select></label><label className="space-y-2 text-sm font-medium">Coverage area<Select value={selectedVillage} onValueChange={setSelectedVillage}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All communities</SelectItem>{actualVillages.map((v) => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent></Select></label></div><Button className="mt-6 bg-role hover:bg-role/90" onClick={generateReport}>Download report <FileDown /></Button></Panel></TabsContent>
    </PortalShell>
  );
}
