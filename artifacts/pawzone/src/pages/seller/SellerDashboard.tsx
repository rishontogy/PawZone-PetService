import { Link } from "wouter";
import { useGetSellerDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getStatusColor } from "@/lib/api";
import {
  PlusCircle, Package, Star, TrendingUp, PawPrint,
  ShoppingBag, ChevronRight, AlertCircle, CheckCircle, Clock
} from "lucide-react";

export function SellerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetSellerDashboard({ query: { enabled: !!user } });

  if (user?.status === "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl p-8 shadow-lg border border-amber-200">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Awaiting Approval</h2>
          <p className="text-gray-500 text-sm">Your seller account is under review. You'll be notified once approved by admin.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = (data as any)?.stats ?? {};
  const recentOrders = (data as any)?.recentOrders ?? [];
  const listings = (data as any)?.listings ?? [];

  const statCards = [
    { icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />, label: "Net Revenue", value: formatPrice(Number(stats.totalRevenue ?? 0)), bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
    { icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />, label: "Active Listings", value: stats.activeListings ?? 0, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    { icon: <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />, label: "Pending Orders", value: stats.pendingOrders ?? 0, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    { icon: <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />, label: "Seller Rating", value: `${(user?.sellerScore ?? 5).toFixed(1)} ⭐`, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/70 text-sm">Seller Panel</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(" ")[0]}</h1>
            <p className="text-teal-100 text-sm mt-1">
              ID: <span className="font-mono bg-white/10 px-2 py-0.5 rounded-lg">{user?.sellerId || "Pending"}</span>
            </p>
          </div>
          <Link href="/seller/listings/new">
            <Button className="gap-2 bg-white text-teal-700 hover:bg-teal-50 font-bold shadow-lg rounded-xl">
              <PlusCircle className="w-4 h-4" /> Add Listing
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {statCards.map(card => (
            <div key={card.label} className={`bg-white border ${card.border} rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gray-50 rounded-xl flex items-center justify-center mb-2 sm:mb-3">
                {card.icon}
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${card.text}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          {[
            { href: "/seller/listings/new", icon: <PlusCircle className="w-5 h-5 text-teal-600" />, label: "Add Pet", desc: "Create listing", bg: "bg-teal-50" },
            { href: "/seller/listings", icon: <Package className="w-5 h-5 text-blue-600" />, label: "My Listings", desc: `${listings.length} total`, bg: "bg-blue-50" },
            { href: "/seller/orders", icon: <ShoppingBag className="w-5 h-5 text-amber-600" />, label: "Orders", desc: `${recentOrders.length} recent`, bg: "bg-amber-50" },
          ].map(action => (
            <Link key={action.href} href={action.href}>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer group">
                <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <p className="font-semibold text-gray-900 text-sm">{action.label}</p>
                <p className="text-xs text-gray-400">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-teal-600" /> Recent Orders
              </h2>
              <Link href="/seller/orders" className="text-teal-600 text-sm font-medium hover:text-teal-700 flex items-center gap-0.5">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {recentOrders.length ? (
              <div className="divide-y divide-gray-50">
                {recentOrders.slice(0, 5).map((order: any) => {
                  const firstItem = order.items?.[0];
                  const sellerEarning = Number(order.sellerNet ?? 0);
                  return (
                    <div key={order.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                          {firstItem && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {firstItem.breed ?? "Pet"} × {firstItem.quantity}
                              {order.items?.length > 1 && ` +${order.items.length - 1} more`}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-teal-700">{formatPrice(sellerEarning)}</p>
                          <p className="text-[10px] text-gray-400">your earning</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>{order.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No orders yet</p>
              </div>
            )}
          </div>

          {/* My Listings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> My Listings
              </h2>
              <Link href="/seller/listings" className="text-teal-600 text-sm font-medium hover:text-teal-700 flex items-center gap-0.5">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {listings.length ? (
              <div className="divide-y divide-gray-50">
                {listings.slice(0, 5).map((listing: any) => (
                  <div key={listing.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      {listing.photos?.[0] ? (
                        <img src={listing.photos[0]} alt={listing.breed} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{listing.breed}</p>
                      <p className="text-xs text-teal-600 font-medium">{formatPrice(Number(listing.price ?? 0))}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStatusColor(listing.status)}`}>
                      {listing.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <PawPrint className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-4">No listings yet</p>
                <Link href="/seller/listings/new">
                  <Button size="sm" className="rounded-xl">Add Your First Pet</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tips Banner */}
        <div className="mt-6 bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl p-5 text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold">Boost your sales!</p>
            <p className="text-teal-100 text-sm">Add high-quality photos and detailed descriptions to attract more buyers.</p>
          </div>
          <Link href="/seller/listings/new">
            <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10 rounded-xl flex-shrink-0">
              Add Listing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
