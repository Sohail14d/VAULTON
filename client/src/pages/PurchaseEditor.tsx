import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Purchase = {
  id: number; productName: string; productImageUrl: string | null; brand: string | null; category: string | null; description: string | null; purchaseDate: Date | string; priceCents: number; currency: string; quantity: number; merchant: string | null; store: string | null; orderId: string | null; invoiceNumber: string | null; serialNumber: string | null; modelNumber: string | null; paymentMethod: string | null; warrantyMonths: number | null; warrantyStartDate: Date | string | null; warrantyExpiryDate: Date | string | null; returnPeriodDays: number | null; returnDeadline: Date | string | null; status: "active" | "archived" | "returned" | "claimed"; receiptUrl: string | null; receiptKey: string | null; receiptFileName: string | null; notes: string | null; tags: string[]; extractionConfidence: Record<string, number> | null;
};

const dateInput = (value: Date | string | null) => value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const nullable = (value: string) => value.trim() || null;

export default function PurchaseEditor() {
  const utils = trpc.useUtils();
  const { data: purchases = [], isLoading } = trpc.purchases.list.useQuery({ filter: "all" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = purchases.find(purchase => purchase.id === selectedId) as Purchase | undefined;
  const [form, setForm] = useState({ productName: "", price: "", brand: "", merchant: "", category: "", purchaseDate: "", warrantyMonths: "", returnDays: "", serialNumber: "", invoiceNumber: "", tags: "", notes: "" });
  const update = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const save = trpc.purchases.update.useMutation({ onSuccess: () => { utils.purchases.invalidate(); toast.success("Purchase details updated"); } });

  useEffect(() => { if (!selectedId && purchases[0]) setSelectedId(purchases[0].id); }, [purchases, selectedId]);
  useEffect(() => {
    if (!selected) return;
    setForm({ productName: selected.productName, price: (selected.priceCents / 100).toFixed(2), brand: selected.brand ?? "", merchant: selected.merchant ?? "", category: selected.category ?? "", purchaseDate: dateInput(selected.purchaseDate), warrantyMonths: selected.warrantyMonths?.toString() ?? "", returnDays: selected.returnPeriodDays?.toString() ?? "", serialNumber: selected.serialNumber ?? "", invoiceNumber: selected.invoiceNumber ?? "", tags: selected.tags.join(", "), notes: selected.notes ?? "" });
  }, [selectedId]);

  const submit = () => {
    if (!selected || !form.productName.trim() || !form.price) return toast.error("A product name and purchase price are required.");
    const purchasedAt = new Date(`${form.purchaseDate}T12:00:00`).getTime();
    const warrantyMonths = Number(form.warrantyMonths) || null;
    const returnDays = Number(form.returnDays) || null;
    save.mutate({ id: selected.id, purchase: { productName: form.productName.trim(), productImageUrl: selected.productImageUrl, brand: nullable(form.brand), category: nullable(form.category), description: selected.description, purchaseDate: purchasedAt, priceCents: Math.round(Number(form.price) * 100), currency: selected.currency, quantity: selected.quantity, merchant: nullable(form.merchant), store: selected.store, orderId: selected.orderId, invoiceNumber: nullable(form.invoiceNumber), serialNumber: nullable(form.serialNumber), modelNumber: selected.modelNumber, paymentMethod: selected.paymentMethod, warrantyMonths, warrantyStartDate: warrantyMonths ? purchasedAt : null, warrantyExpiryDate: warrantyMonths ? new Date(new Date(purchasedAt).setMonth(new Date(purchasedAt).getMonth() + warrantyMonths)).getTime() : null, returnPeriodDays: returnDays, returnDeadline: returnDays ? purchasedAt + returnDays * 86_400_000 : null, status: selected.status, receiptUrl: selected.receiptUrl, receiptKey: selected.receiptKey, receiptFileName: selected.receiptFileName, notes: nullable(form.notes), tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean), extractionConfidence: selected.extractionConfidence } });
  };

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />;
  if (!purchases.length) return <Card className="border-dashed border-slate-300 bg-white"><CardContent className="p-10 text-center"><Pencil className="mx-auto h-6 w-6 text-emerald-600" /><h1 className="mt-4 text-xl font-semibold">No purchase to edit yet</h1><p className="mt-2 text-sm text-slate-500">Add a purchase or scan a receipt first, then return here to refine its details.</p></CardContent></Card>;

  return <><header className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Purchase management</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">Edit a purchase record</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Correct product, price, warranty, return, serial, and receipt-reference details without losing your existing record.</p></header><Card className="border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(22,61,53,.04)]"><CardContent className="p-5 sm:p-6"><Label className="text-sm font-medium text-slate-700">Choose purchase</Label><select value={selectedId ?? ""} onChange={event => setSelectedId(Number(event.target.value))} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500"><option value="" disabled>Select a purchase</option>{purchases.map(purchase => <option key={purchase.id} value={purchase.id}>{purchase.productName} · {(purchase.priceCents / 100).toFixed(2)} {purchase.currency}</option>)}</select>{selected && <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Product name"><Input value={form.productName} onChange={event => update("productName", event.target.value)} /></Field><Field label="Purchase price"><Input type="number" min="0" step="0.01" value={form.price} onChange={event => update("price", event.target.value)} /></Field><Field label="Purchase date"><Input type="date" value={form.purchaseDate} onChange={event => update("purchaseDate", event.target.value)} /></Field><Field label="Merchant"><Input value={form.merchant} onChange={event => update("merchant", event.target.value)} /></Field><Field label="Brand"><Input value={form.brand} onChange={event => update("brand", event.target.value)} /></Field><Field label="Category"><Input value={form.category} onChange={event => update("category", event.target.value)} /></Field><Field label="Warranty duration (months)"><Input type="number" min="0" value={form.warrantyMonths} onChange={event => update("warrantyMonths", event.target.value)} /></Field><Field label="Return period (days)"><Input type="number" min="0" value={form.returnDays} onChange={event => update("returnDays", event.target.value)} /></Field><Field label="Serial number"><Input value={form.serialNumber} onChange={event => update("serialNumber", event.target.value)} /></Field><Field label="Invoice / order number"><Input value={form.invoiceNumber} onChange={event => update("invoiceNumber", event.target.value)} /></Field><Field label="Tags"><Input value={form.tags} onChange={event => update("tags", event.target.value)} placeholder="Comma-separated" /></Field><Field label="Notes"><Textarea value={form.notes} onChange={event => update("notes", event.target.value)} className="min-h-10" /></Field><div className="sm:col-span-2 flex justify-end"><Button disabled={save.isPending} onClick={submit} className="h-10 rounded-xl bg-[#163d35]">{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></div></div>}</CardContent></Card></>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>; }
