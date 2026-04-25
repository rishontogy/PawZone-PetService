import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import NotFound from "@/pages/not-found";

import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { HomePage } from "@/pages/HomePage";
import { ListingsPage } from "@/pages/ListingsPage";
import { ListingDetailPage } from "@/pages/ListingDetailPage";
import { CartPage } from "@/pages/CartPage";
import { ProfilePage } from "@/pages/ProfilePage";

import { BuyerDashboard } from "@/pages/buyer/BuyerDashboard";
import { BuyerOrdersPage } from "@/pages/buyer/OrdersPage";
import { OrderDetailPage } from "@/pages/buyer/OrderDetailPage";

import { SellerDashboard } from "@/pages/seller/SellerDashboard";
import { SellerListingsPage } from "@/pages/seller/SellerListingsPage";
import { CreateListingPage } from "@/pages/seller/CreateListingPage";
import { SellerOrdersPage } from "@/pages/seller/SellerOrdersPage";

import { TransporterDashboard } from "@/pages/transporter/TransporterDashboard";
import { AddRoutePage } from "@/pages/transporter/AddRoutePage";

import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminListingsPage } from "@/pages/admin/AdminListingsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";
import { AdminAccountingPage } from "@/pages/admin/AdminAccountingPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

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
  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
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
      <Route path="/seller/orders">
        <RequireAuth allowedRoles={["seller"]}>
          <AppLayout><SellerOrdersPage /></AppLayout>
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
      <Route path="/admin/accounting">
        <RequireAuth allowedRoles={["admin"]}>
          <AppLayout><AdminAccountingPage /></AppLayout>
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
