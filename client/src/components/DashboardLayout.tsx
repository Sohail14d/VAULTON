import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { Bell, Bot, CircleDollarSign, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, PackageOpen, PanelLeftClose, PanelLeftOpen, RotateCcw, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

const navigation = [
  { icon: LayoutDashboard, label: "Overview", path: "/app" },
  { icon: PackageOpen, label: "Purchases", path: "/purchases" },
  { icon: ClipboardList, label: "Manage & edit", path: "/manage" },
  { icon: FileText, label: "Bills & receipts", path: "/receipts" },
  { icon: ShieldCheck, label: "Warranties", path: "/warranties" },
  { icon: RotateCcw, label: "Return deadlines", path: "/returns" },
  { icon: CircleDollarSign, label: "Spending", path: "/spending" },
  { icon: Bot, label: "GUARD AI", path: "/ai" },
];

const workspaceItems = [
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#f6f8f7]"><div className="guard-pulse h-10 w-10 rounded-2xl bg-emerald-500/20" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen guard-auth-bg px-5 py-8 sm:p-10">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
          <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_100px_rgba(20,44,36,0.16)] backdrop-blur-xl lg:grid-cols-[1.12fr_.88fr]">
            <div className="relative overflow-hidden bg-[#163d35] px-8 py-10 text-white sm:px-12 sm:py-14">
              <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_15%_18%,rgba(94,234,212,.28),transparent_31%),radial-gradient(circle_at_83%_80%,rgba(163,230,53,.22),transparent_31%)]" />
              <div className="relative flex h-full flex-col justify-between gap-16">
                <div>
                  <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300 text-[#163d35]"><ShieldCheck className="h-5 w-5" /></div><span className="text-lg font-semibold tracking-tight">GUARD</span></div>
                  <p className="mt-16 max-w-md text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl">Your purchases, understood and protected.</p>
                  <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/70">One private place for receipts, return windows, warranties, claims, and spending clarity.</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-emerald-50/75 sm:max-w-sm">
                  {["Upload", "Extract", "Organize", "Track"].map((step, index) => <div key={step} className="relative"><div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/10 font-semibold text-lime-200">{index + 1}</div>{step}{index < 3 && <span className="absolute left-[calc(50%+1.15rem)] top-4 hidden h-px w-[calc(100%-2rem)] bg-white/25 sm:block" />}</div>)}
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center px-7 py-12 sm:px-12">
              <span className="text-sm font-medium text-emerald-700">Welcome to GUARD</span>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Keep the things you buy within reach.</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">Sign in to add your first purchase, extract a receipt, and let GUARD surface the next action.</p>
              <Button onClick={startLogin} size="lg" className="mt-8 h-12 rounded-xl bg-[#163d35] px-5 text-white hover:bg-[#0f3029]">Continue securely</Button>
              <p className="mt-4 text-xs leading-5 text-slate-400">Your workspace is private to your account. You can configure notifications after signing in.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const menu = (items: typeof navigation) => items.map(item => {
    const active = item.path === location;
    return <button key={item.path} onClick={() => { setLocation(item.path); setMobileOpen(false); }} className={cn("group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all", active ? "bg-[#e9f6e9] font-semibold text-[#185446]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>{<item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-emerald-600")} />}<span className={cn(collapsed && !isMobile && "hidden")}>{item.label}</span></button>;
  });

  const drawer = mobileOpen && isMobile ? "translate-x-0" : isMobile ? "-translate-x-full" : "translate-x-0";
  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-950">
      {isMobile && mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px]" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white px-3 py-4 transition-[width,transform] duration-200", collapsed && !isMobile ? "w-[76px]" : "w-[260px]", drawer)}>
        <div className="flex h-12 items-center justify-between px-2">
          <button onClick={() => setLocation("/app")} className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#163d35] text-lime-300"><ShieldCheck className="h-[18px] w-[18px]" /></span>{(!collapsed || isMobile) && <span className="text-base font-semibold tracking-[-0.03em]">GUARD</span>}</button>
          {!isMobile && <button aria-label="Toggle navigation" onClick={() => setCollapsed(value => !value)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>}
        </div>
        <nav className="mt-7 space-y-1">{menu(navigation)}</nav>
        <p className={cn("mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400", collapsed && !isMobile && "hidden")}>Workspace</p>
        <nav className="mt-2 space-y-1">{menu(workspaceItems)}</nav>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-slate-100"><Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700">{user.name?.slice(0, 1).toUpperCase() || "G"}</AvatarFallback></Avatar>{(!collapsed || isMobile) && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-700">{user.name || "Your account"}</span><span className="block truncate text-xs text-slate-400">Personal workspace</span></span>}</button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-600"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <main className={cn("min-h-screen transition-[padding] duration-200", collapsed && !isMobile ? "pl-[76px]" : isMobile ? "pl-0" : "pl-[260px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-[#f6f8f7]/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">{isMobile && <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-600 shadow-sm"><Menu className="h-4 w-4" /></button>}<div><p className="text-xs font-medium text-emerald-700">Personal purchase intelligence</p><p className="text-sm font-semibold tracking-[-0.02em] text-slate-800">{[...navigation, ...workspaceItems].find(item => item.path === location)?.label ?? "GUARD"}</p></div></div>
          <button onClick={() => setLocation("/notifications")} aria-label="View notifications" className="relative grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-emerald-700"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></button>
        </header>
        <div className="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9">{children}</div>
      </main>
    </div>
  );
}
