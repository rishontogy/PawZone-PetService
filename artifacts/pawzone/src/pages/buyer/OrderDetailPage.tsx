import { useParams, useLocation } from "wouter";
import { useGetOrder, useProcessPayment, useReportIssue } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor, statusLabel, platformFee } from "@/lib/api";
import {
  ChevronLeft, Shield, AlertCircle, Package, CheckCircle,
  Truck, Clock, MapPin, Phone, Star, User
} from "lucide-react";
import { useState } from "react";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: <Package className="w-4 h-4" /> },
  { key: "confirmed", label: "Seller Accepted", icon: <CheckCircle className="w-4 h-4" /> },
  { key: "paid", label: "Paid", icon: <CheckCircle className="w-4 h-4" /> },
  { key: "ready", label: "Ready for Pickup", icon: <Package className="w-4 h-4" /> },
  { key: "in_transit", label: "In Transit", icon: <Truck className="w-4 h-4" /> },
  { key: "delivered", label: "Delivered", icon: <CheckCircle className="w-4 h-4" /> },
];

const STEP_ORDER = ["pending", "confirmed", "paid", "ready", "picked_up", "in_transit", "delivered"];

function getEffectiveStatus(status: string, paymentStatus: string): string {
  // "paid" is a virtual progress step: order is "confirmed" AND payment received.
  if (status === "confirmed" && paymentStatus === "paid") return "paid";
  return status;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [issueDesc, setIssueDesc] = useState("");
  const [showIssue, setShowIssue] = useState(false);

  const { data: order, refetch } = useGetOrder(parseInt(id!), { query: { enabled: !!user } } as any);

  const processPayment = useProcessPayment({
    mutation: {
      onSuccess: () => { toast({ title: "✅ Payment confirmed!" }); refetch(); },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Payment failed", description: err?.data?.error });
      },
    },
  });

  const reportIssue = useReportIssue({
    mutation: {
      onSuccess: () => {
        toast({ title: "Issue reported", description: "Our admin team will review your dispute." });
        setShowIssue(false);
        refetch();
      },
    },
  });

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const o = order as any;
  const totalAmount = Number(o.totalAmount ?? 0);
  const subtotalAmount = Number(o.subtotal ?? totalAmount);
  const platformFeeAmount = Number(o.platformFee ?? 0);
  const rawStatus = o.status ?? "pending";
  const paymentStatusVal = o.paymentStatus ?? "pending";
  const currentStatus = getEffectiveStatus(rawStatus, paymentStatusVal);

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

  // Buyer can pay only AFTER seller has accepted the order (status=confirmed) and payment hasn't been made.
  const isPendingPayment = rawStatus === "confirmed" && paymentStatusVal !== "paid";
  const isAwaitingSeller = rawStatus === "pending";
  const canReportIssue = ["paid", "ready", "picked_up", "in_transit", "delivered", "confirmed"].includes(rawStatus);

  // Progress tracker
  const currentStepIdx = STEP_ORDER.indexOf(currentStatus);
  const isDelivered = currentStatus === "delivered";
  const isCancelled = currentStatus === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => setLocation("/buyer/orders")}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
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

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
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

        {/* Payment Banner */}
        {isPendingPayment && !payExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-800">Payment Required</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Complete payment within {hoursLeft}h {minsLeft}m to confirm your order.
                </p>
                <Button
                  className="mt-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                  onClick={() => processPayment.mutate({ id: parseInt(id!), data: { method: "upi", amount: totalAmount } as any })}
                  disabled={processPayment.isPending}
                >
                  {processPayment.isPending ? "Processing..." : `Pay ${formatPrice(totalAmount)}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isPendingPayment && payExpired && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-700">Payment window expired. Order will be cancelled.</p>
          </div>
        )}

        {/* Order Progress */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Order Progress</h2>
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, idx) => {
                const stepIdx = STEP_ORDER.indexOf(step.key);
                const done = currentStepIdx >= stepIdx && !isCancelled;
                const active = currentStepIdx === stepIdx;
                const isLast = idx === STATUS_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center">
                    <div className="flex items-center w-full">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                        done ? "bg-teal-600 text-white shadow-md" :
                        active ? "bg-teal-100 text-teal-600 border-2 border-teal-600" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {step.icon}
                      </div>
                      {!isLast && (
                        <div className={`flex-1 h-0.5 ${done && currentStepIdx > stepIdx ? "bg-teal-600" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <p className={`text-xs mt-2 text-center leading-tight ${done ? "text-teal-700 font-semibold" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
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
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPrice(subtotalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform fees</span>
              <span>{formatPrice(platformFeeAmount)}</span>
            </div>
            {Number(o.deliveryFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery fee</span>
                <span>{formatPrice(Number(o.deliveryFee))}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
              <span>Total Paid</span>
              <span className="text-teal-600 text-lg">{formatPrice(totalAmount)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Payment method</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              o.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}>
              {o.paymentStatus === "paid" ? "✓ Paid" : "Pending"}
            </span>
          </div>
        </div>

        {/* Delivery Address */}
        {o.deliveryAddress && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" /> Delivery Address
            </h2>
            <p className="text-sm text-gray-600">{o.deliveryAddress}</p>
            {o.notes && <p className="text-xs text-gray-400 mt-2">Note: {o.notes}</p>}
          </div>
        )}

        {/* Timeline */}
        {o.timeline && o.timeline.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" /> Order Timeline
            </h2>
            <div className="space-y-4">
              {o.timeline.map((event: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${i === 0 ? "bg-teal-600" : "bg-gray-300"}`} />
                    {i < o.timeline.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-gray-800 capitalize">{event.status?.replace(/_/g, " ")}</p>
                    {event.note && <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(event.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Issue */}
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

