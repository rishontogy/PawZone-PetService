import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { formatPrice } from "@/lib/api";
import { Users, TrendingDown, DollarSign, ShoppingBag } from "lucide-react";

const BASE = "/api";

export function AdminSellerLedgerPage() {
  const { token } = useAuth();
  const params = useParams<{ sellerId: string }>();
  const sellerId = params.sellerId;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !sellerId) return;
    fetch(`${BASE}/admin/ledger/seller/${sellerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [token, sellerId]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || data.error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Seller not found</p>
    </div>
  );

  const { seller, summary, orders } = data;

  const summaryCards = [
    { label: "Total Orders", value: summary.totalOrders, icon: <ShoppingBag className="w-5 h-5 text-blue-600" />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Gross Revenue", value: formatPrice(summary.totalRevenue), icon: <DollarSign className="w-5 h-5 text-green-600" />, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    { label: "Platform Deduction", value: formatPrice(summary.totalPlatformDeduction), icon: <TrendingDown className="w-5 h-5 text-red-500" />, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    { label: "Net Earnings", value: formatPrice(summary.netEarnings), icon: <Users className="w-5 h-5 text-teal-600" />, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <BackButton className="mb-4" />
          <div className="flex items-center gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" />
                Seller Ledger — {seller.name}
              </h1>
              <p className="text-blue-100 text-sm mt-0.5">Detailed earnings breakdown for this seller</p>
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
            <h2 className="font-bold text-gray-900">Transaction History</h2>
            <p className="text-xs text-gray-500 mt-0.5">All paid, non-cancelled orders for this seller</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Date", "Order #", "Item Total", "Platform Fee", "Net Paid"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No paid orders yet</td></tr>
                )}
                {orders.map((row: any) => (
                  <tr key={row.orderId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(row.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-700 font-semibold">#{row.orderNumber}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(row.itemTotal)}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">−{formatPrice(row.platformFee)}</td>
                    <td className="px-4 py-3 text-blue-700 font-bold">{formatPrice(row.netPaid)}</td>
                  </tr>
                ))}
              </tbody>
              {orders.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-700">Totals ({orders.length} orders)</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(summary.totalRevenue)}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">−{formatPrice(summary.totalPlatformDeduction)}</td>
                    <td className="px-4 py-3 text-blue-700 font-bold">{formatPrice(summary.netEarnings)}</td>
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
