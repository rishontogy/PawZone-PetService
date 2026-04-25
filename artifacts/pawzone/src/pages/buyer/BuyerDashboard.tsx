import { Link, useLocation } from "wouter";
import { useGetBuyerDashboard, useGetListings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetCart } from "@workspace/api-client-react";
import { formatPrice, getStatusColor } from "@/lib/api";
import { ShoppingCart, Package, Search, PawPrint, MapPin, Heart, ChevronRight, Bell, User, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth as useAuthHook } from "@/contexts/AuthContext";

const CATEGORIES = [
  { label: "Dogs", value: "dogs", emoji: "🐕", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  { label: "Cats", value: "cats", emoji: "🐈", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  { label: "Birds", value: "birds", emoji: "🦜", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  { label: "Fish", value: "fish", emoji: "🐟", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { label: "Rabbits", value: "rabbits", emoji: "🐇", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
  { label: "All Pets", value: "", emoji: "🐾", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
];

export function BuyerDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  const { data: dashData } = useGetBuyerDashboard({ query: { enabled: !!user } });
  const { data: listingsData } = useGetListings({ page: 1, limit: 8, category: activeCategory || undefined } as any);
  const { data: cart } = useGetCart({ query: { enabled: !!user } });

  const listings = (listingsData as any)?.listings ?? [];
  const cartCount = cart?.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) setLocation(`/listings?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen sticky top-0 h-screen">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: <PawPrint className="w-4 h-4" />, label: "Browse Pets", href: "/listings" },
            { icon: <ShoppingCart className="w-4 h-4" />, label: `Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, href: "/buyer/cart", badge: cartCount },
            { icon: <Package className="w-4 h-4" />, label: "My Orders", href: "/buyer/orders" },
            { icon: <Bell className="w-4 h-4" />, label: "Notifications", href: "/profile" },
            { icon: <User className="w-4 h-4" />, label: "Profile", href: "/profile" },
            { icon: <Settings className="w-4 h-4" />, label: "Settings", href: "/profile" },
          ].map((item) => (
            <Link key={item.href + item.label} href={item.href}>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3 text-sm font-medium">
                  {item.icon}
                  {item.label}
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-teal-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{item.badge}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-20 flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl flex items-center bg-gray-100 rounded-xl overflow-hidden px-3 gap-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search breeds, species..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent py-2 text-sm outline-none text-gray-700"
            />
          </form>
          <Link href="/buyer/cart">
            <button className="relative w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-teal-50 transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </Link>
        </div>

        <div className="p-6 space-y-8">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl p-6 text-white flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold mb-1">Welcome back, {user?.name?.split(" ")[0]}! 👋</h1>
              <p className="text-white/80 text-sm">Find your perfect pet companion today</p>
              <div className="flex gap-4 mt-4 text-sm">
                <div>
                  <p className="font-bold text-xl">{dashData?.stats?.totalOrders ?? 0}</p>
                  <p className="text-white/70 text-xs">Orders</p>
                </div>
                <div>
                  <p className="font-bold text-xl">{dashData?.stats?.pendingOrders ?? 0}</p>
                  <p className="text-white/70 text-xs">Pending</p>
                </div>
                <div>
                  <p className="font-bold text-xl">{formatPrice(dashData?.stats?.totalSpent ?? 0)}</p>
                  <p className="text-white/70 text-xs">Spent</p>
                </div>
              </div>
            </div>
            <div className="text-6xl hidden sm:block">🐾</div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Browse Pets", icon: "🐕", href: "/listings", bg: "bg-teal-50 border-teal-200", text: "text-teal-700" },
              { label: "My Cart", icon: "🛒", href: "/buyer/cart", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", count: cartCount },
              { label: "My Orders", icon: "📦", href: "/buyer/orders", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <div className={`${action.bg} border rounded-2xl p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer`}>
                  <div className="text-3xl mb-2">{action.icon}</div>
                  <p className={`text-sm font-semibold ${action.text}`}>{action.label}</p>
                  {action.count !== undefined && action.count > 0 && (
                    <Badge className="mt-1 bg-teal-600">{action.count} items</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Browse by Category</h2>
            </div>
            <div className="flex gap-3 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                    activeCategory === cat.value
                      ? `${cat.bg} ${cat.border} ${cat.text} shadow-sm`
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listings grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {activeCategory ? `${CATEGORIES.find(c => c.value === activeCategory)?.label ?? ""} for Sale` : "All Pets"}
              </h2>
              <Link href="/listings" className="text-teal-600 text-sm font-medium flex items-center gap-1 hover:text-teal-700">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {listings.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <div className="text-5xl mb-4">🐾</div>
                <h3 className="font-semibold text-gray-700 mb-2">No pets found</h3>
                <p className="text-gray-400 text-sm">Try a different category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {listings.map((listing: any) => (
                  <Link key={listing.id} href={`/listings/${listing.id}`}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group border border-gray-100">
                      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                        {listing.photos?.[0] ? (
                          <img
                            src={listing.photos[0]}
                            alt={listing.breed}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-50">🐾</div>
                        )}
                        <button className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                          <Heart className="w-4 h-4 text-gray-400" />
                        </button>
                        {listing.vaccinated && (
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                            ✓ Vaccinated
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight">{listing.breed}</h3>
                          <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">{listing.category}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                          <MapPin className="w-3 h-3" />
                          {listing.city}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-extrabold text-teal-600">{formatPrice(listing.price)}</span>
                          <span className="text-xs text-gray-400">{listing.availableQuantity ?? listing.quantity} avail.</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          {dashData?.recentOrders && dashData.recentOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                <Link href="/buyer/orders" className="text-teal-600 text-sm font-medium flex items-center gap-1 hover:text-teal-700">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
                {dashData.recentOrders.slice(0, 3).map((order: any) => (
                  <Link key={order.id} href={`/buyer/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-xl">📦</div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{formatPrice(order.totalAmount)}</span>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
