import { useParams, useLocation } from "wouter";
import { useGetOrder, useReportIssue } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor, statusLabel, getApiBase } from "@/lib/api";
import {
  ChevronLeft, Shield, AlertCircle, Package, CheckCircle,
  Truck, Clock, MapPin, Phone, User, ShoppingBag, CreditCard,
  PackageCheck, PackageOpen, Video, XCircle
} from "lucide-react";
import { useState } from "react";

type Stage = {
  key: string;
  label: string;
  icon: JSX.Element;
  isDone: (o: any) => boolean;
  doneAt: (o: any) => string | null;
};

const STAGES: Stage[] = [
  {
    key: "requested",
    label: "Order Requested",
    icon: <ShoppingBag className="w-4 h-4" />,
    isDone: (o) => !!o.createdAt,
    doneAt: (o) => o.createdAt ?? null,
  },
  {
    key: "seller_confirmed",
    label: "Seller Confirmed",
    icon: <CheckCircle className="w-4 h-4" />,
    isDone: (o) => ["confirmed", "ready", "picked_up", "in_transit", "delivered", "completed"].includes(o.status),
    doneAt: (o) => findTimelineAt(o, ["confirmed"]),
  },
  {
    key: "transport_assigned",
    label: "Transport Assigned",
    icon: <Truck className="w-4 h-4" />,
    isDone: (o) => !!o.transporterId,
    doneAt: (o) => findTimelineAt(o, ["transporter_assigned", "ready", "accepted"]) ?? null,
  },
  {
    key: "payment_completed",
    label: "Payment Completed",
    icon: <CreditCard className="w-4 h-4" />,
    isDone: (o) => o.paymentStatus === "paid",
    doneAt: (o) => findTimelineAt(o, ["paid", "payment"]) ?? o.paidAt ?? null,
  },
  {
    key: "picked_up",
    label: "Picked Up",
    icon: <Package className="w-4 h-4" />,
    isDone: (o) => !!o.pickedUpAt || ["picked_up", "in_transit", "delivered", "completed"].includes(o.status),
    doneAt: (o) => o.pickedUpAt ?? findTimelineAt(o, ["picked_up"]) ?? null,
  },
  {
    key: "in_transit",
    label: "In Transit",
    icon: <Truck className="w-4 h-4" />,
    isDone: (o) => !!o.inTransitAt || ["in_transit", "delivered", "completed"].includes(o.status),
    doneAt: (o) => o.inTransitAt ?? findTimelineAt(o, ["in_transit"]) ?? null,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: <PackageCheck className="w-4 h-4" />,
    isDone: (o) => !!o.deliveredAt || ["delivered", "completed"].includes(o.status),
    doneAt: (o) => o.deliveredAt ?? findTimelineAt(o, ["delivered"]) ?? null,
  },
  {
    key: "received",
    label: "Received Confirmation",
    icon: <PackageOpen className="w-4 h-4" />,
    isDone: (o) => !!o.receivedAt || o.status === "completed",
    doneAt: (o) => o.receivedAt ?? findTimelineAt(o, ["completed", "received"]) ?? null,
  },
];

function findTimelineAt(o: any, statuses: string[]): string | null {
  const tl = Array.isArray(o?.timeline) ? o.timeline : [];
  const found = tl
    .filter((t: any) => statuses.includes(String(t.status)))
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  return found?.createdAt ?? null;
}

