import { Link, useLocation } from "wouter";
import { useGetCart, useRemoveFromCart, useUpdateCartItem, usePlaceOrder } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, platformFee } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trash2, ShoppingCart, AlertCircle, Plus, Minus,
  Tag, MapPin, CheckCircle, Clock, Shield, X, User
} from "lucide-react";
import { useState } from "react";

const KERALA_DISTRICTS: Record<string, string[]> = {
  "Thiruvananthapuram": ["Thiruvananthapuram", "Neyyattinkara", "Attingal", "Varkala", "Nedumangad", "Kazhakoottam", "Balaramapuram"],
  "Kollam": ["Kollam", "Punalur", "Karunagappally", "Kottarakkara", "Paravur", "Chavara", "Kundara"],
  "Pathanamthitta": ["Pathanamthitta", "Adoor", "Thiruvalla", "Ranni", "Pandalam", "Konni", "Kozhencherry"],
  "Alappuzha": ["Alappuzha", "Chengannur", "Mavelikkara", "Kayamkulam", "Haripad", "Cherthala", "Kuttanad"],
  "Kottayam": ["Kottayam", "Pala", "Changanassery", "Ettumanoor", "Vaikom", "Kanjirappally", "Erattupetta"],
  "Idukki": ["Idukki", "Thodupuzha", "Munnar", "Kattappana", "Adimali", "Devikulam", "Kumily"],
  "Ernakulam": ["Kochi", "Aluva", "Perumbavoor", "Angamaly", "North Paravur", "Kothamangalam", "Muvattupuzha", "Thrippunithura", "Tripunithura", "Kakkanad", "Kadavanthara", "Panampally"],
  "Thrissur": ["Thrissur", "Chalakudy", "Kunnamkulam", "Guruvayur", "Irinjalakuda", "Kodungallur", "Mala"],
  "Palakkad": ["Palakkad", "Ottappalam", "Mannarkkad", "Chittur", "Pattambi", "Shornur", "Alathur"],
  "Malappuram": ["Malappuram", "Manjeri", "Tirur", "Perinthalmanna", "Ponnani", "Kondotty", "Kalpetta"],
  "Kozhikode": ["Kozhikode", "Vadakara", "Koyilandy", "Feroke", "Ramanattukara", "Mukkam", "Koduvally"],
  "Wayanad": ["Kalpetta", "Sulthan Bathery", "Mananthavady", "Vythiri", "Ambalavayal", "Pulpally"],
  "Kannur": ["Kannur", "Thalassery", "Iritty", "Payyanur", "Mattannur", "Sreekandapuram", "Panoor"],
  "Kasaragod": ["Kasaragod", "Kanhangad", "Hosdurg", "Nileshwar", "Bekal", "Cheruvathur", "Uppala"],
};

const KERALA_CITIES = Object.keys(KERALA_DISTRICTS);

