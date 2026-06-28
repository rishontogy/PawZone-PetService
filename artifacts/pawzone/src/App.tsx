import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { GlobalBackBar } from "@/components/GlobalBackBar";
import NotFound from "@/pages/not-found";

import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { HomePage } from "@/pages/HomePage";
import { ListingsPage } from "@/pages/ListingsPage";
import { ListingDetailPage } from "@/pages/ListingDetailPage";
import { CartPage } from "@/pages/CartPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { SettingsPage } from "@/pages/SettingsPage";

import { BuyerDashboard } from "@/pages/buyer/BuyerDashboard";
import { BuyerOrdersPage } from "@/pages/buyer/OrdersPage";
import { OrderDetailPage } from "@/pages/buyer/OrderDetailPage";

import { SellerDashboard } from "@/pages/seller/SellerDashboard";
import { SellerListingsPage } from "@/pages/seller/SellerListingsPage";
import { CreateListingPage } from "@/pages/seller/CreateListingPage";
import { EditListingPage } from "@/pages/seller/EditListingPage";
import { SellerOrdersPage } from "@/pages/seller/SellerOrdersPage";
import { SellerPayoutPage } from "@/pages/seller/SellerPayoutPage";

import { TransporterDashboard } from "@/pages/transporter/TransporterDashboard";
import { AddRoutePage } from "@/pages/transporter/AddRoutePage";
import { TransporterPayoutPage } from "@/pages/transporter/TransporterPayoutPage";

import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminListingsPage } from "@/pages/admin/AdminListingsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";
import { AdminAlertsPage } from "@/pages/admin/AdminAlertsPage";
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";
import { AdminAccountingPage } from "@/pages/admin/AdminAccountingPage";
import { AdminSellerLedgerPage } from "@/pages/admin/AdminSellerLedgerPage";
import { AdminTransporterLedgerPage } from "@/pages/admin/AdminTransporterLedgerPage";
import { AdminPasswordResetsPage } from "@/pages/admin/AdminPasswordResetsPage";
import { AdminPayoutsPage } from "@/pages/admin/AdminPayoutsPage";
import { UPIPaymentPage } from "@/pages/buyer/UPIPaymentPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function RequireAuth({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading, token } = useAuth();

  if (!token && !isLoading) {
    return <Redirect to="/login" />;
  }

  if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
    const dashPath = user.role === "admin" ? "/admin" :
      user.role === "seller" ? "/seller" :
      user.role === "transporter" ? "/transporter" : "/buyer";
    return <Redirect to={dashPath} />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <Navbar />
      <GlobalBackBar />
      <div className={user ? "pb-16 md:pb-0" : ""}>
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/">
        <AppLayout><HomePage /></AppLayout>
      </Route>
      <Route path="/listings">
        <AppLayout><ListingsPage /></AppLayout>
      </Route>
      <Route path="/listings/:id">
        <AppLayout><ListingDetailPage /></AppLayout>
      </Route>

      {/* Authenticated */}
      <Route path="/profile">
        <RequireAuth>
          <AppLayout><ProfilePage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/notifications">
        <RequireAuth>
          <AppLayout><NotificationsPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/settings">
        <RequireAuth>
          <AppLayout><SettingsPage /></AppLayout>
        </RequireAuth>
      </Route>

      {/* Buyer routes */}
      <Route path="/buyer">
        <RequireAuth allowedRoles={["buyer"]}>
          <AppLayout><BuyerDashboard /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/buyer/cart">
        <RequireAuth allowedRoles={["buyer"]}>
          <AppLayout><CartPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/buyer/orders">
        <RequireAuth allowedRoles={["buyer"]}>
          <AppLayout><BuyerOrdersPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/buyer/orders/:id/pay">
        <RequireAuth allowedRoles={["buyer"]}>
          <AppLayout><UPIPaymentPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/buyer/orders/:id">
        <RequireAuth allowedRoles={["buyer"]}>
          <AppLayout><OrderDetailPage /></AppLayout>
        </RequireAuth>
      </Route>

      {/* Seller routes */}
      <Route path="/seller">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><SellerDashboard /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/seller/listings">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><SellerListingsPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/seller/listings/new">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><CreateListingPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/seller/listings/:id/edit">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><EditListingPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/seller/orders">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><SellerOrdersPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/seller/payout">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><SellerPayoutPage /></AppLayout>
        </RequireAuth>
      </Route>

      {/* Transporter routes */}
      <Route path="/transporter">
        <RequireAuth allowedRoles={["transporter"]}>
          <AppLayout><TransporterDashboard /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/transporter/routes/new">
        <RequireAuth allowedRoles={["transporter"]}>
          <AppLayout><AddRoutePage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/transporter/routes/:id/edit">
        <RequireAuth allowedRoles={["transporter"]}>
          <AppLayout><AddRoutePage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/transporter/payout">
        <RequireAuth allowedRoles={["transporter"]}>
          <AppLayout><TransporterPayoutPage /></AppLayout>
        </RequireAuth>
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminDashboard /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/users">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminUsersPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/listings">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminListingsPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/orders">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminOrdersPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/disputes">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminDisputesPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/alerts">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminAlertsPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/payments">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminPaymentsPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/accounting">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminAccountingPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/ledger/seller/:sellerId">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminSellerLedgerPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/ledger/transporter/:transporterId">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminTransporterLedgerPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/password-resets">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminPasswordResetsPage /></AppLayout>
        </RequireAuth>
      </Route>
      <Route path="/admin/payouts">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminPayoutsPage /></AppLayout>
        </RequireAuth>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ScrollToTop />
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
