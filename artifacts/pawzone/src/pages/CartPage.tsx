import { Link, useLocation } from "wouter";
import { useGetCart, useRemoveFromCart, useUpdateCartItem, usePlaceOrder } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, platformFee } from "@/lib/api";
import {
  Trash2, ShoppingCart, PawPrint, AlertCircle, Plus, Minus, ArrowLeft,
  Tag, MapPin, CheckCircle, Clock, Shield
} from "lucide-react";
import { useState } from "react";

export function CartPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const savedPoints: string[] = (user as any)?.deliveryPoints ?? [];
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState(savedPoints[0] ?? "");
  const [customAddress, setCustomAddress] = useState(user?.address || "");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deliveryAddress = selectedDeliveryPoint || customAddress;

  const { data: cart, refetch } = useGetCart({ query: { enabled: !!user } } as any);

  const removeItem = useRemoveFromCart({
    mutation: {
      onSuccess: () => { refetch(); toast({ title: "Item removed from cart" }); },
    },
  });

  const updateItem = useUpdateCartItem({
    mutation: {
      onSuccess: () => refetch(),
    },
  });

  const placeOrder = usePlaceOrder({
    mutation: {
      onSuccess: (order: any) => {
        toast({
          title: "🎉 Order placed!",
          description: `Order #${order.orderNumber} sent to seller. Once accepted, a transporter will set the delivery charge — you'll be notified to pay the final total.`,
        });
        setLocation("/buyer/orders");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Order failed", description: err?.data?.error || "Failed to place order" });
      },
    },
  });

  // Backend returns: { items: [{listingId, listing:{...}, quantity, subtotal, platformFee}], subtotal, platformFee, total, itemCount }
  const items: any[] = (cart as any)?.items ?? [];
  const subtotal = Number((cart as any)?.subtotal ?? 0);
  const fees = Number((cart as any)?.platformFee ?? 0);
  const total = Number((cart as any)?.total ?? 0) || subtotal + fees;

  const hour = new Date().getHours();
  const isNightTime = hour >= 21;

  if (!items.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added any pets yet. Browse our listings to find your perfect companion!</p>
          <Link href="/listings">
            <Button className="rounded-xl px-8">Browse Pets</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-teal-600" />
            Shopping Cart
          </h1>
          <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""} in your cart</p>
        </div>

        {/* Night warning — informational only, orders still allowed */}
        {isNightTime && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Late night order</p>
              <p className="text-amber-700">Your order is placed now. Seller confirmation starts from 9 AM tomorrow.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item: any) => {
              const listing = item.listing ?? {};
              const price = Number(listing.price ?? 0);
              const qty = Number(item.quantity ?? 1);
              const itemSubtotal = Number(item.subtotal ?? price * qty);
              const itemFee = Number(item.platformFee ?? platformFee(price) * qty);
              const itemTotal = itemSubtotal + itemFee;
              const photo = listing.photos?.[0] ?? null;

              return (
                <div key={item.listingId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {photo ? (
                        <img src={photo} alt={listing.breed} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{listing.breed || "Unknown Pet"}</h3>
                          <p className="text-sm text-gray-400 capitalize">{listing.category || ""}</p>
                          {listing.sellerName && (
                            <p className="text-xs text-gray-400 mt-0.5">Sold by {listing.sellerName}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                            <Tag className="w-3 h-3" />
                            {formatPrice(price)} + ₹{platformFee(price)} fee
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem.mutate({ listingId: item.listingId })}
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity */}
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                          <button
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              if (qty <= 1) {
                                removeItem.mutate({ listingId: item.listingId });
                              } else {
                                updateItem.mutate({ listingId: item.listingId, data: { quantity: qty - 1 } });
                              }
                            }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
                          <button
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                            onClick={() => updateItem.mutate({ listingId: item.listingId, data: { quantity: qty + 1 } })}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-teal-600 text-lg">{formatPrice(itemTotal)}</p>
                          <p className="text-xs text-gray-400">incl. ₹{platformFee(price) * qty} fee</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Order Summary</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({items.length} pet{items.length !== 1 ? "s" : ""})</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platform fees</span>
                  <span className="font-medium">{formatPrice(fees)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transport charge</span>
                  <span className="text-amber-600 font-medium text-xs italic">Added after transporter accepts</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span className="text-teal-600 text-lg">{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 space-y-2">
              {[
                { icon: <CheckCircle className="w-4 h-4 text-teal-600" />, text: "Verified pet listings" },
                { icon: <Shield className="w-4 h-4 text-teal-600" />, text: "Secure payment" },
                { icon: <Clock className="w-4 h-4 text-teal-600" />, text: "3-hour payment window" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-teal-800">
                  {b.icon} {b.text}
                </div>
              ))}
            </div>

            {/* Delivery & Checkout */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Delivery Details</h2>

              {/* Delivery Point selector */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Select Delivery Point *
                </label>
                {savedPoints.length > 0 ? (
                  <div className="space-y-2">
                    {savedPoints.map((point) => (
                      <label
                        key={point}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedDeliveryPoint === point
                            ? "border-teal-500 bg-teal-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryPoint"
                          value={point}
                          checked={selectedDeliveryPoint === point}
                          onChange={() => setSelectedDeliveryPoint(point)}
                          className="accent-teal-600"
                        />
                        <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span className={`text-sm font-medium ${selectedDeliveryPoint === point ? "text-teal-800" : "text-gray-700"}`}>
                          {point}
                        </span>
                      </label>
                    ))}
                    <p className="text-xs text-gray-400 mt-1">
                      Transporter will be matched based on your selected delivery point.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                      No delivery points saved. Add them in your profile settings, or enter an address below.
                    </p>
                    <textarea
                      className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      placeholder="Enter your delivery address..."
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Special Instructions</label>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                className="w-full h-12 rounded-xl text-base font-bold"
                data-testid="button-place-order"
                disabled={!deliveryAddress.trim() || placeOrder.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {placeOrder.isPending ? "Placing order..." : `Place Order · ${formatPrice(total)}`}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                ⏰ Payment due within 3 hours of order placement
              </p>

              {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="dialog-place-order-confirm">
                  <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Before you continue</h3>
                        <p className="text-sm text-gray-600">
                          Transport charges will be added after a transporter accepts the order. You can complete payment after that.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmOpen(false)}
                        data-testid="button-cancel-place-order"
                      >
                        Cancel
                      </Button>
                      <Button
                        data-testid="button-confirm-place-order"
                        onClick={() => {
                          setConfirmOpen(false);
                          placeOrder.mutate({ data: { deliveryAddress, notes: notes || undefined } as any });
                        }}
                      >
                        OK, Continue
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

