import { useState } from "react";
import { Link } from "wouter";
import { useAdminGetAlerts, useAdminResolveAlert } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, ArrowLeft, CheckCircle, AlertTriangle, Clock,
  Truck, Package, CreditCard, ShieldAlert, FileText, RefreshCcw, Filter
} from "lucide-react";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string; border: string }> = {
  HIGH:   { label: "HIGH",   color: "text-red-700 bg-red-100",    dot: "bg-red-500",    border: "border-red-200" },
  MEDIUM: { label: "MEDIUM", color: "text-orange-700 bg-orange-100", dot: "bg-orange-500", border: "border-orange-200" },
  LOW:    { label: "LOW",    color: "text-blue-700 bg-blue-100",   dot: "bg-blue-500",   border: "border-blue-200" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
  SELLER_DELAY:         { label: "Seller Delay",          icon: <Clock className="w-4 h-4" />,        bg: "bg-amber-50 text-amber-700" },
  PAYMENT_DELAY:        { label: "Payment Delay",         icon: <CreditCard className="w-4 h-4" />,   bg: "bg-red-50 text-red-700" },
  TRANSPORT_DELAY:      { label: "Transport Delay",       icon: <Truck className="w-4 h-4" />,        bg: "bg-purple-50 text-purple-700" },
  DELIVERY_DELAY:       { label: "Delivery Delay",        icon: <Package className="w-4 h-4" />,      bg: "bg-blue-50 text-blue-700" },
  CANCELLATION:         { label: "Cancellation",          icon: <AlertTriangle className="w-4 h-4" />, bg: "bg-gray-50 text-gray-700" },
  FRAUD:                { label: "Fraud Alert",           icon: <ShieldAlert className="w-4 h-4" />,  bg: "bg-red-50 text-red-700" },
  REPORT:               { label: "Report",                icon: <FileText className="w-4 h-4" />,     bg: "bg-indigo-50 text-indigo-700" },
  REFUND:               { label: "Refund",                icon: <RefreshCcw className="w-4 h-4" />,   bg: "bg-teal-50 text-teal-700" },
  PAYMENT_VERIFICATION: { label: "Payment Verification",  icon: <CreditCard className="w-4 h-4" />,   bg: "bg-yellow-50 text-yellow-700" },
  AUTO_CANCEL:          { label: "Auto-Cancelled",        icon: <AlertTriangle className="w-4 h-4" />, bg: "bg-rose-50 text-rose-700" },
};

const FILTER_TYPES = [
  { key: "ALL",            label: "All" },
  { key: "HIGH",           label: "Critical" },
  { key: "PAYMENT_DELAY",  label: "Payment" },
  { key: "SELLER_DELAY",   label: "Seller" },
  { key: "TRANSPORT_DELAY",label: "Transport" },
  { key: "DELIVERY_DELAY", label: "Delivery" },
  { key: "FRAUD",          label: "Fraud" },
  { key: "REPORT",         label: "Reports" },
];

export function AdminAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("ALL");

  const queryParams: Record<string, string> = {};
  if (activeFilter === "RESOLVED") queryParams.status = "RESOLVED";
  else if (activeFilter === "HIGH") queryParams.priority = "HIGH";
  else if (activeFilter !== "ALL") queryParams.type = activeFilter;

  const { data, isLoading, refetch } = useAdminGetAlerts(
    { ...queryParams },
    { query: { enabled: !!user, refetchInterval: 30_000 } }
  );

  const resolveMutation = useAdminResolveAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert resolved" });
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error });
      },
    },
  });

  const alerts = (data as any)?.alerts ?? [];
  const activeCount = (data as any)?.activeCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-yellow-400" /> System Alerts
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {activeCount > 0
                ? `${activeCount} active alert${activeCount > 1 ? "s" : ""} require attention`
                : "All systems nominal"}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTER_TYPES.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeFilter === f.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Alert list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No alerts found</p>
            <p className="text-gray-400 text-sm mt-1">Everything is running smoothly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert: any) => {
              const priority = PRIORITY_CONFIG[alert.priority] ?? PRIORITY_CONFIG.MEDIUM;
              const typeInfo = TYPE_CONFIG[alert.type] ?? { label: alert.type, icon: <Bell className="w-4 h-4" />, bg: "bg-gray-50 text-gray-700" };
              const isResolved = alert.status === "RESOLVED";

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${
                    isResolved ? "opacity-60" : `border-l-4 ${priority.border}`
                  } ${isResolved ? "border-gray-100" : ""}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Type icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bg}`}>
                        {typeInfo.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${priority.color}`}>
                            {priority.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.bg}`}>
                            {typeInfo.label}
                          </span>
                          {isResolved && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                              Resolved
                            </span>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-sm text-gray-800 font-medium leading-snug">{alert.message}</p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {alert.orderNumber && (
                            <Link href={`/admin/orders`}>
                              <span className="text-xs font-mono text-teal-700 font-semibold hover:underline cursor-pointer">
                                Order #{alert.orderNumber}
                              </span>
                            </Link>
                          )}
                          {alert.userName && (
                            <span className="text-xs text-gray-500">User: <span className="font-medium text-gray-700">{alert.userName}</span></span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(alert.createdAt).toLocaleString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      {!isResolved && (
                        <button
                          onClick={() => resolveMutation.mutate({ id: alert.id } as any)}
                          disabled={resolveMutation.isPending}
                          className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-2 rounded-xl transition-colors flex-shrink-0 border border-green-200"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
