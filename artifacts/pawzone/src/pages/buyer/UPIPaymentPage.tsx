import { useParams, useLocation } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/api";
import {
  ChevronLeft, QrCode, Copy, Upload, CheckCircle, AlertCircle, Clock, X,
} from "lucide-react";
import { useState, useRef } from "react";

const UPI_ID = "rishontogy5050@oksbi";

export function UPIPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: order, refetch } = useGetOrder(parseInt(id!), { query: { enabled: !!user } } as any);

  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const o = order as any;
  if (!o) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const transportFeeAmount = Number(o.transportFee ?? 0);
  const subtotalAmount = Number(o.subtotal ?? 0);
  const platformFeeAmount = Number(o.platformFee ?? 0);
  const totalAmount = Number(o.totalAmount ?? subtotalAmount + platformFeeAmount + transportFeeAmount);
  const paymentStatus = o.paymentStatus ?? "pending";
  const isRetry = paymentStatus === "retry_allowed";
  const isPendingVerification = paymentStatus === "pending_verification";

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast({ title: "UPI ID copied!" });
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setScreenshotBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!screenshotBase64) {
      toast({ variant: "destructive", title: "Upload your payment screenshot" });
      return;
    }
    if (!referenceNumber.trim()) {
      toast({ variant: "destructive", title: "Enter the transaction reference number" });
      return;
    }
    if (!paymentDate) {
      toast({ variant: "destructive", title: "Select the payment date" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${id}/payment-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ screenshotUrl: screenshotBase64, referenceNumber: referenceNumber.trim(), paymentDate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      setDone(true);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission failed", description: err.message });
    }
    setSubmitting(false);
  };

  if (done || isPendingVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-teal-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Proof Submitted</h2>
          <p className="text-gray-500 text-sm">
            Your payment is being verified by our admin team. You will be notified once confirmed.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Verification usually takes a few hours. You can track the status on your order page.</span>
          </div>
          <Button className="w-full rounded-xl" onClick={() => setLocation(`/buyer/orders/${id}`)}>
            Back to Order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-gray-900">UPI Payment</h1>
          <p className="text-xs text-gray-400">Order #{o.orderNumber}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {isRetry && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Payment Rejected — Re-upload Required</p>
              <p className="text-sm text-red-700 mt-0.5">
                Your previous payment proof was rejected. Please upload a correct screenshot. This is your final attempt — a second rejection will cancel the order.
              </p>
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal-600" />
            Scan QR to Pay
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="border-2 border-teal-100 rounded-2xl p-3 bg-white">
              <img
                src="/upi-qr.jpg"
                alt="UPI QR Code"
                className="w-56 h-56 object-contain"
              />
            </div>
            <div className="text-center space-y-2 w-full">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">UPI ID</p>
              <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
                <code className="font-mono text-teal-700 font-bold text-sm">{UPI_ID}</code>
                <button
                  onClick={copyUpiId}
                  className="text-gray-400 hover:text-teal-600 transition-colors"
                  title="Copy UPI ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                <p className="text-xs text-teal-700 font-semibold uppercase tracking-wide mb-0.5">Amount to Pay</p>
                <p className="text-2xl font-extrabold text-teal-700">{formatPrice(totalAmount)}</p>
                <div className="mt-2 text-[11px] text-teal-600 space-y-0.5">
                  <div className="flex justify-between"><span>Items subtotal</span><span>{formatPrice(subtotalAmount)}</span></div>
                  <div className="flex justify-between"><span>Platform fee</span><span>{formatPrice(platformFeeAmount)}</span></div>
                  <div className="flex justify-between"><span>Transport charge</span><span>{formatPrice(transportFeeAmount)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Proof */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Upload Payment Proof</h2>
          <p className="text-sm text-gray-500">After paying via UPI, upload your payment screenshot along with the reference number and date.</p>

          {/* Screenshot Upload */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Payment Screenshot *</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            {screenshotBase64 ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={screenshotBase64} alt="Payment screenshot" className="w-full max-h-64 object-contain bg-gray-50" />
                <button
                  onClick={() => { setScreenshotBase64(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-white rounded-full shadow p-1 text-red-500 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Tap to upload screenshot</span>
                <span className="text-xs">JPG, PNG supported</span>
              </button>
            )}
          </div>

          {/* Reference Number */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Transaction Reference Number *</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 432001829384"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <Button
            className="w-full h-12 rounded-xl text-base font-bold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Done — Submit for Verification"}
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Admin will verify your payment within a few hours. Do not close this page until submitted.
          </p>
        </div>
      </div>
    </div>
  );
}
