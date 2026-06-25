import { useState } from "react";
import { Link } from "wouter";
import { useGetOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { formatPrice, getStatusColor, statusLabel } from "@/lib/api";
import { Package, ChevronRight, ShoppingBag, Clock, CheckCircle, AlertCircle, Truck } from "lucide-react";

const STATUS_ICONS: Record<string, JSX.Element> = {
  pending: <Clock className="w-4 h-4 text-amber-500" />,
  confirmed: <AlertCircle className="w-4 h-4 text-blue-500" />,
  ready: <Package className="w-4 h-4 text-purple-500" />,
  picked_up: <Truck className="w-4 h-4 text-indigo-500" />,
  in_transit: <Truck className="w-4 h-4 text-indigo-600" />,
  delivered: <CheckCircle className="w-4 h-4 text-green-500" />,
  cancelled: <AlertCircle className="w-4 h-4 text-gray-400" />,
  refunded: <AlertCircle className="w-4 h-4 text-gray-400" />,
};

export function BuyerOrdersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useGetOrders(
    { page, limit: 10 } as any,
    { query: { enabled: !!user } }
  );

  const orders: any[] = (data as any)?.orders ?? [];
  const filtered = filter === "all" ? orders : filter === "active"
    ? orders.filter(o => !["delivered", "cancelled", "refunded"].includes(o.status))
    : orders.filter(o => o.status === "delivered");

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <BackButton className="mb-4" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" /> My Orders
              </h1>
              <p className="text-teal-100 text-sm mt-1">{orders.length} total orders</p>
            </div>
            <Link href="/listings">
              <Button className="bg-white text-teal-700 hover:bg-teal-50 font-bold rounded-xl shadow-lg text-sm whitespace-nowrap">
                Browse More Pets
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 pb-12">
        {/* Filter Tabs */}
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-2xl p-1.5 mb-6 shadow-sm w-fit">
          {[
            { key: "all", label: "All Orders" },
            { key: "active", label: "Active" },
            { key: "delivered", label: "Delivered" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === tab.key
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!filtered.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No orders yet</h3>
            <p className="text-gray-400 text-sm mb-6">Browse our listings to find your perfect pet companion.</p>
            <Link href="/listings">
              <Button className="rounded-xl px-8">Browse Pets</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order: any) => (
              <Link key={order.id} href={`/buyer/orders/${order.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        {STATUS_ICONS[order.status] ?? <Package className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-900">Order #{order.orderNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{order.itemCount} pet{order.itemCount !== 1 ? "s" : ""}
                        </p>
                        {order.status === "pending" && (
                          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Waiting for seller to accept
                          </p>
                        )}
                        {order.status === "confirmed" && order.paymentStatus !== "paid" && (
                          <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Seller accepted — tap to pay
                          </p>
                        )}
                        {order.status === "in_transit" && (
                          <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Your pet is on the way!
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatPrice(Number(order.totalAmount ?? 0))}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {(data as any)?.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl">
              Previous
            </Button>
            <span className="flex items-center text-sm text-gray-500 px-2">Page {page} of {(data as any).totalPages}</span>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= (data as any).totalPages} className="rounded-xl">
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
