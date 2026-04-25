import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetListing, useAddToCart } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, platformFee } from "@/lib/api";
import { PawPrint, MapPin, ShoppingCart, Shield, ChevronLeft, Star } from "lucide-react";

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [photoIdx, setPhotoIdx] = useState(0);

  const { data: listing, isLoading } = useGetListing(parseInt(id!));

  const addToCart = useAddToCart({
    mutation: {
      onSuccess: () => {
        toast({ title: "Added to cart!", description: `${listing?.breed} added to your cart.` });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to add to cart" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PawPrint className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p>Listing not found</p>
        </div>
      </div>
    );
  }

  const fee = platformFee(listing.price);
  const total = (listing.price + fee) * qty;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => setLocation("/listings")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to listings
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Photos */}
          <div className="space-y-3">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden">
              {listing.photos?.[photoIdx] ? (
                <img
                  src={listing.photos[photoIdx]}
                  alt={listing.breed}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/600x600?text=Pet"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PawPrint className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
            {listing.photos && listing.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIdx ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="capitalize">{listing.category}</Badge>
                {listing.vaccinated && (
                  <Badge className="bg-green-100 text-green-800 border-0">✓ Vaccinated</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">{listing.breed}</h1>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{listing.city}, Kerala</span>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Price per pet</p>
              <p className="text-3xl font-bold text-primary">{formatPrice(listing.price)}</p>
              <p className="text-xs text-muted-foreground mt-1">+ ₹{fee} platform fee</p>
            </div>

            {listing.petCode && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium">PetCode:</span>
                <code className="font-mono text-primary">{listing.petCode}</code>
              </div>
            )}

            {listing.description && (
              <div>
                <h3 className="font-semibold mb-1">About this pet</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{listing.description}</p>
              </div>
            )}

            {listing.vaccinationDetails && (
              <div>
                <h3 className="font-semibold mb-1">Vaccination Details</h3>
                <p className="text-muted-foreground text-sm">{listing.vaccinationDetails}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{listing.availableQuantity} of {listing.quantity} available</span>
            </div>

            {/* Seller info */}
            {(listing as any).sellerName && (
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <PawPrint className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{(listing as any).sellerName}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-muted-foreground">{(listing as any).sellerScore || "5.0"} rating</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add to Cart */}
            {user?.role === "buyer" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Quantity:</label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQty(q => Math.max(1, q - 1))}>-</Button>
                    <span className="w-8 text-center font-medium">{qty}</span>
                    <Button variant="outline" size="sm" onClick={() => setQty(q => Math.min(listing.availableQuantity, q + 1))}>+</Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{formatPrice(total)}</span>
                  <span className="text-xs ml-1">(incl. platform fee)</span>
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={listing.availableQuantity === 0 || addToCart.isPending}
                  onClick={() => addToCart.mutate({ data: { listingId: listing.id, quantity: qty } })}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {listing.availableQuantity === 0 ? "Sold Out" : addToCart.isPending ? "Adding..." : "Add to Cart"}
                </Button>
              </div>
            ) : !user ? (
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Login to Purchase
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
