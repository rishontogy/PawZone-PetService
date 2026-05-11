import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/api";
import { ArrowLeft, Truck, TrendingDown, DollarSign, Package } from "lucide-react";

const BASE = "/api";

export function AdminTransporterLedgerPage() {
  const { token } = useAuth();
  const params = useParams<{ transporterId: string }>();
  const transporterId = params.transporterId;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !transporterId) return;
    fetch(`${BASE}/admin/ledger/transporter/${transporterId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [token, transporterId]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || data.error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Transporter not found</p>
    </div>
  );

  const { transporter, summary, orders } = data;

  const summaryCards = [
    { label: "Total Deliveries", value: summary.totalDeliveries, icon: <Package className="w-5 h-5 text-purple-600" />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Gross Transport Fees", value: formatPrice(orders.reduce((s: number, r: any) => s + r.transportCharge, 0)), icon: <DollarSign className="w-5 h-5 text-green-600" />, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    { label: "Platform Deduction", value: formatPrice(summary.totalPlatformDeduction), icon: <TrendingDown className="w-5 h-5 text-red-500" />, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    { label: "Net Earnings", value: formatPrice(summary.totalEarnings), icon: <Truck className="w-5 h-5 text-teal-600" />, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/admin/accounting">
              <button className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Transporter Ledger — {transporter.name}
              </h1>
              <p className="text-purple-100 text-sm mt-0.5">Detailed delivery earnings breakdown</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map(card => (
            <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-5 shadow-sm`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
                {card.icon}
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Delivery History</h2>
            <p className="text-xs text-gray-500 mt-0.5">All paid, non-cancelled deliveries for this transporter</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Date", "Order #", "Transport Charge", "Platform Fee", "Net Earnings"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No deliveries yet</td></tr>
                )}
                {orders.map((row: any) => (
                  <tr key={row.orderId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(row.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-700 font-semibold">#{row.orderNumber}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(row.transportCharge)}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">−{formatPrice(row.platformFee)}</td>
                    <td className="px-4 py-3 text-purple-700 font-bold">{formatPrice(row.netEarnings)}</td>
                  </tr>
                ))}
              </tbody>
              {orders.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-700">Totals ({orders.length} deliveries)</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(orders.reduce((s: number, r: any) => s + r.transportCharge, 0))}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">−{formatPrice(summary.totalPlatformDeduction)}</td>
                    <td className="px-4 py-3 text-purple-700 font-bold">{formatPrice(summary.totalEarnings)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
