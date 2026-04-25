import { useState } from "react";
import { useAdminGetOrders, useAdminApproveRefund } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { ShoppingBag } from "lucide-react";

export function AdminOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, refetch } = useAdminGetOrders({ query: { enabled: !!user } });

  const approveRefund = useAdminApproveRefund({
    mutation: {
      onSuccess: () => { toast({ title: "Refund approved" }); refetch(); },
    },
  });

  const orders = data?.orders ?? [];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" /> All Orders
        </h1>

        {!orders.length ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No orders found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Orders ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {orders.map((order: any) => (
                  <div key={order.id} className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">#{order.orderNumber}</p>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Buyer: {order.buyerName} · Seller: {order.sellerName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.itemCount} item(s)
                      </p>
                      {order.deliveryAddress && (
                        <p className="text-xs text-muted-foreground">📍 {order.deliveryAddress}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-primary">{formatPrice(order.totalAmount)}</span>
                      {order.status === "disputed" && (
                        <Button size="sm" variant="outline" onClick={() => approveRefund.mutate({ orderId: order.id })}>
                          Approve Refund
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
