import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, Search, ShoppingCart, Package, User,
  LayoutDashboard, PlusCircle, MapPin, Bell,
  Users, Shield, CreditCard, Wallet,
} from "lucide-react";
import { useGetCart } from "@workspace/api-client-react";

type NavTab = { icon: React.ReactNode; label: string; href: string; badge?: number };

export function MobileBottomNav() {
  const { user, token } = useAuth();
  const [location] = useLocation();

  const { data: cart } = useGetCart({
    query: { enabled: !!token && user?.role === "buyer" },
  } as any);

  const cartCount =
    (cart as any)?.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) ?? 0;

  if (!user) return null;

  const isActive = (href: string) => {
    const roots = ["/buyer", "/seller", "/transporter", "/admin"];
    if (roots.includes(href)) return location === href;
    return location === href || location.startsWith(href + "/");
  };

  const tabsByRole: Record<string, NavTab[]> = {
    buyer: [
      { icon: <Home className="w-5 h-5" />, label: "Home", href: "/buyer" },
      { icon: <Search className="w-5 h-5" />, label: "Browse", href: "/listings" },
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Cart", href: "/buyer/cart", badge: cartCount },
      { icon: <Package className="w-5 h-5" />, label: "Orders", href: "/buyer/orders" },
      { icon: <User className="w-5 h-5" />, label: "Profile", href: "/profile" },
    ],
    seller: [
      { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/seller" },
      { icon: <Package className="w-5 h-5" />, label: "Listings", href: "/seller/listings" },
      { icon: <PlusCircle className="w-5 h-5" />, label: "Add Pet", href: "/seller/listings/new" },
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Orders", href: "/seller/orders" },
      { icon: <Wallet className="w-5 h-5" />, label: "Payout", href: "/seller/payout" },
    ],
    transporter: [
      { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/transporter" },
      { icon: <MapPin className="w-5 h-5" />, label: "Routes", href: "/transporter/routes/new" },
      { icon: <Package className="w-5 h-5" />, label: "Deliveries", href: "/transporter" },
      { icon: <Wallet className="w-5 h-5" />, label: "Payout", href: "/transporter/payout" },
      { icon: <User className="w-5 h-5" />, label: "Profile", href: "/profile" },
    ],
    admin: [
      { icon: <Shield className="w-5 h-5" />, label: "Dashboard", href: "/admin" },
      { icon: <Users className="w-5 h-5" />, label: "Users", href: "/admin/users" },
      { icon: <CreditCard className="w-5 h-5" />, label: "Payments", href: "/admin/payments" },
      { icon: <Wallet className="w-5 h-5" />, label: "Payouts", href: "/admin/payouts" },
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Orders", href: "/admin/orders" },
    ],
  };

  const tabs = tabsByRole[user.role] ?? [];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href + tab.label} href={tab.href} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center pt-2 pb-2.5 px-1 relative transition-all min-h-[60px] ${
                  active ? "text-teal-600" : "text-gray-400 active:text-gray-600"
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />
                )}
                {active && (
                  <div className="absolute inset-x-1 inset-y-0 bg-teal-50 rounded-xl -z-10" />
                )}
                <div className="relative">
                  {tab.icon}
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-teal-600 text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold leading-none px-0.5">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium leading-tight text-center ${
                    active ? "text-teal-600 font-semibold" : "text-gray-400"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
