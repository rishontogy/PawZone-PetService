import { useAdminGetDisputes, useAdminResolveDispute } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Send, CheckCircle } from "lucide-react";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  resolved: "bg-green-100 text-green-700",
  in_review: "bg-amber-100 text-amber-700",
};

export function AdminDisputesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [sent, setSent] = useState<Record<number, string>>({});

  const { data, refetch } = useAdminGetDisputes({ query: { enabled: !!user } });

  const resolve = useAdminResolveDispute({
    mutation: {
      onSuccess: (_res, variables) => {
        const id = (variables as any).id;
        const note = replies[id] || "";
        setSent(prev => ({ ...prev, [id]: note }));
        setReplies(prev => { const n = { ...prev }; delete n[id]; return n; });
        toast({ title: "Reply sent & dispute resolved" });
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error });
      },
    },
  });

  const disputes = (data as any)?.disputes ?? [];
  const openCount = disputes.filter((d: any) => d.status === "open").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400" /> Disputes
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {openCount > 0 ? `${openCount} open dispute${openCount > 1 ? "s" : ""} need attention` : "All disputes resolved"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {disputes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No disputes found</p>
          </div>
        ) : (
          disputes.map((dispute: any) => {
            const isOpen = dispute.status === "open";
            const hasSent = !!sent[dispute.id];

            return (
              <div key={dispute.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOpen ? "border-red-200" : "border-gray-100"}`}>
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-bold text-teal-700">Order #{dispute.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[dispute.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {dispute.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Reported by: <span className="font-semibold text-gray-900">{dispute.reporterName}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(dispute.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Issue */}
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Customer Complaint</p>
                    <p className="text-sm text-gray-800">{dispute.description}</p>
                  </div>

                  {/* Previous resolution note */}
                  {dispute.resolution && !isOpen && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-0.5">Resolved</p>
                        <p className="text-sm text-gray-700">{dispute.resolution}</p>
                      </div>
                    </div>
                  )}

                  {/* Sent confirmation */}
                  {hasSent && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-0.5">Reply sent to customer</p>
                        <p className="text-sm text-gray-700">{sent[dispute.id]}</p>
                      </div>
                    </div>
                  )}

                  {/* Reply box — only for open disputes */}
                  {isOpen && !hasSent && (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Type your resolution message to the customer..."
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-400"
                        value={replies[dispute.id] ?? ""}
                        onChange={(e) => setReplies(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && replies[dispute.id]?.trim()) {
                            resolve.mutate({ id: dispute.id, data: { resolution: replies[dispute.id] } } as any);
                          }
                        }}
                      />
                      <button
                        disabled={!replies[dispute.id]?.trim() || resolve.isPending}
                        onClick={() => {
                          const note = replies[dispute.id]?.trim();
                          if (!note) return;
                          resolve.mutate({ id: dispute.id, data: { resolution: note } } as any);
                        }}
                        className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors flex-shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