function AddDeliveryPointModal({
  onAdd,
  onClose,
  existing,
}: {
  onAdd: (district: string, towns: string[]) => void;
  onClose: () => void;
  existing: string[];
}) {
  const [district, setDistrict] = useState("");
  const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
  const towns = district ? (KERALA_DISTRICTS[district] ?? []) : [];

  const toggleTown = (town: string) => {
    setSelectedTowns(prev =>
      prev.includes(town) ? prev.filter(t => t !== town) : [...prev, town]
    );
  };

  const handleAdd = () => {
    const newTowns = selectedTowns.filter(t => !existing.includes(t));
    if (newTowns.length === 0) return;
    onAdd(district, newTowns);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" /> Add for This Order
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          These points apply only to <strong>this order</strong>. Your profile default delivery points are not changed.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">District</label>
            <Select value={district} onValueChange={(v) => { setDistrict(v); setSelectedTowns([]); }}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {KERALA_CITIES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {district && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Towns in {district} — select all that apply
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {towns.map(town => {
                  const alreadySaved = existing.includes(town);
                  const checked = selectedTowns.includes(town);
                  return (
                    <label
                      key={town}
                      className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                        alreadySaved
                          ? "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                          : checked
                            ? "bg-orange-50 border border-orange-300 text-orange-700 font-medium"
                            : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-orange-500 flex-shrink-0"
                        checked={checked}
                        disabled={alreadySaved}
                        onChange={() => !alreadySaved && toggleTown(town)}
                      />
                      {town}
                      {alreadySaved && <span className="text-xs text-gray-400">(saved)</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
            disabled={selectedTowns.filter(t => !existing.includes(t)).length === 0}
            onClick={handleAdd}
          >
            Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CartPage() {
  const { user } = useAuth() as any;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Profile-saved delivery points (read-only here — not modified)
  const savedPoints: string[] = (user as any)?.deliveryPoints ?? [];

  // Order-specific extra delivery points (local state only — NOT saved to profile)
  const [extraPoints, setExtraPoints] = useState<string[]>([]);

  const allPoints = [...savedPoints, ...extraPoints];
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showAddPoint, setShowAddPoint] = useState(false);

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
          description: `Order #${order.orderNumber} sent to seller. Once a transporter accepts, you'll be notified to complete payment.`,
        });
        setLocation("/buyer/orders");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Order failed", description: err?.data?.error || "Failed to place order" });
      },
    },
  });

  const items: any[] = (cart as any)?.items ?? [];
  const subtotal = Number((cart as any)?.subtotal ?? 0);
  const fees = Number((cart as any)?.platformFee ?? 0);
  const total = Number((cart as any)?.total ?? 0) || subtotal + fees;

  const hour = new Date().getHours();
  const isNightTime = hour >= 21;

  const handleAddOrderPoints = (district: string, towns: string[]) => {
    const newTowns = towns.filter(t => !allPoints.includes(t));
    if (newTowns.length > 0) {
      setExtraPoints(prev => [...prev, ...newTowns]);
      toast({ title: `📍 ${newTowns.join(", ")} added for this order` });
    }
  };

  const removeExtraPoint = (town: string) => {
    setExtraPoints(prev => prev.filter(t => t !== town));
  };

  const deliveryAddress = allPoints.length > 0 ? allPoints.join(", ") : (user?.address || user?.city || "");
  const canPlaceOrder = deliveryAddress.trim().length > 0;

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-teal-600" />
            Shopping Cart
          </h1>
          <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""} in your cart</p>
        </div>

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
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {photo ? (
                        <img src={photo} alt={listing.breed} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{listing.breed || "Unknown Pet"}</h3>
                          <p className="text-sm text-gray-400 capitalize">{listing.category || ""}</p>
                          {listing.sellerName && <p className="text-xs text-gray-400 mt-0.5">Sold by {listing.sellerName}</p>}
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
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                          <button
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              if (qty <= 1) removeItem.mutate({ listingId: item.listingId });
                              else updateItem.mutate({ listingId: item.listingId, data: { quantity: qty - 1 } });
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

            {/* Delivery Points */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Delivery Points</h2>

              {/* Section A: Profile defaults (read-only) */}
              {savedPoints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Your Saved Points</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {savedPoints.map((point) => (
                      <span key={point} className="inline-flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200 text-teal-700 rounded-full px-3 py-1.5 font-medium">
                        <MapPin className="w-3 h-3" /> {point}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section B: Order-specific extra points */}
              {extraPoints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Added for This Order</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extraPoints.map((point) => (
                      <span key={point} className="inline-flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-3 py-1.5 font-medium">
                        <MapPin className="w-3 h-3" /> {point}
                        <button
                          type="button"
                          onClick={() => removeExtraPoint(point)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-orange-600 italic">
                    These points won't be saved to your profile.
                  </p>
                </div>
              )}

              {/* No points at all */}
              {savedPoints.length === 0 && extraPoints.length === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No delivery points set. Add at least one town where you can receive deliveries.
                </p>
              )}

              {/* Add order-specific point button */}
              <button
                type="button"
                onClick={() => setShowAddPoint(true)}
                className="flex items-center gap-1.5 text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors border border-orange-200 rounded-xl px-4 py-2.5 w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Delivery Point for This Order
              </button>

              {/* Special Instructions */}
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
                disabled={!canPlaceOrder || placeOrder.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {placeOrder.isPending ? "Placing order..." : `Place Order · ${formatPrice(total)}`}
              </Button>
              {!canPlaceOrder && (
                <p className="text-xs text-red-500 text-center">Please add at least one delivery point to continue.</p>
              )}
              <p className="text-xs text-gray-400 text-center">⏰ Payment due within 3 hours of order placement</p>

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
                          Transport charges will be added after a transporter accepts the order. You will complete payment after that.
                        </p>
                        {allPoints.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {savedPoints.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-xs text-gray-500">Profile points:</span>
                                {savedPoints.map(p => (
                                  <span key={p} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                                ))}
                              </div>
                            )}
                            {extraPoints.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-xs text-gray-500">This order only:</span>
                                {extraPoints.map(p => (
                                  <span key={p} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="ghost" onClick={() => setConfirmOpen(false)} data-testid="button-cancel-place-order">Cancel</Button>
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

      {showAddPoint && (
        <AddDeliveryPointModal
          existing={allPoints}
          onAdd={handleAddOrderPoints}
          onClose={() => setShowAddPoint(false)}
        />
      )}
    </div>
  );
}
