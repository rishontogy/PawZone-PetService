import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart, User, LogOut, LayoutDashboard, PawPrint, Search,
  Bell, Menu, X, Settings, Package, MapPin, Shield, Users, Wallet,
} from "lucide-react";
import { useGetCart, useGetNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation as useWouterLocation } from "wouter";

export function Navbar() {
  const { user, token, logout } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useWouterLocation();
  const [searchVal, setSearchVal] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: cart } = useGetCart({
    query: { enabled: !!token && user?.role === "buyer" },
  } as any);

  const { data: rawNotifs, refetch: refetchNotifs } = useGetNotifications({
    query: { enabled: !!token },
  } as any);

  const markRead = useMarkNotificationRead({
    mutation: { onSuccess: () => refetchNotifs() },
  });

  const cartCount =
    (cart as any)?.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) ?? 0;
  const notifications: any[] = Array.isArray(rawNotifs) ? rawNotifs : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const dashPath =
    user?.role === "admin" ? "/admin" :
    user?.role === "seller" ? "/seller" :
    user?.role === "transporter" ? "/transporter" : "/buyer";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      setLocation(`/listings?search=${encodeURIComponent(searchVal)}`);
      setMobileMenuOpen(false);
      setSearchVal("");
    }
  };

  const notifColor = (type: string) => {
    if (type === "order") return "bg-blue-100 text-blue-700";
    if (type === "payment") return "bg-green-100 text-green-700";
    if (type === "alert") return "bg-red-100 text-red-700";
    if (type === "approval") return "bg-teal-100 text-teal-700";
    return "bg-gray-100 text-gray-600";
  };

  const mobileLinks = user
    ? [
        { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", href: dashPath },
        ...(user.role === "buyer"
          ? [
              { icon: <Search className="w-4 h-4" />, label: "Browse Pets", href: "/listings" },
              { icon: <ShoppingCart className="w-4 h-4" />, label: `Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, href: "/buyer/cart" },
              { icon: <Package className="w-4 h-4" />, label: "My Orders", href: "/buyer/orders" },
            ]
          : []),
        ...(user.role === "seller"
          ? [
              { icon: <Package className="w-4 h-4" />, label: "My Listings", href: "/seller/listings" },
              { icon: <ShoppingCart className="w-4 h-4" />, label: "Orders", href: "/seller/orders" },
              { icon: <Wallet className="w-4 h-4" />, label: "Payout", href: "/seller/payout" },
            ]
          : []),
        ...(user.role === "transporter"
          ? [
              { icon: <MapPin className="w-4 h-4" />, label: "My Routes", href: "/transporter/routes/new" },
              { icon: <Wallet className="w-4 h-4" />, label: "Payout", href: "/transporter/payout" },
            ]
          : []),
        ...(user.role === "admin"
          ? [
              { icon: <Users className="w-4 h-4" />, label: "Users", href: "/admin/users" },
              { icon: <Package className="w-4 h-4" />, label: "Listings", href: "/admin/listings" },
              { icon: <Shield className="w-4 h-4" />, label: "Orders", href: "/admin/orders" },
              { icon: <Wallet className="w-4 h-4" />, label: "Payouts", href: "/admin/payouts" },
            ]
          : []),
        { icon: <Bell className="w-4 h-4" />, label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`, href: "/notifications" },
        { icon: <User className="w-4 h-4" />, label: "Profile", href: "/profile" },
        { icon: <Settings className="w-4 h-4" />, label: "Settings", href: "/settings" },
      ]
    : [
        { icon: <Search className="w-4 h-4" />, label: "Browse Pets", href: "/listings" },
        { icon: <User className="w-4 h-4" />, label: "Login", href: "/login" },
      ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href={user ? dashPath : "/"} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-gray-900">
                Paw<span className="text-teal-600">Zone</span>
              </span>
            </Link>

            {/* Center search bar — desktop only */}
            <div className="hidden md:flex flex-1 max-w-md">
              {!user || user.role !== "buyer" ? (
                <form
                  onSubmit={handleSearch}
                  className="flex items-center bg-gray-100 rounded-xl w-full px-3 gap-2"
                >
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search pets..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="flex-1 bg-transparent py-2 text-sm outline-none text-gray-700"
                  />
                </form>
              ) : (
                <Link
                  href="/listings"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Browse all pets
                </Link>
              )}
            </div>

            {/* Right side nav */}
            <div className="flex items-center gap-1 sm:gap-2">
              {!user && (
                <>
                  <Link href="/listings">
                    <Button variant="ghost" size="sm" className="hidden md:inline-flex text-gray-600">
                      Browse Pets
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}

              {user && (
                <>
                  {/* Cart badge (buyers only) — hidden on mobile since bottom nav has it */}
                  {user.role === "buyer" && (
                    <Link href="/buyer/cart" className="hidden md:block">
                      <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                        <ShoppingCart className="w-5 h-5" />
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold leading-none">
                            {cartCount > 9 ? "9+" : cartCount}
                          </span>
                        )}
                      </button>
                    </Link>
                  )}

                  {/* Notifications Bell — desktop only (mobile gets bottom nav) */}
                  <div className="hidden md:block">
                    <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                      <DropdownMenuTrigger asChild>
                        <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                          <Bell className="w-5 h-5" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold leading-none">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-80 rounded-2xl shadow-xl border-gray-100 p-0 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50">
                          <p className="font-bold text-sm text-gray-900">Notifications</p>
                          {unreadCount > 0 && (
                            <span className="text-xs text-teal-600 font-medium">{unreadCount} new</span>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-400">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.slice(0, 20).map((notif: any) => (
                              <div
                                key={notif.id}
                                className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                                  !notif.read ? "bg-blue-50/40" : ""
                                }`}
                                onClick={() => {
                                  if (!notif.read) markRead.mutate({ id: notif.id });
                                  setNotifOpen(false);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${notifColor(notif.type)}`}
                                  >
                                    {notif.type === "order"
                                      ? "📦"
                                      : notif.type === "payment"
                                      ? "💳"
                                      : notif.type === "alert"
                                      ? "⚠️"
                                      : notif.type === "approval"
                                      ? "✅"
                                      : "🔔"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm leading-snug ${
                                        notif.read ? "text-gray-600" : "text-gray-900 font-semibold"
                                      }`}
                                    >
                                      {notif.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {new Date(notif.createdAt).toLocaleString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                  {!notif.read && (
                                    <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5" />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-400 text-center">
                              Showing last {Math.min(notifications.length, 20)} notifications
                            </p>
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* User menu — desktop only */}
                  <div className="hidden md:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                            {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                          </div>
                          <span className="hidden md:inline text-sm font-medium text-gray-700">
                            {user.name?.split(" ")[0]}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-gray-100">
                        <div className="px-3 py-2">
                          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{user.role} Account</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={dashPath} className="flex items-center gap-2 cursor-pointer rounded-lg">
                            <LayoutDashboard className="w-4 h-4 text-gray-500" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="flex items-center gap-2 cursor-pointer rounded-lg">
                            <User className="w-4 h-4 text-gray-500" />
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={logout}
                          className="text-red-600 cursor-pointer rounded-lg focus:text-red-600"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}

              {/* Hamburger button — mobile only */}
              <button
                className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
            {/* Mobile Search */}
            <div className="px-4 pt-3 pb-2">
              <form
                onSubmit={handleSearch}
                className="flex items-center bg-gray-100 rounded-xl px-3 gap-2"
              >
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search pets..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none text-gray-700"
                />
              </form>
            </div>

            {/* Mobile Nav Links */}
            <nav className="px-4 pb-4 space-y-1">
              {mobileLinks.map((link) => (
                <Link key={link.href + link.label} href={link.href}>
                  <div
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-gray-500">{link.icon}</span>
                    {link.label}
                  </div>
                </Link>
              ))}

              {user && (
                <>
                  <div className="border-t border-gray-100 my-2" />
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </nav>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