function getEffectiveStatus(status: string, paymentStatus: string): string {
  if (status === "confirmed" && paymentStatus === "paid") return "paid";
  return status;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [issueDesc, setIssueDesc] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: order, refetch } = useGetOrder(parseInt(id!), { query: { enabled: !!user } } as any);

  const reportIssue = useReportIssue({
    mutation: {
      onSuccess: () => {
        toast({ title: "Issue reported", description: "Our admin team will review your dispute." });
        setShowIssue(false);
        refetch();
      },
    },
  });

  const handleBuyerCancel = async () => {
    setCancellingOrder(true);
    try {
      const res = await fetch(`${getApiBase()}/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to cancel order");
      toast({ title: "Order Cancelled", description: "Your order has been cancelled and stock restored." });
      setShowCancelConfirm(false);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message ?? "Could not cancel order" });
    } finally {
      setCancellingOrder(false);
    }
  };

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const o = order as any;
  const transportFeeAmount = Number(o.transportFee ?? 0);
  const subtotalAmount = Number(o.subtotal ?? 0);
  const platformFeeAmount = Number(o.platformFee ?? 0);
  // Final total = subtotal + platformFee + transportFee. Server already updates `total` once a transporter is assigned.
  const totalAmount = Number(o.totalAmount ?? subtotalAmount + platformFeeAmount + transportFeeAmount);
  const rawStatus = o.status ?? "pending";
  const paymentStatusVal = o.paymentStatus ?? "pending";
  const currentStatus = getEffectiveStatus(rawStatus, paymentStatusVal);
  const transporterAssigned = !!o.transporterId && transportFeeAmount > 0;

  // Payment deadline — prefer server-stored paymentDeadline (already applies night logic).
  // Fall back to computing locally with IST-aware night-order logic:
  // If order placed at or after 9 PM IST, timer starts next day 9 AM IST;
  // otherwise it starts from order creation. Buyer gets 3 hours from timerStart.
  let payDeadline: Date;
  if (o.paymentDeadline) {
    payDeadline = new Date(o.paymentDeadline);
  } else {
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
    const orderDate = new Date(o.createdAt);
    const orderInIST = new Date(orderDate.getTime() + IST_OFFSET_MS);
    const istHour = orderInIST.getUTCHours();
    let timerStart: Date;
    if (istHour >= 21) {
      // 9 AM IST next day = 3:30 AM UTC next day
      timerStart = new Date(orderInIST);
      timerStart.setUTCDate(timerStart.getUTCDate() + 1);
      timerStart.setUTCHours(3, 30, 0, 0);
    } else {
      timerStart = new Date(orderDate);
    }
    payDeadline = new Date(timerStart.getTime() + 3 * 60 * 60 * 1000);
  }
  const payExpired = new Date() > payDeadline;
  const timeLeft = Math.max(0, payDeadline.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / 3600000);
  const minsLeft = Math.floor((timeLeft % 3600000) / 60000);

  // NEW FLOW: buyer can pay only AFTER seller confirmed AND a transporter has accepted with a fee.
  const isPendingPayment = rawStatus === "confirmed" && transporterAssigned && paymentStatusVal !== "paid";
  const isAwaitingSeller = rawStatus === "pending" || rawStatus === "seller_confirmation_pending";
  const isAwaitingTransporter = rawStatus === "confirmed" && !transporterAssigned && paymentStatusVal !== "paid";
  const canReportIssue = ["paid", "ready", "picked_up", "in_transit", "delivered", "confirmed"].includes(rawStatus);
  // Buyer can cancel only before payment is confirmed
  const canBuyerCancel = paymentStatusVal !== "paid" && rawStatus !== "cancelled" && rawStatus !== "completed";

  // 8-stage progress tracker
  const stageStates = STAGES.map((s) => ({ ...s, done: s.isDone(o), at: s.doneAt(o) }));
  const lastDoneIdx = stageStates.reduce((acc, s, i) => (s.done ? i : acc), -1);
  const currentStageKey = lastDoneIdx >= 0 ? stageStates[lastDoneIdx].key : "requested";
  const isCancelled = rawStatus === "cancelled";
  const isDelivered = !!o.deliveredAt || ["delivered", "completed"].includes(rawStatus);
  const isReceived = !!o.receivedAt || rawStatus === "completed";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Order #{o.orderNumber}</h1>
            <p className="text-xs text-gray-400">
              {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(currentStatus)}`}>
            {statusLabel(currentStatus)}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Awaiting Seller Banner */}
        {isAwaitingSeller && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Waiting for seller to accept</p>
              <p className="text-sm text-blue-700 mt-0.5">
                Once the seller approves your request, you'll be able to complete payment.
              </p>
            </div>
          </div>
        )}

        {/* Awaiting Transporter Banner — seller confirmed, no transporter yet */}
        {isAwaitingTransporter && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900">Waiting for a transporter to accept</p>
              <p className="text-sm text-indigo-700 mt-0.5">
                Your seller has confirmed. A transporter will set the delivery charge soon. You'll be notified to complete payment with the final total.
              </p>
            </div>
          </div>
        )}

        {/* Payment Banner — only after transporter accepted */}
        {isPendingPayment && !payExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-800">Payment Required</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Complete payment within {hoursLeft}h {minsLeft}m to confirm your order.
                </p>
                <div className="mt-2 text-xs text-amber-800 bg-amber-100/60 rounded-lg p-2 space-y-0.5">
                  <div className="flex justify-between"><span>Items subtotal</span><span>{formatPrice(subtotalAmount)}</span></div>
                  <div className="flex justify-between"><span>Platform fee</span><span>{formatPrice(platformFeeAmount)}</span></div>
                  <div className="flex justify-between"><span>Transport charge</span><span>{formatPrice(transportFeeAmount)}</span></div>
                  <div className="flex justify-between font-bold border-t border-amber-300 pt-1 mt-1"><span>Final total</span><span>{formatPrice(totalAmount)}</span></div>
                </div>
                <Button
                  className="mt-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                  onClick={() => setLocation(`/buyer/orders/${id}/pay`)}
                >
                  Pay {formatPrice(totalAmount)} via UPI
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Retry payment banner */}
        {paymentStatusVal === "retry_allowed" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-800">Payment Rejected — Re-upload Required</p>
                <p className="text-sm text-red-700 mt-0.5">
                  Your payment proof was rejected. Please re-upload with the correct screenshot and reference number. This is your final chance — a second rejection will cancel the order.
                </p>
                <Button
                  className="mt-3 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                  onClick={() => setLocation(`/buyer/orders/${id}/pay`)}
                >
                  Re-upload Payment Proof
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pending verification banner */}
        {paymentStatusVal === "pending_verification" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Payment Proof Submitted</p>
              <p className="text-sm text-blue-700 mt-0.5">
                Your payment is being verified by our admin team. You will be notified once confirmed.
              </p>
            </div>
          </div>
        )}

        {isPendingPayment && payExpired && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-700">Payment window expired. Order will be cancelled.</p>
          </div>
        )}

        {/* 8-Stage Order Progress */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Order Progress</h2>
            <div className="hidden md:flex items-start gap-0">
              {stageStates.map((step, idx) => {
                const isCurrent = step.key === currentStageKey;
                const isLast = idx === stageStates.length - 1;
                const nextDone = stageStates[idx + 1]?.done;
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center min-w-0">
                    <div className="flex items-center w-full">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                        step.done && !isCurrent ? "bg-teal-600 text-white shadow-md" :
                        isCurrent ? "bg-green-500 text-white shadow-md ring-4 ring-green-200 animate-pulse" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {step.icon}
                      </div>
                      {!isLast && (
                        <div className={`flex-1 h-0.5 ${nextDone ? "bg-teal-600" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <p className={`text-[11px] mt-2 text-center leading-tight px-1 ${
                      isCurrent ? "text-green-700 font-bold" :
                      step.done ? "text-teal-700 font-semibold" : "text-gray-400"
                    }`}>
                      {step.label}
                    </p>
                    {step.at && !isNaN(new Date(step.at).getTime()) && (
                      <p className="text-[10px] text-gray-400 mt-0.5 text-center">
                        {new Date(step.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile vertical view */}
            <div className="md:hidden space-y-3">
              {stageStates.map((step) => {
                const isCurrent = step.key === currentStageKey;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done && !isCurrent ? "bg-teal-600 text-white" :
                      isCurrent ? "bg-green-500 text-white ring-4 ring-green-200" :
                      "bg-gray-100 text-gray-400"
                    }`}>{step.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        isCurrent ? "text-green-700 font-bold" :
                        step.done ? "text-teal-700 font-semibold" : "text-gray-400"
                      }`}>{step.label}</p>
                      {step.at && !isNaN(new Date(step.at).getTime()) && (
                        <p className="text-[10px] text-gray-400">
                          {new Date(step.at).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buyer Confirm Delivery (replaces received video upload) */}
        {isDelivered && !isReceived && (
          <ConfirmDeliveryCard orderId={parseInt(id!)} onDone={() => refetch()} />
        )}

        {/* Show videos uploaded throughout the journey */}
        {(o.preparedVideoUrl || o.pickupVideoUrl || o.deliveryVideoUrl || o.receivedVideoUrl) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-600" /> Journey Videos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {o.preparedVideoUrl && <VideoTile label="Prepared by Seller" url={o.preparedVideoUrl} />}
              {o.pickupVideoUrl && <VideoTile label="Picked Up by Transporter" url={o.pickupVideoUrl} />}
              {o.deliveryVideoUrl && <VideoTile label="Delivered" url={o.deliveryVideoUrl} />}
              {o.receivedVideoUrl && <VideoTile label="Your Received Confirmation" url={o.receivedVideoUrl} />}
            </div>
          </div>
        )}

        {/* Transporter Info */}
        {o.transporterName && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Your Transporter
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">{o.transporterName}</p>
                {o.transporterPhone && (
                  <a href={`tel:${o.transporterPhone}`} className="text-sm text-blue-700 flex items-center gap-1 hover:underline">
                    <Phone className="w-3 h-3" /> {o.transporterPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-600" /> Order Items
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {o.items?.map((item: any) => (
              <div key={item.id} className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {item.photo ? (
                    <img src={item.photo} alt={item.breed} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🐾</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.breed}</p>
                  <p className="text-sm text-gray-400">
                    {formatPrice(Number(item.unitPrice ?? item.price ?? 0))} × {item.quantity ?? 1}
                  </p>
                  {item.petCode && (
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="w-3 h-3 text-teal-600" />
                      <code className="text-xs text-teal-600 font-mono">{item.petCode}</code>
                    </div>
                  )}
                </div>
                <p className="font-bold text-gray-900">
                  {formatPrice(
                    Number(item.subtotal ?? (Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 1)))
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">Payment Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Item Total</span>
              <span>{formatPrice(subtotalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Buyer Platform Fee</span>
              <span>{formatPrice(platformFeeAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Transport Fee</span>
              {transportFeeAmount > 0 ? (
                <span className="font-medium">{formatPrice(transportFeeAmount)}</span>
              ) : (
                <span className="text-amber-600 text-xs italic">Added after transporter accepts</span>
              )}
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
              <span>Final Payable Amount</span>
              <span className="text-teal-600 text-lg">
                {formatPrice(subtotalAmount + platformFeeAmount + transportFeeAmount)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Payment status</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              o.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
              o.paymentStatus === "pending_verification" ? "bg-blue-100 text-blue-700" :
              o.paymentStatus === "retry_allowed" ? "bg-red-100 text-red-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {o.paymentStatus === "paid" ? "✓ Paid" :
               o.paymentStatus === "pending_verification" ? "Verifying" :
               o.paymentStatus === "retry_allowed" ? "Rejected – Retry" :
               "Pending"}
            </span>
          </div>
        </div>

        {/* Delivery Route Info */}
        {(o.pickupPoint || o.deliveryPoint || o.deliveryAddress) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" /> Delivery Route
            </h2>
            {o.pickupPoint && o.deliveryPoint ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Pickup Point</p>
                  <p className="font-bold text-green-800">{o.pickupPoint}</p>
                  <p className="text-xs text-green-600 mt-0.5">Seller → Transporter</p>
                </div>
                <div className="text-gray-300 font-bold text-xl">→</div>
                <div className="flex-1 bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">Delivery Point</p>
                  <p className="font-bold text-teal-800">{o.deliveryPoint}</p>
                  <p className="text-xs text-teal-600 mt-0.5">Transporter → You</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{o.deliveryAddress}</p>
            )}
            {o.notes && <p className="text-xs text-gray-400 mt-2">Note: {o.notes}</p>}
          </div>
        )}

        {/* Report Issue */}
        {/* Seller confirmation pending — admin has been notified */}
        {rawStatus === "seller_confirmation_pending" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-900">Seller Response Overdue</p>
              <p className="text-sm text-orange-700 mt-0.5">
                The seller has not yet confirmed your order. Our admin team has been notified and will step in shortly. You can also cancel this order below.
              </p>
            </div>
          </div>
        )}

        {/* Payment pending admin review */}
        {rawStatus === "payment_pending_admin_review" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Payment Window Expired — Admin Review</p>
              <p className="text-sm text-red-700 mt-0.5">
                Your payment window has expired. Admin has been notified. You may still complete payment below — the order will only be cancelled if admin decides so.
              </p>
              <Button
                className="mt-3 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                size="sm"
                onClick={() => setLocation(`/buyer/orders/${id}/pay`)}
              >
                Pay {formatPrice(subtotalAmount + platformFeeAmount + transportFeeAmount)} via UPI
              </Button>
            </div>
          </div>
        )}

        {/* Buyer Cancel Order */}
        {canBuyerCancel && (
          <div>
            {!showCancelConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => setShowCancelConfirm(true)}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel Order
              </Button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-orange-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-orange-600" /> Confirm Cancellation
                </h3>
                <p className="text-sm text-orange-700">
                  Are you sure you want to cancel this order? Stock will be restored and the order cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleBuyerCancel}
                    disabled={cancellingOrder}
                  >
                    {cancellingOrder ? "Cancelling…" : "Yes, Cancel Order"}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowCancelConfirm(false)}>Keep Order</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {canReportIssue && (
          <div>
            {!showIssue ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowIssue(true)}
              >
                <AlertCircle className="w-4 h-4 mr-1.5" /> Report an Issue
              </Button>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" /> Report Issue
                </h3>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  placeholder="Describe the issue with your order..."
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => reportIssue.mutate({ id: parseInt(id!), data: { description: issueDesc, issueType: "general" } as any })}
                    disabled={!issueDesc.trim() || reportIssue.isPending}
                  >
                    Submit Report
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowIssue(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoTile({ label, url }: { label: string; url: string }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <video src={url} controls className="w-full h-40 object-cover bg-black" />
      <p className="text-xs text-gray-600 px-3 py-2">{label}</p>
    </div>
  );
}

function ConfirmDeliveryCard({ orderId, onDone }: { orderId: number; onDone: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to confirm delivery");
      toast({ title: "Order completed!", description: "Thank you for confirming receipt of your pet." });
      onDone();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err?.message ?? "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
          <PackageOpen className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-emerald-900">Your pet has arrived!</p>
          <p className="text-sm text-emerald-800 mt-0.5">
            Confirm that you have received your pet to complete the order.
          </p>
          <Button
            size="sm"
            className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={confirm}
            disabled={busy}
            data-testid="button-confirm-delivery"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {busy ? "Confirming…" : "Confirm Delivery"}
          </Button>
        </div>
      </div>
    </div>
  );
}
