import { Link } from "wouter";
import { useGetBuyerDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getStatusColor } from "@/lib/api";
import { ShoppingCart, Package, Star, PawPrint } from "lucide-react";

export function BuyerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetBuyerDashboard({ query: { enabled: !!user } });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading dashboard...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your orders and discover new pets</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{data?.stats?.totalOrders ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{data?.stats?.pendingOrders ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{data?.stats?.deliveredOrders ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-bold">{formatPrice(data?.stats?.totalSpent ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Link href="/listings"><Button className="gap-2"><PawPrint className="w-4 h-4" />Browse Pets</Button></Link>
          <Link href="/buyer/cart"><Button variant="outline" className="gap-2"><ShoppingCart className="w-4 h-4" />View Cart</Button></Link>
          <Link href="/buyer/orders"><Button variant="outline" className="gap-2"><Package className="w-4 h-4" />My Orders</Button></Link>
        </div>

        {/* Recent Orders */}
        {data?.recentOrders && data.recentOrders.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Link href="/buyer/orders" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.recentOrders.map((order: any) => (
                  <Link key={order.id} href={`/buyer/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatPrice(order.totalAmount)}</span>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(!data?.recentOrders || data.recentOrders.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <PawPrint className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-2">No orders yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Start browsing to find your perfect pet companion.</p>
              <Link href="/listings"><Button>Browse Pets</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
