import { Link } from "wouter";
import { useGetTransporterDashboard, useGetTransporterRoutes, useGetTransporterOrders, useAcceptDelivery, useConfirmPickup, useConfirmDelivery } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { Truck, MapPin, Package, PlusCircle } from "lucide-react";

export function TransporterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: dash } = useGetTransporterDashboard({ query: { enabled: !!user } });
  const { data: ordersData, refetch } = useGetTransporterOrders({ query: { enabled: !!user } });
  const { data: routesData } = useGetTransporterRoutes({ query: { enabled: !!user } });

  const acceptDelivery = useAcceptDelivery({
    mutation: {
      onSuccess: () => { toast({ title: "Delivery accepted!" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const confirmPickup = useConfirmPickup({
    mutation: {
      onSuccess: () => { toast({ title: "Pickup confirmed!" }); refetch(); },
    },
  });

  const confirmDelivery = useConfirmDelivery({
    mutation: {
      onSuccess: () => { toast({ title: "Delivery completed!" }); refetch(); },
    },
  });

  const orders = ordersData?.orders ?? [];
  const routes = routesData?.routes ?? [];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Transporter Dashboard</h1>
          <Link href="/transporter/routes/new">
            <Button className="gap-2"><PlusCircle className="w-4 h-4" />Add Route</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <Truck className="w-5 h-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Deliveries Done</p>
              <p className="text-xl font-bold">{dash?.stats?.completedDeliveries ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Package className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-amber-600">{dash?.stats?.activeDeliveries ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Earnings</p>
              <p className="text-xl font-bold">{formatPrice(dash?.stats?.totalEarnings ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* My Routes */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" /> My Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No routes configured. Add your delivery routes.</p>
            ) : (
              <div className="space-y-2">
                {routes.map((route: any) => (
                  <div key={route.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                    <span className="font-medium">{route.startCity} → {route.endCity}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground capitalize">{route.dayOfWeek}</span>
                      <Badge variant={route.active ? "default" : "secondary"}>
                        {route.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Deliveries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delivery Requests & Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending delivery requests.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.pickupCity} → {order.deliveryCity}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.itemCount} pet(s)</p>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {order.status === "ready_for_pickup" && !order.transporterId && (
                        <Button size="sm" onClick={() => acceptDelivery.mutate({ id: order.id, data: {} })}>
                          Accept Delivery
                        </Button>
                      )}
                      {order.status === "assigned" && (
                        <Button size="sm" onClick={() => confirmPickup.mutate({ id: order.id, data: { barcode: order.barcode || "SCAN" } })}>
                          Confirm Pickup
                        </Button>
                      )}
                      {order.status === "in_transit" && (
                        <Button size="sm" onClick={() => confirmDelivery.mutate({ id: order.id, data: { signature: "confirmed" } })}>
                          Confirm Delivery
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
