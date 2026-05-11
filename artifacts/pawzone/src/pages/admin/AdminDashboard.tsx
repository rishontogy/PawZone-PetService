import { Link } from "wouter";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/api";
import {
  Users, Package, ShoppingBag, AlertTriangle, TrendingUp, Shield,
  ChevronRight, BarChart2, CheckCircle, Clock, DollarSign, Truck, Bell, CreditCard
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_transit: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetAdminDashboard({ query: { enabled: !!user } });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = (data as any)?.stats ?? {};
  const recentOrders = (data as any)?.recentOrders ?? [];

  const statCards = [
    { icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />, label: "Total Users", value: stats.totalUsers ?? 0, bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
    { icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />, label: "Pending Approvals", value: stats.pendingUsers ?? 0, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", alert: (stats.pendingUsers ?? 0) > 0 },
    { icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />, label: "Total Listings", value: stats.totalListings ?? 0, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    { icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />, label: "Pending Listings", value: stats.pendingListings ?? 0, bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", alert: (stats.pendingListings ?? 0) > 0 },
    { icon: <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />, label: "Total Orders", value: stats.totalOrders ?? 0, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
    { icon: <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />, label: "Platform Revenue", value: formatPrice(stats.platformRevenue ?? 0), bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    { icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />, label: "Open Disputes", value: stats.openDisputes ?? 0, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", alert: (stats.openDisputes ?? 0) > 0 },
    { icon: <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />, label: "Waitlist", value: stats.waitlistCount ?? 0, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  ];

  const quickActions = [
    { href: "/admin/users", icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />, label: "Manage Users", desc: "Approve sellers & transporters", bg: "bg-teal-50", badge: stats.pendingUsers > 0 ? stats.pendingUsers : null },
    { href: "/admin/listings", icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />, label: "Review Listings", desc: "Approve or reject pet listings", bg: "bg-blue-50", badge: stats.pendingListings > 0 ? stats.pendingListings : null },
    { href: "/admin/orders", icon: <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />, label: "All Orders", desc: "Monitor all platform orders", bg: "bg-purple-50", badge: null },
    { href: "/admin/accounting", icon: <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />, label: "Accounting", desc: "Revenue, ledger & transactions", bg: "bg-green-50", badge: null },
    { href: "/admin/disputes", icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />, label: "Disputes", desc: "Resolve buyer/seller disputes", bg: "bg-red-50", badge: stats.openDisputes > 0 ? stats.openDisputes : null },
    { href: "/admin/alerts", icon: <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />, label: "Alerts", desc: "System alerts & operations log", bg: "bg-yellow-50", badge: null },
    { href: "/admin/payments", icon: <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />, label: "Payments", desc: "Verify UPI payment proofs", bg: "bg-indigo-50", badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-7 sm:py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
              </div>
              <span className="text-gray-400 text-xs sm:text-sm">Admin Panel</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">PawZone Admin</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Manage the entire platform</p>
          </div>
          <div className="text-right">
            <p className="text-white font-semibold text-sm sm:text-base">{user?.name}</p>
            <p className="text-gray-400 text-xs">Super Administrator</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-4 pb-8 sm:pb-12">
        {/* Stats Grid — 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {statCards.map(card => (
            <div key={card.label} className={`bg-white border ${card.alert ? "border-red-300 shadow-red-100" : card.border} rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative`}>
              {card.alert && (
                <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gray-50 rounded-xl flex items-center justify-center mb-2 sm:mb-3">
                {card.icon}
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${card.text}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions — 1 col on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href}>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group flex items-center gap-3 sm:gap-4">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 ${action.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{action.label}</p>
                    {action.badge && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{action.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-teal-600 text-sm font-medium hover:text-teal-700 flex items-center gap-0.5">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {recentOrders.length ? (
            <>
              {/* Mobile card view */}
              <div className="divide-y divide-gray-50 sm:hidden">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="px-4 py-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-teal-700 font-semibold">#{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {order.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                      <div><span className="text-gray-400">Buyer: </span>{order.buyerName}</div>
                      <div><span className="text-gray-400">Seller: </span>{order.sellerName}</div>
                      {(order as any).transporterName && (
                        <div className="col-span-2"><span className="text-gray-400">Transporter: </span>{(order as any).transporterName}</div>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{formatPrice(Number((order as any).totalAmount ?? 0))}</p>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Order #", "Buyer", "Seller", "Transporter", "Amount", "Status"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-teal-700 font-semibold">#{order.orderNumber}</td>
                        <td className="px-5 py-3.5 text-gray-700">{order.buyerName}</td>
                        <td className="px-5 py-3.5 text-gray-700">{order.sellerName}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{(order as any).transporterName ?? "—"}</td>
                        <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(Number((order as any).totalAmount ?? 0))}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {order.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
