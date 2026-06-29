import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { ModalLock } from "@/components/ModalLock";
import {
  Wallet, CheckCircle, Clock, IndianRupee, TrendingUp,
  CreditCard, Edit2, Eye, Download, X, RefreshCw, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("pawzone_token");
  return fetch(`/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

export function TransporterPayoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDetails, setEditingDetails] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, txnRes] = await Promise.all([
        apiFetch("/payout/summary"),
        apiFetch("/payout/transactions"),
      ]);
      const sumData = await sumRes.json();
      const txnData = await txnRes.json();
      setSummary(sumData);
      setTransactions(txnData.transactions ?? []);
      if (sumData.details?.upiId) setUpiId(sumData.details.upiId);
    } catch {
      toast({ variant: "destructive", title: "Failed to load payout data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await apiFetch("/payout/details", {
        method: "PUT",
        body: JSON.stringify({ upiId: upiId.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Payment details saved!" });
      setEditingDetails(false);
      await load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setSavingDetails(false);
    }
  };

  const details = summary?.details;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Truck className="w-6 h-6" /> My Payout
              </h1>
              <p className="text-teal-100 text-sm mt-0.5">Track your delivery earnings and payments</p>
            </div>
            <button onClick={load} className="text-white/80 hover:text-white transition-colors shrink-0">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 space-y-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span className="text-xs text-gray-500 font-medium">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(summary?.totalEarnings ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{summary?.orderCount ?? 0} deliveries</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 font-medium">Total Paid</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatPrice(summary?.totalPaid ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{transactions.length} payouts received</p>
            </div>
            <div className="col-span-2 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 shadow-sm border border-teal-100">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="w-4 h-4 text-teal-700" />
                <span className="text-xs text-teal-700 font-semibold">Pending Payout</span>
              </div>
              <p className="text-3xl font-bold text-teal-700">{formatPrice(summary?.remaining ?? 0)}</p>
              {summary?.lastPayout && (
                <p className="text-xs text-teal-600 mt-1">
                  Last paid: {new Date(summary.lastPayout).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payment Details Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Payment Receiving Details</h2>
            </div>
            {!editingDetails && (
              <button
                onClick={() => setEditingDetails(true)}
                className="text-xs text-teal-600 font-medium flex items-center gap-1 hover:text-teal-800"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            {editingDetails ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. name@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={saveDetails} disabled={savingDetails} size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
                    {savingDetails ? "Saving..." : "Save Details"}
                  </Button>
                  <Button onClick={() => setEditingDetails(false)} variant="ghost" size="sm" className="rounded-xl">
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">UPI ID</p>
                  <p className="font-semibold text-gray-900 text-sm">{details?.upiId || <span className="text-gray-400 font-normal">Not set — click Edit to add</span>}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Payout History</h2>
            {transactions.length > 0 && (
              <span className="ml-auto text-xs bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">
                {transactions.length}
              </span>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No payouts received yet</p>
              <p className="text-xs text-gray-300 mt-1">Admin will process your payments here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map((txn: any) => (
                <div key={txn.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Paid by Admin
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{formatPrice(txn.amount)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Ref: <span className="font-mono text-gray-700">{txn.referenceNumber}</span></p>
                      {txn.note && <p className="text-xs text-gray-400 mt-0.5">{txn.note}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(txn.createdAt).toLocaleString("en-IN", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {txn.screenshotUrl && (
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <img
                          src={txn.screenshotUrl}
                          alt="Payment proof"
                          className="w-16 h-16 object-cover rounded-xl border border-gray-200 cursor-pointer"
                          onClick={() => setViewImage(txn.screenshotUrl)}
                        />
                        <button
                          onClick={() => setViewImage(txn.screenshotUrl)}
                          className="text-xs text-teal-600 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <ModalLock />
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={viewImage} alt="Full view" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
            <a
              href={viewImage}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-white text-sm font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
