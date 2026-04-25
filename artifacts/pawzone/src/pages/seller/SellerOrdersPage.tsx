import { useState } from "react";
import { useGetOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { Package } from "lucide-react";

export function SellerOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const { data, refetch } = useGetOrders({ page, limit: 20 }, { query: { enabled: !!user } });

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => { toast({ title: "Order status updated" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="w-6 h-6" /> Seller Orders
        </h1>

        {!data?.orders?.length ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order: any) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.itemCount} item(s)
                      </p>
                      <p className="text-sm text-muted-foreground">Buyer: {order.buyerName}</p>
                      {order.deliveryAddress && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {order.deliveryAddress}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-primary">{formatPrice(order.totalAmount)}</span>
                      <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</Badge>
                      {order.status === "paid" && (
                        <Button size="sm" variant="outline" onClick={() =>
                          updateStatus.mutate({ id: order.id, data: { status: "ready_for_pickup" } })
                        }>
                          Mark Ready for Pickup
                        </Button>
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
