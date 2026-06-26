import { useState } from "react";
import { useAdminGetPaymentProofs, useAdminApprovePaymentProof, useAdminRejectPaymentProof } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/api";
import { CheckCircle, XCircle, Clock, CreditCard, ExternalLink, AlertCircle } from "lucide-react";

const STATUS_TABS = [
  { key: undefined, label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export function AdminPaymentsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<number | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const { data, refetch, isLoading } = useAdminGetPaymentProofs(
    statusFilter ? { status: statusFilter as any } : {} as any,
    { query: { refetchInterval: 15000 } }
  );

  const approve = useAdminApprovePaymentProof({
    mutation: {
      onSuccess: () => { toast({ title: "Payment approved!", description: "Buyer has been notified." }); refetch(); },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e?.data?.error }),
    },
  });

  const reject = useAdminRejectPaymentProof({
    mutation: {
      onSuccess: () => { toast({ title: "Payment rejected", description: "Buyer notified to retry or cancel." }); refetch(); setShowRejectInput(null); },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e?.data?.error }),
    },
  });

  const proofs: any[] = (data as any)?.proofs ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6" /> Pending Payments
              </h1>
              <p className="text-teal-100 text-sm mt-0.5">Verify UPI payment proofs submitted by buyers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-4 pb-12">
        {/* Filter Tabs */}
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-2xl p-1.5 mb-6 shadow-sm w-fit">
          {STATUS_TABS.map(tab => (
            <button
              key={String(tab.key)}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === tab.key
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !proofs.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No payment proofs found</p>
            <p className="text-gray-400 text-sm mt-1">Payment submissions will appear here for verification</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proofs.map((proof: any) => (
              <div
                key={proof.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  proof.status === "pending" ? "border-amber-200" :
                  proof.status === "approved" ? "border-green-200" :
                  "border-red-200"
                }`}
              >
                <div className={`px-5 py-3 border-b flex items-center justify-between ${
                  proof.status === "pending" ? "bg-amber-50 border-amber-100" :
                  proof.status === "approved" ? "bg-green-50 border-green-100" :
                  "bg-red-50 border-red-100"
                }`}>
                  <div className="flex items-center gap-2">
                    {proof.status === "pending" && <Clock className="w-4 h-4 text-amber-600" />}
                    {proof.status === "approved" && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {proof.status === "rejected" && <XCircle className="w-4 h-4 text-red-600" />}
                    <span className={`text-sm font-bold ${
                      proof.status === "pending" ? "text-amber-800" :
                      proof.status === "approved" ? "text-green-800" : "text-red-800"
                    }`}>
                      {proof.status === "pending" ? "Pending Verification" :
                       proof.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                    {proof.rejectionCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {proof.rejectionCount} rejection{proof.rejectionCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(proof.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Order</p>
                        <p className="font-bold text-gray-900">#{proof.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Amount</p>
                        <p className="font-bold text-teal-700 text-lg">{formatPrice(Number(proof.totalAmount ?? 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Buyer</p>
                        <p className="font-semibold text-gray-900">{proof.buyerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Payment Date</p>
                        <p className="font-semibold text-gray-900">{proof.paymentDate}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Reference Number</p>
                      <code className="font-mono bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-800 block">{proof.referenceNumber}</code>
                    </div>
                    {proof.adminNote && (
                      <div className="bg-red-50 rounded-xl p-3">
                        <p className="text-xs text-red-700 font-semibold uppercase tracking-wide mb-0.5">Rejection Note</p>
                        <p className="text-sm text-red-700">{proof.adminNote}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {proof.status === "pending" && (
                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approve.mutate({ id: proof.id })}
                            disabled={approve.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Approve Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setShowRejectInput(showRejectInput === proof.id ? null : proof.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                        {showRejectInput === proof.id && (
                          <div className="space-y-2">
                            {proof.rejectionCount >= 1 && (
                              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>This is the buyer's second rejection. Rejecting will permanently cancel the order.</span>
                              </div>
                            )}
                            <input
                              type="text"
                              placeholder="Reason for rejection (optional)"
                              value={rejectNote[proof.id] ?? ""}
                              onChange={(e) => setRejectNote(prev => ({ ...prev, [proof.id]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                            />
                            <Button
                              size="sm"
                              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => reject.mutate({ id: proof.id, data: { note: rejectNote[proof.id] || undefined } as any })}
                              disabled={reject.isPending}
                            >
                              Confirm Rejection
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Screenshot */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Payment Screenshot</p>
                    <div
                      className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setViewImage(proof.screenshotUrl)}
                    >
                      <img
                        src={proof.screenshotUrl}
                        alt="Payment screenshot"
                        className="w-full max-h-56 object-contain bg-gray-50"
                      />
                      <div className="flex items-center gap-1 justify-center py-2 text-xs text-gray-500">
                        <ExternalLink className="w-3 h-3" />
                        Tap to enlarge
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <img
            src={viewImage}
            alt="Payment screenshot enlarged"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
