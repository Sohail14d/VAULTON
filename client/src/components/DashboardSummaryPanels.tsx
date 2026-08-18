import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BellRing, Search, ShoppingBag, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

type SummaryPurchase = {
  id: number;
  productName: string;
  merchant: string | null;
  purchaseDate: Date | string;
  priceCents: number;
  quantity: number;
  currency: string;
};

type SummaryReminder = {
  id: number;
  title: string;
  body: string;
  severity: "critical" | "urgent" | "reminder" | "safe";
  eventAt: Date | string | null;
  isRead: boolean | number;
};

type Props = {
  purchases: SummaryPurchase[];
  reminders: SummaryReminder[];
  onNavigate: (path: "/purchases" | "/manage" | "/notifications") => void;
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatCurrency(cents: number, code: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100);
}

function reminderState(reminder: SummaryReminder) {
  const days = reminder.eventAt ? Math.ceil((new Date(reminder.eventAt).getTime() - Date.now()) / 86_400_000) : null;
  if (days !== null && days < 0) return { label: `Overdue · ${Math.abs(days)}d`, tone: "border-rose-200 bg-rose-50 text-rose-700", icon: "bg-rose-100 text-rose-700" };
  if (days !== null && days <= 3) return { label: `Due soon · ${days}d`, tone: "border-orange-200 bg-orange-50 text-orange-700", icon: "bg-orange-100 text-orange-700" };
  if (reminder.severity === "critical" || reminder.severity === "urgent") return { label: "Urgent", tone: "border-orange-200 bg-orange-50 text-orange-700", icon: "bg-orange-100 text-orange-700" };
  if (reminder.severity === "reminder") return { label: days !== null ? `Due in ${days}d` : "Reminder", tone: "border-amber-200 bg-amber-50 text-amber-700", icon: "bg-amber-100 text-amber-700" };
  return { label: "On track", tone: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: "bg-emerald-100 text-emerald-700" };
}

export function DashboardSummaryPanels({ purchases, reminders, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "highest" | "lowest" | "name">("recent");
  const visiblePurchases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = purchases.filter(purchase => !normalized || [purchase.productName, purchase.merchant ?? ""].some(value => value.toLowerCase().includes(normalized)));
    return [...filtered].sort((a, b) => {
      if (sort === "highest") return b.priceCents * b.quantity - a.priceCents * a.quantity;
      if (sort === "lowest") return a.priceCents * a.quantity - b.priceCents * b.quantity;
      if (sort === "name") return a.productName.localeCompare(b.productName);
      return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    }).slice(0, 4);
  }, [purchases, query, sort]);

  const unreadReminders = useMemo(() => reminders.filter(reminder => !reminder.isRead).sort((a, b) => {
    const aTime = a.eventAt ? new Date(a.eventAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.eventAt ? new Date(b.eventAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  }).slice(0, 4), [reminders]);

  return <section className="mt-5 grid gap-5 xl:grid-cols-2">
    <div className="rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="font-semibold tracking-[-.02em] text-slate-800">Recent purchases</p><p className="mt-1 text-sm text-slate-500">Search and sort saved purchases without leaving your summary.</p></div><button onClick={() => onNavigate("/purchases")} className="shrink-0 text-xs font-semibold text-emerald-700">View library</button></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a saved purchase" className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-8 text-xs shadow-none" /></div><label className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600"><SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" /><span className="sr-only">Sort purchases</span><select value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="min-w-0 bg-transparent outline-none"><option value="recent">Most recent</option><option value="highest">Highest value</option><option value="lowest">Lowest value</option><option value="name">A–Z</option></select></label></div>
      <div className="mt-3 space-y-2">{visiblePurchases.map(purchase => <button key={purchase.id} onClick={() => onNavigate("/manage")} className="flex w-full items-center gap-3 rounded-xl bg-[#f8faf8] px-3 py-2.5 text-left transition hover:bg-emerald-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-700"><ShoppingBag className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-700">{purchase.productName}</span><span className="block truncate text-xs text-slate-400">{formatDate(purchase.purchaseDate)} · {purchase.merchant || "Merchant not recorded"}</span></span><span className="text-sm font-semibold text-slate-800">{formatCurrency(purchase.priceCents * purchase.quantity, purchase.currency)}</span></button>)}{!visiblePurchases.length && <p className="py-5 text-sm text-slate-500">{query ? "No saved purchases match that search." : "Your latest purchases will appear here after you add one."}</p>}</div>
    </div>
    <div className="rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-center justify-between"><div><p className="font-semibold tracking-[-.02em] text-slate-800">Upcoming reminders</p><p className="mt-1 text-sm text-slate-500">Color-coded so overdue and urgent work stands out.</p></div><button onClick={() => onNavigate("/notifications")} className="text-xs font-semibold text-emerald-700">Open alerts</button></div>
      <div className="mt-4 space-y-2">{unreadReminders.map(reminder => { const state = reminderState(reminder); return <button key={reminder.id} onClick={() => onNavigate("/notifications")} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:brightness-[.98]", state.tone)}><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", state.icon)}>{state.label.startsWith("Overdue") || state.label === "Urgent" ? <TriangleAlert className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{reminder.title}</span><span className="block truncate text-xs opacity-80">{reminder.body}</span></span><Badge className={cn("shrink-0 border bg-white/75 text-[10px]", state.tone)}>{state.label}</Badge></button>; })}{!unreadReminders.length && <p className="py-5 text-sm text-slate-500">No unread reminders. GUARD will add time-sensitive alerts here.</p>}</div>
    </div>
  </section>;
}
