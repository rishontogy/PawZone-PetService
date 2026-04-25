import { Link } from "wouter";
import { useGetSellerDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getStatusColor } from "@/lib/api";
import { PlusCircle, Package, Star, TrendingUp, PawPrint } from "lucide-react";

export function SellerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetSellerDashboard({ query: { enabled: !!user } });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Seller ID: <code className="text-primary font-mono">{user?.sellerId || "Pending"}</code>
            </p>
          </div>
          <Link href="/seller/listings/new">
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" /> Add Listing
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <TrendingUp className="w-5 h-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">{formatPrice(data?.stats?.totalRevenue ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Package className="w-5 h-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Active Listings</p>
              <p className="text-xl font-bold">{data?.stats?.activeListings ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Package className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Pending Orders</p>
              <p className="text-xl font-bold text-amber-600">{data?.stats?.pendingOrders ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Star className="w-5 h-5 text-yellow-500 mb-1" />
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="text-xl font-bold">{user?.sellerScore?.toFixed(1) ?? "5.0"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Link href="/seller/orders" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="p-0">
              {data?.recentOrders?.length ? (
                <div className="divide-y">
                  {data.recentOrders.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatPrice(order.totalAmount)}</span>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No orders yet</div>
              )}
            </CardContent>
          </Card>

          {/* My Listings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">My Listings</CardTitle>
              <Link href="/seller/listings" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="p-0">
              {data?.listings?.length ? (
                <div className="divide-y">
                  {data.listings.slice(0, 5).map((listing: any) => (
                    <div key={listing.id} className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {listing.photos?.[0] ? (
                          <img src={listing.photos[0]} alt={listing.breed} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{listing.breed}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(listing.price)}</p>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(listing.status)}`}>{listing.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No listings yet</p>
                  <Link href="/seller/listings/new">
                    <Button size="sm" variant="outline">Add Your First Pet</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
