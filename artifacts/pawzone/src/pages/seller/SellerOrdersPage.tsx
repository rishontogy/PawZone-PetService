import { useRef, useState } from "react";
import { useGetOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor, statusLabel } from "@/lib/api";
import {
  Package, Clock, User, CheckCircle, ChevronDown, ChevronUp,
  AlertCircle, X, Check, Video, Upload, Phone, Truck, IndianRupee
} from "lucide-react";

export function SellerOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [actingId, setActingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, refetch } = useGetOrders(
    { page, limit: 20 } as any,
    { query: { enabled: !!user } }
  );

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: (_data, vars: any) => {
        const action = vars?.data?.status;
        const messages: Record<string, string> = {
          confirmed: "Order accepted! Buyer notified to pay.",
          cancelled: "Order rejected. Buyer has been notified.",
          ready: "Order marked ready for transporter pickup.",
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
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" /> Seller Orders
          </h1>
          <p className="text-teal-100 text-sm mt-1">{orders.length} total orders</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-4 pb-12">
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
              const isExpanded = expandedId === order.id;

              const orderItems: any[] = order.orderItems ?? [];
              const itemSubtotal = orderItems.reduce((s: number, it: any) => s + Number(it.subtotal ?? 0), 0);
              const platformFee = Number(order.platformFee ?? 0);
              const sellerEarning = itemSubtotal - platformFee;
              const transportCharge = Number(order.deliveryFee ?? order.transportFee ?? 0);

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Header row — always visible */}
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
                              Paid — prepare pet
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span>{orderItems.length || order.itemCount || "?"} pet{(orderItems.length || order.itemCount) !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-teal-700 text-lg">{formatPrice(sellerEarning > 0 ? sellerEarning : Number(order.totalAmount ?? 0))}</p>
                        <p className="text-[10px] text-gray-400">{sellerEarning > 0 ? "your earning" : "order total"}</p>
                        {isDelivered && (
                          <p className="text-xs text-green-600 flex items-center gap-1 justify-end mt-1">
                            <CheckCircle className="w-3 h-3" /> Delivered
                          </p>
                        )}
                      </div>
                    </div>

                    {/* View Details toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium mt-1"
                      data-testid={`button-toggle-order-${order.id}`}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? "Hide Details" : "View Details"}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        {/* Order Items */}
                        {orderItems.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pets Ordered</p>
                            <div className="space-y-2">
                              {orderItems.map((item: any, idx: number) => (
                                <div key={item.id ?? idx} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{item.breed ?? item.name ?? "Pet"}</p>
                                      <p className="text-xs text-gray-500">
                                        {formatPrice(Number(item.unitPrice ?? 0))} × {item.quantity}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="font-semibold text-gray-900 text-sm flex-shrink-0">{formatPrice(Number(item.subtotal ?? 0))}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Financial Breakdown */}
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" /> Earnings Breakdown
                          </p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Pet subtotal</span>
                              <span className="font-medium">{formatPrice(itemSubtotal)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Platform fee</span>
                              <span>− {formatPrice(platformFee)}</span>
                            </div>
                            {transportCharge > 0 && (
                              <div className="flex justify-between text-blue-600">
                                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Transport charge</span>
                                <span>{formatPrice(transportCharge)}</span>
                              </div>
                            )}
                            <div className="border-t border-teal-200 pt-1.5 flex justify-between font-bold text-teal-800">
                              <span>Your earnings</span>
                              <span>{formatPrice(Math.max(0, sellerEarning))}</span>
                            </div>
                          </div>
                        </div>

                        {/* Transporter Info */}
                        {order.transporterId ? (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Transporter Info
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-800 flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-blue-400" /> {order.transporterName || "Assigned"}
                              </p>
                              {order.transporterPhone && (
                                <p className="text-sm text-gray-800 flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                                  <a href={`tel:${order.transporterPhone}`} className="text-blue-600 hover:underline">{order.transporterPhone}</a>
                                </p>
                              )}
                              {order.pickupTime && (
                                <p className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                                  Pickup: {new Date(order.pickupTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                              {order.deliveryTime && (
                                <p className="text-xs text-gray-600 flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                                  Est. delivery: {new Date(order.deliveryTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> No transporter assigned yet
                          </p>
                        )}
                      </div>
                    )}

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
                      <PreparedVideoBlock
                        orderId={order.id}
                        existingUrl={order.preparedVideoUrl}
                        isActing={isActing}
                        onMarkReady={() => handleAction(order.id, "ready")}
                        onUploaded={() => refetch()}
                      />
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

function PreparedVideoBlock({
  orderId,
  existingUrl,
  isActing,
  onMarkReady,
  onUploaded,
}: {
  orderId: number;
  existingUrl?: string | null;
  isActing: boolean;
  onMarkReady: () => void;
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(existingUrl ?? null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Please select a video file" });
      return;
    }
    setBusy(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const fd = new FormData();
      fd.append("file", f);
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: fd,
      });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson?.error || "Upload failed");

      const save = await fetch(`/api/orders/${orderId}/prepared-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ videoUrl: upJson.url }),
      });
      const saveJson = await save.json();
      if (!save.ok) throw new Error(saveJson?.error || "Failed to save prepared video");

      setLocalUrl(upJson.url);
      toast({ title: "Prepared video uploaded", description: "You can now mark this order ready." });
      onUploaded();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Video className="w-4 h-4 text-purple-700 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-900">Prepared Video Required</p>
            <p className="text-xs text-purple-700">
              Upload a short video showing the pet ready for handover before marking ready for transport.
            </p>
          </div>
        </div>
        {localUrl && (
          <div className="mt-2">
            <video src={localUrl} controls className="w-full max-w-xs h-32 object-cover rounded-lg bg-black" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          data-testid={`input-prepared-video-${orderId}`}
          onChange={onPick}
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            data-testid={`button-upload-prepared-${orderId}`}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {busy ? "Uploading…" : localUrl ? "Replace Video" : "Upload Prepared Video"}
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isActing || !localUrl}
            onClick={onMarkReady}
            data-testid={`button-mark-ready-${orderId}`}
          >
            <Package className="w-4 h-4 mr-1" />
            {isActing ? "Updating..." : "Mark Ready for Pickup"}
          </Button>
        </div>
        {!localUrl && (
          <p className="text-xs text-purple-600 mt-2">
            Upload a video first to enable Mark Ready.
          </p>
        )}
      </div>
    </div>
  );
}
