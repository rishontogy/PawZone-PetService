import { useState } from "react";
import { Link } from "wouter";
import { useGetOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, getStatusColor } from "@/lib/api";
import { Package, ChevronRight } from "lucide-react";

export function BuyerOrdersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetOrders({ page, limit: 10 }, { query: { enabled: !!user } });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading orders...</div></div>;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" /> My Orders
          </h1>
          <Link href="/listings"><Button variant="outline" size="sm">Browse More Pets</Button></Link>
        </div>

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
              <Link key={order.id} href={`/buyer/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Order #{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-sm text-muted-foreground">{order.itemCount} item(s)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(order.totalAmount)}</p>
                          <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
