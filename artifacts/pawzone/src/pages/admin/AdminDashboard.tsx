import { Link } from "wouter";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/api";
import { Users, Package, ShoppingBag, AlertTriangle, TrendingUp, Shield } from "lucide-react";

export function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetAdminDashboard({ query: { enabled: !!user } });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  const stats = data?.stats ?? {};

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <Users className="w-5 h-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Users className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingUsers ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Package className="w-5 h-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Total Listings</p>
              <p className="text-2xl font-bold">{stats.totalListings ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Package className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Pending Listings</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingListings ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <ShoppingBag className="w-5 h-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{stats.totalOrders ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <TrendingUp className="w-5 h-5 text-green-500 mb-1" />
              <p className="text-xs text-muted-foreground">Platform Revenue</p>
              <p className="text-2xl font-bold">{formatPrice(stats.platformRevenue ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
              <p className="text-xs text-muted-foreground">Open Disputes</p>
              <p className="text-2xl font-bold text-red-600">{stats.openDisputes ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Manage Users</p>
                  <p className="text-sm text-muted-foreground">Approve sellers & transporters</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/listings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Review Listings</p>
                  <p className="text-sm text-muted-foreground">Approve or reject pet listings</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">All Orders</p>
                  <p className="text-sm text-muted-foreground">Monitor all platform orders</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/disputes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold">Disputes</p>
                  <p className="text-sm text-muted-foreground">Resolve buyer/seller disputes</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
