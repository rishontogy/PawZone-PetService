import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, RefreshCw, CheckCircle, XCircle, Clock, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("pawzone_token");
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  code_sent: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  code_sent: "Code Sent",
  completed: "Completed",
  rejected: "Rejected",
};

export function AdminPasswordResetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatedCodes, setGeneratedCodes] = useState<Record<number, string>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-password-resets"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/password-resets");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!user,
  });

  const generateCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/admin/password-resets/${id}/generate-code`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate code");
      }
      return res.json();
    },
    onSuccess: (data, id) => {
      setGeneratedCodes(prev => ({ ...prev, [id]: data.code }));
      toast({ title: "Code generated", description: `Reset code: ${data.code}` });
      queryClient.invalidateQueries({ queryKey: ["admin-password-resets"] });
      refetch();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/admin/password-resets/${id}/reject`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["admin-password-resets"] });
      refetch();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const requests = (data as any)?.requests ?? [];
  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    toast({ title: "Code copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-teal-400" /> Password Resets
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? "s" : ""}` : "All requests handled"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{requests.length} total request{requests.length !== 1 ? "s" : ""}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No password reset requests</p>
            <p className="text-gray-300 text-sm mt-1">All clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => {
              const shownCode = generatedCodes[req.id] ?? req.resetCode;
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{req.userName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[req.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 capitalize">
                          {req.userRole}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{req.userEmail}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(req.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Generated code display */}
                  {shownCode && req.status !== "completed" && req.status !== "rejected" && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                      <div className="flex-1">
                        <p className="text-xs text-blue-600 font-medium mb-0.5">Reset Code — Share with user</p>
                        <p className="text-2xl font-bold text-blue-800 tracking-widest">{shownCode}</p>
                      </div>
                      <button
                        onClick={() => copyCode(shownCode)}
                        className="p-2 rounded-lg hover:bg-blue-100 transition-colors text-blue-600"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {req.status === "completed" && (
                    <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
                      <CheckCircle className="w-4 h-4" />
                      Password has been reset successfully.
                    </div>
                  )}

                  {req.status === "rejected" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                      <XCircle className="w-4 h-4" />
                      Request was rejected.
                    </div>
                  )}

                  {(req.status === "pending" || req.status === "code_sent") && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl"
                        onClick={() => generateCodeMutation.mutate(req.id)}
                        disabled={generateCodeMutation.isPending}
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                        {req.status === "code_sent" ? "Regenerate Code" : "Generate Code"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
