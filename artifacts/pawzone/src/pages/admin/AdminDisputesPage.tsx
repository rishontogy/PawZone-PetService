import { useAdminGetDisputes, useAdminResolveDispute } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

export function AdminDisputesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resolutions, setResolutions] = useState<Record<number, string>>({});

  const { data, refetch } = useAdminGetDisputes({ query: { enabled: !!user } });

  const resolve = useAdminResolveDispute({
    mutation: {
      onSuccess: () => { toast({ title: "Dispute resolved" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const disputes = data?.disputes ?? [];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" /> Disputes
        </h1>

        {!disputes.length ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No disputes found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute: any) => (
              <Card key={dispute.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">Order #{dispute.orderNumber}</p>
                        <Badge className={`text-xs ${getStatusColor(dispute.status)}`}>{dispute.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Reported by: {dispute.reporterName}</p>
                      <p className="text-sm font-medium mt-2">Issue: {dispute.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(dispute.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {dispute.status === "open" && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Resolution note..."
                          className="flex-1 text-sm border rounded px-2 py-1.5"
                          value={resolutions[dispute.id] ?? ""}
                          onChange={(e) => setResolutions(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => resolve.mutate({
                            id: dispute.id,
                            data: { resolution: "resolved_buyer", note: resolutions[dispute.id] || "Resolved in favour of buyer" }
                          })}
                        >
                          Favour Buyer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolve.mutate({
                            id: dispute.id,
                            data: { resolution: "resolved_seller", note: resolutions[dispute.id] || "Resolved in favour of seller" }
                          })}
                        >
                          Favour Seller
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolve.mutate({
                            id: dispute.id,
                            data: { resolution: "refunded", note: resolutions[dispute.id] || "Refund approved" }
                          })}
                        >
                          Refund
                        </Button>
                      </div>
                    </div>
                  )}

                  {dispute.resolution && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                      <span className="font-medium">Resolution: </span>{dispute.resolution}
                      {dispute.note && <span className="text-muted-foreground"> · {dispute.note}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
