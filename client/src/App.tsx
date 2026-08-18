import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import GuardApp from "@/pages/GuardApp";
import DailyReminderSchedule from "@/pages/DailyReminderSchedule";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const protectedPaths = ["/app", "/purchases", "/manage", "/receipts", "/warranties", "/returns", "/spending", "/ai", "/notifications", "/settings"] as const;

function ProtectedApp({ view }: { view: (typeof protectedPaths)[number] }) { return <DashboardLayout><GuardApp view={view} /></DashboardLayout>; }

function Router() { return <Switch><Route path="/" component={Home} />{protectedPaths.map(path => <Route key={path} path={path}>{() => <ProtectedApp view={path} />}</Route>)}<Route path="/reminder-schedule">{() => <DashboardLayout><DailyReminderSchedule /></DashboardLayout>}</Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
