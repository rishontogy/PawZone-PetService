import { useState } from "react";
import { useGetOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor, statusLabel } from "@/lib/api";
import {
  Package, MapPin, Clock, User, CheckCircle,
  AlertCircle, ArrowLeft, X, Check
} from "lucide-react";
import { Link } from "wouter";

export function SellerOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [actingId, setActingId] = useState<number | null>(null);

  const { data, refetch } = useGetOrders(
    { page, limit: 20 } as any,
    { query: { enabled: !!user } }
  );

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: (_data, vars: any) => {
        const action = vars?.data?.status;
        const messages: Record<string, string> = {
          confirmed: "✅ Order accepted! Buyer notified to pay.",
          cancelled: "Order rejected. Buyer has been notified.",
          ready: "📦 Order marked ready for transporter pickup.",
        };
        toast({ title: messages[action] || "Order updated" });
        setActingId(null);
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to update order" });
        setActingId(null);
      },
    },
  });

  const handleAction = (id: number, status: "confirmed" | "cancelled" | "ready", note?: string) => {
    setActingId(id);
    updateStatus.mutate({ id, data: { status, note } as any });
  };

  const orders: any[] = (data as any)?.orders ?? [];
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const tabs = [
    { key: "all", label: "All", count: orders.length },
    { key: "pending", label: "New", count: orders.filter(o => o.status === "pending").length },
    { key: "confirmed", label: "Awaiting Pay", count: orders.filter(o => o.status === "confirmed").length },
    { key: "ready", label: "Ready", count: orders.filter(o => o.status === "ready").length },
    { key: "in_transit", label: "In Transit", count: orders.filter(o => o.status === "in_transit").length },
    { key: "delivered", label: "Delivered", count: orders.filter(o => o.status === "delivered").length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/seller">
            <button className="flex items-center gap-1.5 text-teal-100 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" /> Seller Orders
          </h1>
          <p className="text-teal-100 text-sm mt-1">{orders.length} total orders</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-4 pb-12">
        {/* Filter Tabs */}
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-2xl p-1.5 mb-6 shadow-sm overflow-x-auto w-fit max-w-full">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  filter === tab.key ? "bg-white/20" : "bg-gray-100"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {!filtered.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400">No orders in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order: any) => {
              const isPending = order.status === "pending";
              const isConfirmedAwaitingPay = order.status === "confirmed" && order.paymentStatus !== "paid";
              const isPaid = order.status === "confirmed" && order.paymentStatus === "paid";
              const isReady = order.status === "ready";
              const isDelivered = order.status === "delivered";
              const isActing = actingId === order.id;

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                          {isPending && (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Action required
                            </span>
                          )}
                          {isConfirmedAwaitingPay && (
                            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                              Buyer paying
                            </span>
                          )}
                          {isPaid && (
                            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                              💰 Paid — prepare pet
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {order.buyerName || "Buyer"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span>{order.itemCount} pet{order.itemCount !== 1 ? "s" : ""}</span>
                        </div>
                        {order.deliveryAddress && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{order.deliveryAddress}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 text-lg">{formatPrice(Number(order.totalAmount ?? order.total ?? 0))}</p>
                        {isDelivered && (
                          <p className="text-xs text-green-600 flex items-center gap-1 justify-end">
                            <CheckCircle className="w-3 h-3" /> Delivered
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {isPending && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <Button
                          size="sm"
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                          disabled={isActing}
                          onClick={() => handleAction(order.id, "confirmed")}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {isActing ? "Accepting..." : "Accept Order"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                          disabled={isActing}
                          onClick={() => {
                            const reason = window.prompt("Reason for rejecting this order? (optional)") ?? undefined;
                            handleAction(order.id, "cancelled", reason);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}

                    {isPaid && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Button
                          size="sm"
                          className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={isActing}
                          onClick={() => handleAction(order.id, "ready")}
                        >
                          <Package className="w-4 h-4 mr-1" />
                          {isActing ? "Updating..." : "Mark Ready for Pickup"}
                        </Button>
                      </div>
                    )}

                    {isReady && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-purple-700 bg-purple-50 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        Waiting for a transporter to accept this order...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {(data as any)?.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl">
              Previous
            </Button>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= (data as any).totalPages} className="rounded-xl">
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
