import { Link } from "wouter";
import { useGetTransporterDashboard, useGetTransporterRoutes, useGetTransporterOrders, useAcceptDelivery } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Truck, MapPin, Package, PlusCircle, ArrowRight, Clock, CheckCircle,
  AlertCircle, Pencil, Trash2, Upload, IndianRupee,
  ChevronDown, ChevronUp, User, Phone,
} from "lucide-react";
import { useRef, useState } from "react";

export function TransporterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptForm, setAcceptForm] = useState({ pickupTime: "", deliveryTime: "", transportFee: "" });
  const [deleteRouteId, setDeleteRouteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: dash } = useGetTransporterDashboard({ query: { enabled: !!user } });
  const { data: routesData, refetch: refetchRoutes } = useGetTransporterRoutes({ query: { enabled: !!user } });
  const { data: ordersData, refetch } = useGetTransporterOrders({ query: { enabled: !!user } });

  const routes = Array.isArray(routesData) ? routesData : [];
  // Sort newest first
  const rawOrders = Array.isArray(ordersData) ? ordersData : [];
  const orders = [...rawOrders].sort(
    (a: any, b: any) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime()
  );

  const acceptDelivery = useAcceptDelivery({
    mutation: {
      onSuccess: () => {
        toast({ title: "Delivery accepted!" });
        setAcceptingId(null);
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to accept delivery" });
      },
    },
  });

  const handleOpenAccept = (orderId: number) => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    setAcceptForm({
      pickupTime: fmt(new Date(now.getTime() + 2 * 3600000)),
      deliveryTime: fmt(new Date(now.getTime() + 6 * 3600000)),
      transportFee: "",
    });
    setAcceptingId(orderId);
  };

  const handleAcceptSubmit = (orderId: number) => {
    if (!acceptForm.pickupTime || !acceptForm.deliveryTime) {
      toast({ variant: "destructive", title: "Required", description: "Please set both pickup and delivery times." });
      return;
    }
    const fee = Number(acceptForm.transportFee);
    if (!Number.isFinite(fee) || fee <= 0) {
      toast({ variant: "destructive", title: "Transport rate required", description: "Enter a positive transport fee in ₹." });
      return;
    }
    acceptDelivery.mutate({
      id: orderId,
      data: {
        pickupTime: new Date(acceptForm.pickupTime) as any,
        deliveryTime: new Date(acceptForm.deliveryTime) as any,
        transportFee: fee,
      } as any,
    });
  };

  const handleDeleteRoute = async () => {
    if (!deleteRouteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch(`/api/transporter/routes/${deleteRouteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete route");
      }
      toast({ title: "Route deleted" });
      setDeleteRouteId(null);
      refetchRoutes();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to delete route" });
    } finally {
      setDeleting(false);
    }
  };

  if (user?.status === "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl p-8 shadow-lg border border-amber-200">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Awaiting Approval</h2>
          <p className="text-gray-500 text-sm">Your transporter account is pending admin approval. You'll be notified once approved.</p>
        </div>
      </div>
    );
  }

  const isAvailableForAccept = (order: any) =>
    order.status === "confirmed" && !order.transporterId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6" /> Transporter Dashboard
            </h1>
            <p className="text-green-100 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
          <Link href="/transporter/routes/new">
            <Button className="gap-2 rounded-xl bg-white text-green-700 hover:bg-green-50 font-semibold">
              <PlusCircle className="w-4 h-4" /> Add Route
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-4 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: <CheckCircle className="w-6 h-6 text-green-600" />, label: "Deliveries Done", value: (dash as any)?.stats?.completedDeliveries ?? 0, bg: "bg-green-50", border: "border-green-200" },
            { icon: <Package className="w-6 h-6 text-amber-600" />, label: "Active", value: (dash as any)?.stats?.activeDeliveries ?? 0, bg: "bg-amber-50", border: "border-amber-200" },
            { icon: <IndianRupee className="w-6 h-6 text-blue-600" />, label: "Total Earnings", value: formatPrice((dash as any)?.stats?.totalEarnings ?? 0), bg: "bg-blue-50", border: "border-blue-200" },
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={route.active ? "default" : "secondary"}>
                          {route.active ? "Active" : "Inactive"}
                        </Badge>
                        <Link href={`/transporter/routes/${route.id}/edit`}>
                          <button
                            data-testid={`button-edit-route-${route.id}`}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                            title="Edit route"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          data-testid={`button-delete-route-${route.id}`}
                          onClick={() => setDeleteRouteId(route.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                          title="Delete route"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivery Requests & Active Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Delivery Requests & Active Orders
            </h2>
            <span className="text-xs text-gray-400">{orders.length} total • newest first</span>
          </div>

          {orders.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">No delivery requests yet.</p>
              <p className="text-xs text-gray-400 mt-1">Add routes to start receiving orders in your area.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map((order: any) => {
                const isExpanded = expandedId === order.id;
                const canAccept = isAvailableForAccept(order);
                const isMyOrder = order.transporterId === user?.id;

                // Earnings preview (for unaccepted or accepted orders)
                const transportCharge = Number(order.transportFee ?? 0);
                const platformFee = transportCharge >= 200 ? 40 : 20;
                const myEarning = Math.max(0, transportCharge - platformFee);

                return (
                  <div key={order.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                    {/* Card Header — always visible */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                            {String(order.status).replace(/_/g, " ")}
                          </span>
                          {canAccept && (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Available
                            </span>
                          )}
                        </div>
                        {/* Route line */}
                        <div className="flex items-center gap-1.5 text-sm flex-wrap">
                          {order.pickupCity && (
                            <span className="flex items-center gap-1 text-green-700 font-medium">
                              <MapPin className="w-3.5 h-3.5" /> {order.pickupCity}
                            </span>
                          )}
                          {order.pickupCity && order.deliveryCity && (
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          )}
                          {order.deliveryCity && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <MapPin className="w-3.5 h-3.5" /> {order.deliveryCity}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {isMyOrder && transportCharge > 0 && (
                            <span className="ml-2 text-emerald-600 font-medium">
                              Earning: {formatPrice(myEarning)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {canAccept && acceptingId !== order.id && (
                        <Button
                          data-testid={`button-accept-${order.id}`}
                          size="sm"
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleOpenAccept(order.id)}
                        >
                          Accept Delivery
                        </Button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        data-testid={`button-toggle-order-${order.id}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>

                    {/* Accept form */}
                    {canAccept && acceptingId === order.id && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 mb-3">
                        <p className="text-sm font-semibold text-blue-800">Set Pickup & Delivery Schedule</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-blue-700 font-medium block mb-1">Pickup Time</label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={acceptForm.pickupTime}
                              onChange={(e) => setAcceptForm({ ...acceptForm, pickupTime: e.target.value })}
                              data-testid={`input-pickup-time-${order.id}`}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-blue-700 font-medium block mb-1">Delivery Time</label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={acceptForm.deliveryTime}
                              onChange={(e) => setAcceptForm({ ...acceptForm, deliveryTime: e.target.value })}
                              data-testid={`input-delivery-time-${order.id}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-blue-700 font-medium block mb-1 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" /> Transport Rate (₹)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step="1"
                            className="w-full text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={acceptForm.transportFee}
                            onChange={(e) => setAcceptForm({ ...acceptForm, transportFee: e.target.value })}
                            placeholder="e.g. 300"
                            data-testid={`input-transport-fee-${order.id}`}
                          />
                          {(() => {
                            const amt = Number(acceptForm.transportFee);
                            if (!Number.isFinite(amt) || amt <= 0) {
                              return (
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Platform fee: ₹20 if rate &lt; ₹200, ₹40 if rate ≥ ₹200
                                </p>
                              );
                            }
                            const fee = amt >= 200 ? 40 : 20;
                            const earn = Math.max(0, amt - fee);
                            return (
                              <div className="mt-1 text-[11px] bg-white border border-blue-100 rounded-lg p-2 space-y-0.5">
                                <div className="flex justify-between text-gray-600">
                                  <span>Transport charge</span><span>{formatPrice(amt)}</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                  <span>Platform fee</span><span>− {formatPrice(fee)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-blue-700 border-t border-blue-100 pt-0.5 mt-0.5">
                                  <span>Your earnings</span><span>{formatPrice(earn)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700"
                            disabled={acceptDelivery.isPending}
                            onClick={() => handleAcceptSubmit(order.id)}
                            data-testid={`button-confirm-accept-${order.id}`}
                          >
                            {acceptDelivery.isPending ? "Accepting..." : "Confirm Accept"}
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAcceptingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-1 pt-4 border-t border-gray-100 space-y-4">
                        {/* Locations */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Pickup Area
                            </p>
                            <p className="text-sm font-medium text-gray-800">{order.pickupCity || "—"}</p>
                          </div>
                          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Drop Area
                            </p>
                            <p className="text-sm font-medium text-gray-800">{order.deliveryCity || "—"}</p>
                            {order.deliveryAddress && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{order.deliveryAddress}</p>
                            )}
                          </div>
                        </div>

                        {/* Seller & Buyer contact — only visible once transporter has accepted */}
                        {isMyOrder ? (
                          <>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seller (Pickup Point)</p>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-800 flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-gray-400" /> {order.sellerName || "Seller"}
                                </p>
                                {order.sellerPhone && (
                                  <p className="text-sm flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    <a href={`tel:${order.sellerPhone}`} className="text-green-700 hover:underline font-medium">{order.sellerPhone}</a>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Buyer (Delivery Point)</p>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-800 flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-gray-400" /> {order.buyerName || "Buyer"}
                                </p>
                                {order.buyerPhone && (
                                  <p className="text-sm flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    <a href={`tel:${order.buyerPhone}`} className="text-green-700 hover:underline font-medium">{order.buyerPhone}</a>
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                            <p className="text-xs text-amber-700 font-medium">Accept this delivery to view seller & buyer contact details</p>
                          </div>
                        )}

                        {/* Earnings Breakdown */}
                        {(isMyOrder && transportCharge > 0) && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" /> Earnings Breakdown
                            </p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between text-gray-700">
                                <span>Transport charge</span>
                                <span className="font-medium">{formatPrice(transportCharge)}</span>
                              </div>
                              <div className="flex justify-between text-red-500">
                                <span>Platform fee</span>
                                <span>− {formatPrice(platformFee)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-blue-700 border-t border-blue-200 pt-1.5">
                                <span>Your earnings</span>
                                <span>{formatPrice(myEarning)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Schedule */}
                        {(order.pickupTime || order.deliveryTime) && (
                          <div className="text-xs text-gray-500 flex flex-col gap-1">
                            {order.pickupTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pickup: {new Date(order.pickupTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {order.deliveryTime && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Est. delivery: {new Date(order.deliveryTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video action blocks */}
                    {order.transporterId === user?.id && order.status === "ready" && (
                      <div className="mt-3">
                        <PickupVideoBlock orderId={order.id} existingUrl={order.pickupVideoUrl} onDone={refetch} />
                      </div>
                    )}
                    {order.transporterId === user?.id && order.status === "picked_up" && (
                      <div className="mt-3">
                        <StartInTransitBlock orderId={order.id} onDone={refetch} />
                      </div>
                    )}
                    {order.transporterId === user?.id && order.status === "in_transit" && (
                      <div className="mt-3">
                        <DeliveryVideoBlock orderId={order.id} existingUrl={order.deliveryVideoUrl} onDone={refetch} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete route confirmation */}
      <AlertDialog open={deleteRouteId !== null} onOpenChange={(open) => !open && setDeleteRouteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this route?</AlertDialogTitle>
            <AlertDialogDescription>
              This route will be permanently removed. Orders matched to this route may no longer appear in your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-route"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDeleteRoute(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

async function uploadVideoFile(f: File): Promise<string> {
  const token = localStorage.getItem("pawzone_token");
  const fd = new FormData();
  fd.append("file", f);
  const up = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token ?? ""}` },
    body: fd,
  });
  const upJson = await up.json();
  if (!up.ok) throw new Error(upJson?.error || "Upload failed");
  return upJson.url as string;
}

async function postJson(path: string, body: any) {
  const token = localStorage.getItem("pawzone_token");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

function PickupVideoBlock({ orderId, existingUrl, onDone }: { orderId: number; existingUrl?: string | null; onDone: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(existingUrl ?? null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast({ variant: "destructive", title: "Please select a video file" }); return; }
    setBusy(true);
    try {
      const videoUrl = await uploadVideoFile(f);
      await postJson(`/api/transporter/orders/${orderId}/pickup`, { pickupVideoUrl: videoUrl, petCode: "SCAN" });
      setUrl(videoUrl);
      toast({ title: "Pickup confirmed", description: "Order moved to picked up." });
      onDone();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
      <p className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-1.5">
        <Upload className="w-4 h-4" /> Upload Pickup Video
      </p>
      <p className="text-xs text-orange-700 mb-2">Record a short video confirming you have collected the pet from the seller.</p>
      {url && <video src={url} controls className="w-full max-w-xs h-24 rounded-lg object-cover bg-black mb-2" />}
      <input ref={fileRef} type="file" accept="video/*" className="hidden" data-testid={`input-pickup-video-${orderId}`} onChange={onPick} />
      <Button size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => fileRef.current?.click()} data-testid={`button-upload-pickup-${orderId}`}>
        {busy ? "Uploading…" : url ? "Replace Video" : "Upload & Confirm Pickup"}
      </Button>
    </div>
  );
}

function StartInTransitBlock({ orderId, onDone }: { orderId: number; onDone: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast({ variant: "destructive", title: "Please select a video file" }); return; }
    setBusy(true);
    try {
      const videoUrl = await uploadVideoFile(f);
      await postJson(`/api/transporter/orders/${orderId}/in-transit`, { inTransitVideoUrl: videoUrl });
      toast({ title: "In transit!", description: "Order is now in transit." });
      onDone();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err?.message ?? "" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
      <p className="text-sm font-semibold text-purple-800 mb-1 flex items-center gap-1.5">
        <Truck className="w-4 h-4" /> Mark In Transit
      </p>
      <p className="text-xs text-purple-700 mb-2">Upload a short video showing the pet is safely in transit.</p>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" data-testid={`input-in-transit-video-${orderId}`} onChange={onPick} />
      <Button size="sm" variant="outline" className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? "Uploading…" : "Upload & Start Transit"}
      </Button>
    </div>
  );
}

function DeliveryVideoBlock({ orderId, existingUrl, onDone }: { orderId: number; existingUrl?: string | null; onDone: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(existingUrl ?? null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast({ variant: "destructive", title: "Please select a video file" }); return; }
    setBusy(true);
    try {
      const videoUrl = await uploadVideoFile(f);
      await postJson(`/api/transporter/orders/${orderId}/delivery`, { deliveryVideoUrl: videoUrl });
      setUrl(videoUrl);
      toast({ title: "Delivery confirmed!", description: "Order marked as delivered." });
      onDone();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
      <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1.5">
        <CheckCircle className="w-4 h-4" /> Confirm Delivery
      </p>
      <p className="text-xs text-green-700 mb-2">Upload a video showing the pet handed over to the buyer.</p>
      {url && <video src={url} controls className="w-full max-w-xs h-24 rounded-lg object-cover bg-black mb-2" />}
      <input ref={fileRef} type="file" accept="video/*" className="hidden" data-testid={`input-delivery-video-${orderId}`} onChange={onPick} />
      <Button size="sm" variant="outline" className="rounded-xl border-green-200 text-green-700 hover:bg-green-50" disabled={busy} onClick={() => fileRef.current?.click()} data-testid={`button-upload-delivery-${orderId}`}>
        {busy ? "Uploading…" : url ? "Replace Video" : "Upload & Confirm Delivery"}
      </Button>
    </div>
  );
}
