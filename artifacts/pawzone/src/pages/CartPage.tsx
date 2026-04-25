import { Link, useLocation } from "wouter";
import { useGetCart, useRemoveFromCart, useUpdateCartItem, usePlaceOrder } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, platformFee } from "@/lib/api";
import { Trash2, ShoppingCart, PawPrint, AlertCircle } from "lucide-react";
import { useState } from "react";

export function CartPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: cart, refetch } = useGetCart({ query: { enabled: !!user } });

  const removeItem = useRemoveFromCart({
    mutation: {
      onSuccess: () => { refetch(); toast({ title: "Item removed" }); },
    },
  });

  const updateItem = useUpdateCartItem({
    mutation: {
      onSuccess: () => refetch(),
    },
  });

  const placeOrder = usePlaceOrder({
    mutation: {
      onSuccess: (order) => {
        toast({ title: "Order placed!", description: `Order #${order.orderNumber} placed successfully.` });
        setLocation("/buyer/orders");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to place order" });
      },
    },
  });

  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const fees = items.reduce((s, i) => s + platformFee(i.price) * i.quantity, 0);
  const total = subtotal + fees;

  // Night rule check
  const hour = new Date().getHours();
  const isNightTime = hour >= 21;

  if (!items.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Browse our pets to find your perfect companion.</p>
          <Link href="/listings">
            <Button>Browse Pets</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          Shopping Cart ({items.length} items)
        </h1>

        {isNightTime && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Orders placed after 9 PM will be processed the next business day.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.listingId}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.photo ? (
                        <img src={item.photo} alt={item.breed} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{item.breed}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(item.price)} each + ₹{platformFee(item.price)} fee</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem.mutate({ listingId: item.listingId })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-7 h-7 rounded border flex items-center justify-center text-sm hover:bg-muted"
                          onClick={() => updateItem.mutate({ listingId: item.listingId, data: { quantity: Math.max(1, item.quantity - 1) } })}
                        >-</button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          className="w-7 h-7 rounded border flex items-center justify-center text-sm hover:bg-muted"
                          onClick={() => updateItem.mutate({ listingId: item.listingId, data: { quantity: item.quantity + 1 } })}
                        >+</button>
                      </div>
                      <p className="font-semibold text-sm">{formatPrice((item.price + platformFee(item.price)) * item.quantity)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform fees</span>
                  <span>{formatPrice(fees)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Delivery Address *</label>
                  <textarea
                    className="w-full text-sm border rounded-md p-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Enter your delivery address in Kerala..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Notes (optional)</label>
                  <textarea
                    className="w-full text-sm border rounded-md p-2 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Any special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!deliveryAddress.trim() || placeOrder.isPending}
                  onClick={() => placeOrder.mutate({ data: { deliveryAddress, notes: notes || undefined } })}
                >
                  {placeOrder.isPending ? "Placing order..." : `Place Order · ${formatPrice(total)}`}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Payment due within 3 hours of order placement
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
