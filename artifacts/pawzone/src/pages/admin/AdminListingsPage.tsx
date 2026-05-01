import { useState } from "react";
import { useAdminGetListings, useAdminApproveListing, useAdminRejectListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { Package, CheckCircle, XCircle, PawPrint } from "lucide-react";

export function AdminListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const { data, refetch } = useAdminGetListings(
    { page, limit: 20, status: status || undefined },
    { query: { enabled: !!user } }
  );

  const approve = useAdminApproveListing({
    mutation: {
      onSuccess: () => { toast({ title: "Listing approved" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const reject = useAdminRejectListing({
    mutation: {
      onSuccess: () => { toast({ title: "Listing rejected" }); refetch(); },
    },
  });

  const listings = data?.listings ?? [];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="w-6 h-6" /> Listing Management
        </h1>

        <div className="flex gap-3 mb-6">
          <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!listings.length ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No listings found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {listings.map((listing: any) => (
              <Card key={listing.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {listing.photos?.[0] ? (
                        <img src={listing.photos[0]} alt={listing.breed} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/80x80?text=Pet"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{listing.breed}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{listing.category} · {listing.city}</p>
                          <p className="text-sm font-bold text-primary">{formatPrice(listing.price)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Seller: {listing.sellerName}</p>
                          {listing.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>
                          )}
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${getStatusColor(listing.status)}`}>{listing.status}</Badge>
                      </div>

                      {listing.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="gap-1" onClick={() => {
                            if (window.confirm(`Approve listing "${listing.title}"? It will become visible to buyers.`)) {
                              approve.mutate({ id: listing.id });
                            }
                          }}>
                            <CheckCircle className="w-3 h-3" /> Approve
                          </Button>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="Rejection reason..."
                              className="text-xs border rounded px-2 py-1 w-40"
                              value={rejectReason[listing.id] ?? ""}
                              onChange={(e) => setRejectReason(prev => ({ ...prev, [listing.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-destructive"
                              onClick={() => {
                                const reason = rejectReason[listing.id] || "Does not meet standards";
                                if (window.confirm(`Reject listing "${listing.title}"?\nReason: ${reason}`)) {
                                  reject.mutate({ id: listing.id, data: { reason } });
                                }
                              }}
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
