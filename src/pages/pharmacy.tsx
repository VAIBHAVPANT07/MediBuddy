import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle, Boxes, FileDown, IndianRupee, PackagePlus, Search, Store, TrendingDown, Wallet } from 'lucide-react';
import { Chip, Counter, EmptyState, Meter, NotConnected, Panel, Stat } from '@/components/ui-kit';
import { PageHead, Workspace, type WorkspaceNavItem } from '@/components/workspace';
import { useSync } from '@/lib/sync';
import { cn } from '@/lib/utils';
import { createPharmacyMedicine, describeApiError, getPharmacyInventory, type PharmacyMedicine } from '@/lib/api';

interface PharmacyData {
  medicines: PharmacyMedicine[];
  loading: boolean;
  add: (draft: { name: string; category: string; price: number; stock: number }) => Promise<boolean>;
}

const PharmacyContext = createContext<PharmacyData | null>(null);
const LOW_STOCK = 100;

export function PharmacyDataProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const { enqueue } = useSync();

  useEffect(() => {
    let active = true;
    getPharmacyInventory()
      .then((rows) => { if (active) setMedicines(rows); })
      .catch((error) => toast.error('Inventory did not load', { description: describeApiError(error) }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const add = useCallback(async (draft: { name: string; category: string; price: number; stock: number }) => {
    try {
      const saved = await createPharmacyMedicine(draft);
      setMedicines((current) => [saved, ...current]);
      enqueue('Stock count · ' + saved.name);
      toast.success('Added to inventory', { description: `${saved.name} is now visible in the patient medicine catalog.` });
      return true;
    } catch (error) {
      toast.error('Medicine not saved', { description: describeApiError(error) });
      return false;
    }
  }, [enqueue]);

  const value = useMemo(() => ({ medicines, loading, add }), [medicines, loading, add]);
  return <PharmacyContext.Provider value={value}>{children}</PharmacyContext.Provider>;
}

function usePharmacyData() {
  const context = useContext(PharmacyContext);
  if (!context) throw new Error('Pharmacy pages need PharmacyDataProvider');
  return context;
}

const nav: WorkspaceNavItem[] = [
  { to: '/pharmacy', label: 'Stock', icon: Store, end: true },
  { to: '/pharmacy/ledger', label: 'Dispensing', icon: IndianRupee },
  { to: '/pharmacy/insights', label: 'Insights', icon: TrendingDown },
];

export function PharmacyWorkspace() {
  return (
    <PharmacyDataProvider>
      <Workspace role="seller" workspaceName="Pharmacy workspace" brief="Stock you publish" nav={nav} />
    </PharmacyDataProvider>
  );
}

/* --------------------------------------------------------------- screens */

export function PharmacyStock() {
  const { medicines, loading, add } = usePharmacyData();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: '', price: '', stock: '' });
  const [busy, setBusy] = useState(false);

  const rows = medicines.filter((medicine) => `${medicine.name} ${medicine.category ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const valuation = medicines.reduce((total, medicine) => total + medicine.stock * medicine.price, 0);
  const low = medicines.filter((medicine) => medicine.stock < LOW_STOCK);
  const deepest = Math.max(1, ...medicines.map((medicine) => medicine.stock));

  const submit = async () => {
    const price = Number(draft.price);
    const stock = Number(draft.stock);
    if (!draft.name.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
      toast.error('Check the entry', { description: 'A name, a price above zero and a stock count of zero or more.' });
      return;
    }
    setBusy(true);
    const ok = await add({ name: draft.name.trim(), category: draft.category.trim() || 'General', price, stock });
    setBusy(false);
    if (ok) {
      setDraft({ name: '', category: '', price: '', stock: '' });
      setOpen(false);
    }
  };

  return (
    <>
      <PageHead
        title="Published stock"
        lede="What patients see when they search for a medicine. Enter it when you receive or dispense, and the catalog changes with it."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-role text-white hover:bg-role/90"><PackagePlus /> Add medicine</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to published stock</DialogTitle>
                <DialogDescription>This becomes visible in the patient medicine search as soon as it saves.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="label mb-2 block">Medicine</span>
                  <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Tab. paracetamol 500 mg" className="h-11 rounded-lg" />
                </label>
                <label className="block">
                  <span className="label mb-2 block">Units</span>
                  <Input type="number" min="0" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} placeholder="240" className="h-11 rounded-lg" />
                </label>
                <label className="block">
                  <span className="label mb-2 block">Price ₹</span>
                  <Input type="number" min="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="22" className="h-11 rounded-lg" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="label mb-2 block">Category</span>
                  <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Pain relief" className="h-11 rounded-lg" />
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-role text-white hover:bg-role/90" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save to stock'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="role" label="Items published" value={loading ? '…' : <Counter value={medicines.length} />} hint="Visible to patients" icon={<Store className="h-4 w-4" />} />
        <Stat label="Stock value" value={`₹${valuation.toLocaleString('en-IN')}`} hint="Units at listed price" icon={<Wallet className="h-4 w-4" />} />
        <Stat tone={low.length > 0 ? 'queued' : 'synced'} label="Running low" value={<Counter value={low.length} />} hint={`Under ${LOW_STOCK} units`} icon={<AlertTriangle className="h-4 w-4" />} />
        <Stat label="Units on shelf" value={<Counter value={medicines.reduce((total, medicine) => total + medicine.stock, 0)} />} hint="Across every item" icon={<Boxes className="h-4 w-4" />} />
      </div>

      <Panel
        className="mt-6"
        eyebrow="Catalog"
        title="Every item you publish"
        action={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock…" className="h-11 rounded-lg pl-10" />
          </div>
        }
      >
        {loading ? (
          <p className="py-8 text-[14px] text-muted-foreground">Loading inventory…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title={query ? `Nothing matches “${query}”` : 'No stock published'}
            body="Add the medicines you keep on the shelf and patients can find them."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Published medicine stock with depth and price</caption>
              <thead>
                <tr className="border-b">
                  {['Medicine', 'Category', 'Depth', 'Units', 'Price'].map((heading) => (
                    <th key={heading} scope="col" className="label pb-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((medicine) => (
                  <tr key={medicine.id} className="border-b last:border-0">
                    <td className="py-4 font-medium">{medicine.name}</td>
                    <td className="py-4 text-muted-foreground">{medicine.category || 'General'}</td>
                    <td className="w-40 py-4">
                      <Meter value={(medicine.stock / deepest) * 100} tone={medicine.stock < LOW_STOCK ? 'queued' : 'role'} />
                    </td>
                    <td className="py-4 font-mono">
                      {medicine.stock.toLocaleString('en-IN')}
                      {medicine.stock < LOW_STOCK && <Chip tone="warn" className="ml-2">low</Chip>}
                    </td>
                    <td className="py-4 font-mono">₹{medicine.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/**
 * The dispensing desk. Nothing here is presented as sales data, because the platform does not
 * record a sale when a prescription is filled.
 */
export function PharmacyLedger() {
  const { medicines } = usePharmacyData();
  return (
    <>
      <PageHead
        title="Dispensing"
        lede="A prescription is a clinical instruction, not a receipt. This workspace can show what was prescribed; it cannot yet confirm what left your counter."
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel eyebrow="What patients were given" title="Prescriptions reaching your patients">
          <EmptyState
            title="Dispensing queue not connected"
            body="The API stores a prescription against the patient record but does not expose it to a pharmacy queue yet, so there is nothing honest to list here."
          />
          <p className="mt-5 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">
            The earlier version of this screen showed a sales table of three invented orders. It was removed rather than kept looking plausible.
          </p>
        </Panel>

        <div className="space-y-6">
          <NotConnected>
            <strong className="text-foreground">Sales ledger.</strong> No invoice or payment record is created when stock changes, so revenue cannot be reported.
          </NotConnected>
          <NotConnected>
            <strong className="text-foreground">GST filing.</strong> Invoice series and tax summaries are outside the scope of this build.
          </NotConnected>
          <Panel eyebrow="What is live" title="Stock you control">
            <ul className="space-y-3">
              {medicines.slice(0, 5).map((medicine) => (
                <li key={medicine.id} className="flex items-center justify-between gap-3 border-b pb-3 text-[14px] last:border-0">
                  <span className="min-w-0 truncate">{medicine.name}</span>
                  <span className="font-mono text-muted-foreground">{medicine.stock.toLocaleString('en-IN')} u · ₹{medicine.price}</span>
                </li>
              ))}
              {medicines.length === 0 && <p className="text-[14px] text-muted-foreground">Nothing published yet.</p>}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function PharmacyInsights() {
  const { medicines } = usePharmacyData();
  const low = medicines.filter((medicine) => medicine.stock < LOW_STOCK);
  const byCategory = useMemo(() => {
    const map = new Map<string, { items: number; units: number; value: number }>();
    for (const medicine of medicines) {
      const key = medicine.category || 'General';
      const entry = map.get(key) ?? { items: 0, units: 0, value: 0 };
      map.set(key, { items: entry.items + 1, units: entry.units + medicine.stock, value: entry.value + medicine.stock * medicine.price });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [medicines]);
  const totalValue = medicines.reduce((sum, medicine) => sum + medicine.stock * medicine.price, 0);

  const exportStock = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      lowStockThreshold: LOW_STOCK,
      stock: medicines,
      note: 'Counts typed by this pharmacy. No dispensing or sales data is included because none is recorded.',
    };
    const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'gramhealth-stock-report.json';
    link.click();
    URL.revokeObjectURL(href);
    toast.success('Stock report downloaded');
  };

  return (
    <>
      <PageHead title="Insights" lede="Only what your own entries support: depth, mix and the items that need ordering." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Reorder" title={low.length === 0 ? 'Nothing under threshold' : `${low.length} item${low.length === 1 ? '' : 's'} to top up`}>
          {low.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">Every published item is at or above {LOW_STOCK} units.</p>
          ) : (
            <ul className="space-y-4">
              {low.map((medicine) => (
                <li key={medicine.id}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-medium">{medicine.name}</span>
                    <span className={cn('font-mono text-[13px]', 'text-queued')}>{medicine.stock} left</span>
                  </div>
                  <Meter value={(medicine.stock / LOW_STOCK) * 100} tone="queued" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Mix" title="Value held by category" note="Percentages are of stock value at your listed prices, not of what has sold.">
          <ul className="space-y-4">
            {byCategory.map(([category, entry]) => (
              <li key={category}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px]">{category}</span>
                  <span className="font-mono text-[13px] text-muted-foreground">₹{entry.value.toLocaleString('en-IN')}</span>
                </div>
                <Meter value={totalValue ? (entry.value / totalValue) * 100 : 0} />
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                  {entry.items} item{entry.items === 1 ? '' : 's'} · {entry.units.toLocaleString('en-IN')} units · {totalValue ? Math.round((entry.value / totalValue) * 100) : 0}% of value
                </p>
              </li>
            ))}
            {byCategory.length === 0 && <p className="text-[15px] text-muted-foreground">Publish stock to see a breakdown.</p>}
          </ul>
          <Button variant="outline" onClick={exportStock} className="mt-6" disabled={medicines.length === 0}>
            <FileDown /> Export stock report
          </Button>
        </Panel>
      </div>

      <Panel className="mt-6" eyebrow="Expiry" title="Best-before tracking">
        <NotConnected>
          Batch-wise expiry dates are not stored with the stock row, so near-expiry risk cannot be listed. Adding a batch table is the next piece of this workspace.
        </NotConnected>
      </Panel>
    </>
  );
}
