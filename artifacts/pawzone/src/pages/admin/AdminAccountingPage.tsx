import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice, getStatusColor } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  TrendingUp, DollarSign, Users, Truck, ArrowLeft, Download,
  ShoppingBag, ChevronRight, BarChart2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = "/api";

export function AdminAccountingPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "sellers" | "transporters">("overview");
  const [chartView, setChartView] = useState<"daily" | "monthly">("monthly");

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/admin/accounting`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [token]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading accounting data...</p>
      </div>
    </div>
  );

  const summary = data?.summary ?? {};
  const transactions: any[] = data?.transactions ?? [];
  const sellerLedger: any[] = data?.sellerLedger ?? [];
  const transporterLedger: any[] = data?.transporterLedger ?? [];
  const chartData = chartView === "monthly" ? (data?.monthlyIncome ?? []) : (data?.dailyIncome ?? []);

  const summaryCards = [
    { label: "Total Revenue", value: formatPrice(summary.totalRevenue ?? 0), icon: <DollarSign className="w-6 h-6 text-teal-600" />, bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
    { label: "Platform Fees Earned", value: formatPrice(summary.totalPlatformFees ?? 0), icon: <TrendingUp className="w-6 h-6 text-green-600" />, bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    { label: "Seller Payouts", value: formatPrice(summary.totalSellerPayouts ?? 0), icon: <Users className="w-6 h-6 text-blue-600" />, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    { label: "Transporter Payouts", value: formatPrice(summary.totalTransporterPayouts ?? 0), icon: <Truck className="w-6 h-6 text-purple-600" />, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  ];

  const tabs = [
    { key: "overview", label: "Overview", icon: <BarChart2 className="w-4 h-4" /> },
    { key: "transactions", label: "Transactions", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "sellers", label: "Seller Ledger", icon: <Users className="w-4 h-4" /> },
    { key: "transporters", label: "Transporter Ledger", icon: <Truck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/admin">
            <button className="flex items-center gap-1.5 text-teal-100 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-7 h-7" />
                Accounting & Ledger
              </h1>
              <p className="text-teal-100 mt-1 text-sm">Full financial overview of all transactions</p>
            </div>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-xl transition-colors border border-white/20">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 pb-12">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map(card => (
            <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-5 shadow-sm bg-white`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  {card.icon}
                </div>
              </div>
              <p className={`text-xl font-bold ${card.text}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 shadow-sm w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900">Platform Revenue</h2>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setChartView("monthly")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${chartView === "monthly" ? "bg-white shadow-sm text-teal-700" : "text-gray-500"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setChartView("daily")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${chartView === "daily" ? "bg-white shadow-sm text-teal-700" : "text-gray-500"}`}
                  >
                    Daily (30d)
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={chartView === "monthly" ? "month" : "date"} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: any) => [`₹${v}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Flow */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Payment Flow Breakdown</h2>
              <div className="space-y-3">
                {[
                  { label: "Buyer Pays", desc: "Full order amount", amount: summary.totalRevenue ?? 0, color: "bg-gray-100 text-gray-700" },
                  { label: "Platform Keeps", desc: "Service fee (₹5 or ₹20 per item)", amount: summary.totalPlatformFees ?? 0, color: "bg-teal-100 text-teal-700" },
                  { label: "Seller Receives", desc: "Price minus platform fee & delivery", amount: summary.totalSellerPayouts ?? 0, color: "bg-blue-100 text-blue-700" },
                  { label: "Transporter Receives", desc: "85% of delivery fee", amount: summary.totalTransporterPayouts ?? 0, color: "bg-purple-100 text-purple-700" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-sm font-semibold text-gray-800">{row.label}</span>
                          <span className="text-xs text-gray-400 ml-2">{row.desc}</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatPrice(row.amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.color.split(" ")[0]}`}
                          style={{ width: summary.totalRevenue ? `${Math.min(100, (row.amount / summary.totalRevenue) * 100)}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Transaction History</h2>
              <span className="text-sm text-gray-500">{transactions.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Order #", "Buyer", "Seller", "Total Paid", "Platform Fee", "Seller Payout", "Delivery", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No transactions yet</td></tr>
                  )}
                  {transactions.map((tx: any) => (
                    <tr key={tx.orderId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-teal-700 font-semibold">#{tx.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{tx.buyerName}</td>
                      <td className="px-4 py-3 text-gray-700">{tx.sellerName}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(tx.totalAmount)}</td>
                      <td className="px-4 py-3 text-teal-600 font-medium">{formatPrice(tx.platformFee)}</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{formatPrice(tx.sellerPayout)}</td>
                      <td className="px-4 py-3 text-purple-600 font-medium">{formatPrice(tx.transporterPayout)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(tx.paymentStatus)}`}>
                          {tx.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Seller Ledger Tab */}
        {activeTab === "sellers" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Seller Ledger</h2>
              <p className="text-xs text-gray-500 mt-0.5">Earnings per seller after platform fee deduction</p>
            </div>
            <div className="divide-y divide-gray-50">
              {sellerLedger.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No seller data yet</div>
              )}
              {sellerLedger.map((s: any) => (
                <div key={s.name} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.completedOrders} completed orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-700">{formatPrice(s.totalEarnings)}</p>
                    {s.pendingPayouts > 0 && (
                      <p className="text-xs text-amber-600">{formatPrice(s.pendingPayouts)} pending</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transporter Ledger Tab */}
        {activeTab === "transporters" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Transporter Ledger</h2>
              <p className="text-xs text-gray-500 mt-0.5">Delivery earnings per transporter (85% of delivery fee)</p>
            </div>
            <div className="divide-y divide-gray-50">
              {transporterLedger.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No transporter data yet</div>
              )}
              {transporterLedger.map((t: any) => (
                <div key={t.name} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.completedDeliveries} deliveries completed</p>
                    </div>
                  </div>
                  <p className="font-bold text-purple-700">{formatPrice(t.totalEarnings)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
