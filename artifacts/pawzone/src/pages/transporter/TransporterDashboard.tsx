import { Link } from "wouter";
import { useGetTransporterDashboard, useGetTransporterRoutes, useGetTransporterOrders, useAcceptDelivery, useConfirmPickup, useConfirmDelivery } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { Truck, MapPin, Package, PlusCircle, ArrowRight, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

export function TransporterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptForm, setAcceptForm] = useState({ pickupTime: "", deliveryTime: "" });

  const { data: dash } = useGetTransporterDashboard({ query: { enabled: !!user } });
  const { data: routesData, refetch: refetchRoutes } = useGetTransporterRoutes({ query: { enabled: !!user } });
  const { data: ordersData, refetch } = useGetTransporterOrders({ query: { enabled: !!user } });

  // Both endpoints return plain arrays, NOT wrapped objects
  const routes = Array.isArray(routesData) ? routesData : [];
  const orders = Array.isArray(ordersData) ? ordersData : [];

  const acceptDelivery = useAcceptDelivery({
    mutation: {
      onSuccess: () => {
        toast({ title: "✅ Delivery accepted!" });
        setAcceptingId(null);
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to accept delivery" });
      },
    },
  });

  const confirmPickup = useConfirmPickup({
    mutation: {
      onSuccess: () => { toast({ title: "📦 Pickup confirmed!" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to confirm pickup" }); },
    },
  });

  const confirmDelivery = useConfirmDelivery({
    mutation: {
      onSuccess: () => { toast({ title: "🎉 Delivery completed!" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to confirm delivery" }); },
    },
  });

  const handleOpenAccept = (orderId: number) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    const pickupDefault = fmt(new Date(now.getTime() + 2 * 3600000));
    const deliveryDefault = fmt(new Date(now.getTime() + 6 * 3600000));
    setAcceptForm({ pickupTime: pickupDefault, deliveryTime: deliveryDefault });
    setAcceptingId(orderId);
  };

  const handleAcceptSubmit = (orderId: number) => {
    if (!acceptForm.pickupTime || !acceptForm.deliveryTime) {
      toast({ variant: "destructive", title: "Required", description: "Please set both pickup and delivery times." });
      return;
    }
    acceptDelivery.mutate({
      id: orderId,
      data: {
        pickupTime: new Date(acceptForm.pickupTime) as any,
        deliveryTime: new Date(acceptForm.deliveryTime) as any,
      },
    });
  };

  if (user?.status === "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl p-8 shadow-lg border border-amber-200">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Awaiting Approval</h2>
          <p className="text-gray-500 text-sm">Your transporter account is pending admin approval. You'll receive a notification once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transporter Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
          <Link href="/transporter/routes/new">
            <Button className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="w-4 h-4" /> Add Route
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <CheckCircle className="w-6 h-6 text-green-600" />, label: "Deliveries Done", value: (dash as any)?.stats?.completedDeliveries ?? 0, bg: "bg-green-50", border: "border-green-200" },
            { icon: <Package className="w-6 h-6 text-amber-600" />, label: "Active", value: (dash as any)?.stats?.activeDeliveries ?? 0, bg: "bg-amber-50", border: "border-amber-200" },
            { icon: <Truck className="w-6 h-6 text-blue-600" />, label: "Total Earnings", value: formatPrice((dash as any)?.stats?.totalEarnings ?? 0), bg: "bg-blue-50", border: "border-blue-200" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-5 flex items-center gap-4 shadow-sm`}>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* My Routes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" /> My Delivery Routes
            </h2>
            <Link href="/transporter/routes/new">
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1">
                <PlusCircle className="w-4 h-4" /> Add route
              </button>
            </Link>
          </div>
          {routes.length === 0 ? (
            <div className="py-10 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-3">No routes configured yet.</p>
              <Link href="/transporter/routes/new">
                <Button variant="outline" size="sm" className="rounded-xl">Add First Route</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {routes.map((route: any) => {
                const allCities = [route.startCity, ...(Array.isArray(route.stops) ? route.stops : []), route.endCity].filter(Boolean);
                return (
                  <div key={route.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {allCities.map((city: string, idx: number) => (
                            <span key={idx} className="flex items-center gap-1">
                              <span className={`text-sm px-2.5 py-1 rounded-lg font-medium ${
                                idx === 0 ? "bg-green-100 text-green-700" :
                                idx === allCities.length - 1 ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>{city}</span>
                              {idx < allCities.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-400" />}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="capitalize font-medium">{route.dayOfWeek}</span>
                          {route.startTime && route.endTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {route.startTime} – {route.endTime}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={route.active ? "default" : "secondary"} className="flex-shrink-0">
                        {route.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivery Requests */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Delivery Requests & Active Orders</h2>
          </div>
          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No pending delivery requests.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map((order: any) => (
                <div key={order.id} className="p-5">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {order.pickupCity && (
                          <>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-green-500" /> {order.pickupCity}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                          </>
                        )}
                        {order.deliveryCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500" /> {order.deliveryCity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {order.buyerName && `Buyer: ${order.buyerName} • `}
                        {formatPrice(order.total ?? order.totalAmount ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Accept Delivery — shows when order is "ready" and no transporter assigned */}
                  {order.status === "ready" && !order.transporterId && (
                    acceptingId === order.id ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-blue-800">Set Pickup & Delivery Schedule</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-blue-700 font-medium block mb-1">Pickup Time</label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={acceptForm.pickupTime}
                              onChange={(e) => setAcceptForm({ ...acceptForm, pickupTime: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-blue-700 font-medium block mb-1">Delivery Time</label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={acceptForm.deliveryTime}
                              onChange={(e) => setAcceptForm({ ...acceptForm, deliveryTime: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-lg bg-blue-600 hover:bg-blue-700"
                            disabled={acceptDelivery.isPending}
                            onClick={() => handleAcceptSubmit(order.id)}
                          >
                            {acceptDelivery.isPending ? "Accepting..." : "Confirm Accept"}
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setAcceptingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-lg bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleOpenAccept(order.id)}
                      >
                        Accept Delivery
                      </Button>
                    )
                  )}

                  {/* Confirm Pickup — after transporter accepted */}
                  {order.status === "assigned" && order.transporterId === user?.id && (
                    <Button
                      size="sm"
                      className="rounded-lg bg-green-600 hover:bg-green-700"
                      disabled={confirmPickup.isPending}
                      onClick={() => confirmPickup.mutate({
                        id: order.id,
                        data: { petCode: order.petCode || "SCAN" } as any,
                      })}
                    >
                      {confirmPickup.isPending ? "Confirming..." : "Confirm Pickup"}
                    </Button>
                  )}

                  {/* Complete Delivery */}
                  {order.status === "in_transit" && order.transporterId === user?.id && (
                    <Button
                      size="sm"
                      className="rounded-lg bg-teal-600 hover:bg-teal-700"
                      disabled={confirmDelivery.isPending}
                      onClick={() => confirmDelivery.mutate({
                        id: order.id,
                        data: { location: order.deliveryAddress || order.deliveryCity || "Delivered" } as any,
                      })}
                    >
                      {confirmDelivery.isPending ? "Completing..." : "Complete Delivery"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
