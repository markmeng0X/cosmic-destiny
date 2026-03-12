import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { TimezoneProvider } from "@/components/timezone-provider";
import { TimezoneSelector } from "@/components/timezone-selector";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard/index";
import BaziPage from "@/pages/dashboard/bazi";
import DivinationPage from "@/pages/dashboard/divination";
import MatchingPage from "@/pages/dashboard/matching";
import SettingsPage from "@/pages/dashboard/settings";
import SubscriptionPage from "@/pages/dashboard/subscription";
import ReferralPage from "@/pages/dashboard/referral";
import DevicesPage from "@/pages/dashboard/devices";
import ShopPage from "@/pages/dashboard/shop";
import AdminPage from "@/pages/dashboard/admin";
import { useAuth } from "@/hooks/use-auth";
import { usePageView } from "@/hooks/use-pageview";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <TimezoneSelector />
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
          <OnboardingDialog />
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: adminCheck, isLoading: adminLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || adminLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  if (!adminCheck?.isAdmin) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function PageViewTracker() {
  const { user } = useAuth();
  usePageView(user?.id);
  return null;
}

function Router() {
  return (
    <>
    <PageViewTracker />
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/dashboard/bazi">
        {() => <ProtectedRoute component={BaziPage} />}
      </Route>
      <Route path="/dashboard/divination">
        {() => <ProtectedRoute component={DivinationPage} />}
      </Route>
      <Route path="/dashboard/matching">
        {() => <ProtectedRoute component={MatchingPage} />}
      </Route>
      <Route path="/dashboard/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/dashboard/subscription">
        {() => <ProtectedRoute component={SubscriptionPage} />}
      </Route>
      <Route path="/dashboard/referral">
        {() => <ProtectedRoute component={ReferralPage} />}
      </Route>
      <Route path="/dashboard/devices">
        {() => <ProtectedRoute component={DevicesPage} />}
      </Route>
      <Route path="/dashboard/shop">
        {() => <ProtectedRoute component={ShopPage} />}
      </Route>
      <Route path="/dashboard/admin">
        {() => <AdminRoute component={AdminPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TimezoneProvider>
          <I18nProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </I18nProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
