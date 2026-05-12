import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/api";
import {
  Wallet, Users, IndianRupee, TrendingUp, CheckCircle, QrCode,
  Upload, X, Eye, ChevronRight, RefreshCw, Search, Truck, Store, Download,
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

async function uploadFile(file: File): Promise<string> {
  const token = localStorage.getItem("pawzone_token");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

export function AdminPayoutsPage() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "seller" | "transporter">("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Payout form state
  const [amount, setAmount] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/payouts");
      const data = await res.json();
      setPayouts(data.payouts ?? []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load payout data" });
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetail = async (userId: number) => {
    setLoadingDetail(true);
    try {
      const res = await apiFetch(`/admin/payouts/${userId}`);
      const data = await res.json();
      setUserDetail(data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load user details" });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (user: any) => {
    setSelectedUser(user);
    setUserDetail(null);
    setAmount("");
    setRefNumber("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setNote("");
    loadUserDetail(user.id);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setUserDetail(null);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const recordPayout = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Amount must be greater than 0" });
      return;
    }
    if (!refNumber.trim()) {
      toast({ variant: "destructive", title: "Reference number is required" });
      return;
    }
    if (!screenshotFile) {
      toast({ variant: "destructive", title: "Payment screenshot is required" });
      return;
    }
    setSubmitting(true);
    try {
      const screenshotUrl = await uploadFile(screenshotFile);
      const res = await apiFetch(`/admin/payouts/${selectedUser.id}/record`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          referenceNumber: refNumber.trim(),
          screenshotUrl,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Payout recorded!", description: `₹${Number(amount).toLocaleString("en-IN")} paid to ${selectedUser.name}` });
      setAmount("");
      setRefNumber("");
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setNote("");
      await Promise.all([load(), loadUserDetail(selectedUser.id)]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to record payout", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payouts.filter((p) => {
    const matchRole = roleFilter === "all" || p.role === roleFilter;
    const matchQ = !searchQ.trim() || p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.email.toLowerCase().includes(searchQ.toLowerCase());
    return matchRole && matchQ;
  });

  const totalPending = filtered.reduce((s, p) => s + (p.remaining ?? 0), 0);
  const totalEarnings = filtered.reduce((s, p) => s + (p.totalEarnings ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-600 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6" /> Payout Management
              </h1>
              <p className="text-violet-100 text-sm mt-1">Manage payouts to sellers and transporters</p>
            </div>
            <button onClick={load} className="text-white/80 hover:text-white transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Platform Overview */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white/15 rounded-2xl p-3">
              <p className="text-xs text-violet-200">Total Earnings (Filtered)</p>
              <p className="text-xl font-bold text-white mt-0.5">{formatPrice(totalEarnings)}</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3">
              <p className="text-xs text-violet-200">Pending Payouts</p>
              <p className="text-xl font-bold text-white mt-0.5">{formatPrice(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "seller", "transporter"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  roleFilter === r ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
              </button>
            ))}
          </div>
        </div>

        {/* Payout List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-28" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No approved sellers or transporters found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => openModal(p)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-violet-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      p.role === "seller" ? "bg-teal-100" : "bg-blue-100"
                    }`}>
                      {p.role === "seller"
                        ? <Store className="w-5 h-5 text-teal-600" />
                        : <Truck className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.role === "seller" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {p.role}
                        </span>
                        {p.upiId && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <QrCode className="w-2.5 h-2.5" /> UPI set
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{p.email}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-400">Earnings</p>
                          <p className="text-sm font-semibold text-gray-700">{formatPrice(p.totalEarnings)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Paid</p>
                          <p className="text-sm font-semibold text-green-600">{formatPrice(p.totalPaid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Pending</p>
                          <p className={`text-sm font-bold ${p.remaining > 0 ? "text-red-500" : "text-gray-400"}`}>
                            {formatPrice(p.remaining)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors flex-shrink-0 mt-2" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-5 py-4 flex items-center justify-between border-b border-gray-100 ${
              selectedUser.role === "seller" ? "bg-teal-50" : "bg-blue-50"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  selectedUser.role === "seller" ? "bg-teal-100" : "bg-blue-100"
                }`}>
                  {selectedUser.role === "seller"
                    ? <Store className="w-4 h-4 text-teal-600" />
                    : <Truck className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selectedUser.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{selectedUser.role}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {loadingDetail ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : userDetail ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Total Earnings</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{formatPrice(userDetail.totalEarnings)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Total Paid</p>
                      <p className="text-sm font-bold text-green-600 mt-0.5">{formatPrice(userDetail.totalPaid)}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${userDetail.remaining > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className={`text-sm font-bold mt-0.5 ${userDetail.remaining > 0 ? "text-red-500" : "text-gray-400"}`}>
                        {formatPrice(userDetail.remaining)}
                      </p>
                    </div>
                  </div>

                  {/* UPI Details */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Details</p>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">UPI ID</p>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5">
                          {userDetail.upiId || <span className="text-gray-400 font-normal">Not provided</span>}
                        </p>
                      </div>
                      {userDetail.qrCodeUrl && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">QR Code</p>
                          <img
                            src={userDetail.qrCodeUrl}
                            alt="QR Code"
                            className="w-20 h-20 object-contain border border-gray-200 rounded-xl cursor-pointer"
                            onClick={() => setViewImage(userDetail.qrCodeUrl)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Record Payout Form */}
                  <div className="border border-violet-200 rounded-2xl p-4 space-y-3 bg-violet-50/30">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Record New Payment</p>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (₹)</label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        min="1"
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">UPI Reference Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 402312345678"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payment Screenshot</label>
                      <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-violet-200 rounded-xl p-3 hover:border-violet-400 hover:bg-violet-50 transition-colors">
                        <Upload className="w-4 h-4 text-violet-400" />
                        <span className="text-sm text-gray-500">
                          {screenshotFile ? screenshotFile.name : "Upload screenshot"}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotChange} />
                      </label>
                      {screenshotPreview && (
                        <img
                          src={screenshotPreview}
                          alt="Preview"
                          className="mt-2 w-full max-h-40 object-contain border border-gray-200 rounded-xl"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                      <input
                        type="text"
                        placeholder="Any note for this payment"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <Button
                      onClick={recordPayout}
                      disabled={submitting}
                      className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-11 font-semibold"
                    >
                      {submitting ? "Processing..." : "Update Payout"}
                    </Button>
                  </div>

                  {/* Previous Transactions */}
                  {userDetail.transactions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Payout History</p>
                      <div className="space-y-2">
                        {userDetail.transactions.map((txn: any) => (
                          <div key={txn.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                <p className="font-bold text-gray-900 text-sm">{formatPrice(txn.amount)}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 font-mono">Ref: {txn.referenceNumber}</p>
                              {txn.note && <p className="text-xs text-gray-400 mt-0.5">{txn.note}</p>}
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(txn.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            {txn.screenshotUrl && (
                              <button onClick={() => setViewImage(txn.screenshotUrl)} className="flex-shrink-0">
                                <img
                                  src={txn.screenshotUrl}
                                  alt="Proof"
                                  className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {viewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
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
