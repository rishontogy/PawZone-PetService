import { useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetListing, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, platformFee, getApiBase } from "@/lib/api";
import { PawPrint, MapPin, ShoppingCart, Shield, Star, Play, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { MediaViewer, ClickableImage } from "@/components/MediaViewer";
import type { MediaItem } from "@/components/MediaViewer";

function MediaCarousel({ media }: { media: MediaItem[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const safeIdx = Math.min(activeIdx, Math.max(0, media.length - 1));
  const active = media[safeIdx];

  const prev = useCallback(() => setActiveIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setActiveIdx(i => Math.min(media.length - 1, i + 1)), [media.length]);

  const openViewer = (idx: number) => {
    setViewerIdx(idx);
    setViewerOpen(true);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0));
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (media.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-2xl flex items-center justify-center">
        <PawPrint className="w-16 h-16 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main display */}
      <div
        className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden group cursor-pointer"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => openViewer(safeIdx)}
      >
        {active.kind === "image" ? (
          <ClickableImage
            src={active.url}
            alt="Pet photo"
            className="w-full h-full object-contain"
            lazy={false}
          />
        ) : (
          <div className="relative w-full h-full bg-black">
            <video
              key={active.url}
              src={active.url}
              className="w-full h-full object-contain"
              preload="metadata"
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-gray-900 fill-gray-900 ml-1" />
              </div>
            </div>
          </div>
        )}

        {/* Zoom hint overlay for images */}
        {active.kind === "image" && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Left/Right arrows (desktop) */}
        {safeIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        )}
        {safeIdx < media.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Dot indicators */}
        {media.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                className={`rounded-full transition-all ${i === safeIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="gallery-thumbnails">
          {media.map((m, i) => (
            <button
              key={`${m.kind}-${i}`}
              onClick={() => setActiveIdx(i)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === safeIdx ? "border-teal-500 scale-105 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
              } bg-gray-100`}
              data-testid={`thumb-${m.kind}-${i}`}
            >
              {m.kind === "image" ? (
                <img src={m.url} alt="" className="w-full h-full object-contain" loading="lazy" />
              ) : (
                <>
                  <video src={m.url} className="w-full h-full object-cover bg-black" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen viewer */}
      {viewerOpen && (
        <MediaViewer items={media} initialIndex={viewerIdx} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}

function ParentPhoto({ src, label, borderColor, badgeClass, badgeText, onOpen }: {
  src: string; label: string; borderColor: string; badgeClass: string; badgeText: string;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="space-y-1.5">
      <button
        className={`w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 ${borderColor} relative group cursor-zoom-in`}
        onClick={onOpen}
      >
        {!loaded && !error && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
            <PawPrint className="w-8 h-8" />
            <span className="text-xs">No photo</span>
          </div>
        ) : (
          <img
            src={src}
            alt={label}
            loading="lazy"
            className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => { setError(true); setLoaded(true); }}
          />
        )}
        {loaded && !error && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            <ZoomIn className="w-5 h-5 text-white drop-shadow-lg" />
          </div>
        )}
      </button>
      <div className="flex items-center justify-center">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}>{badgeText}</span>
      </div>
    </div>
  );
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [maleQtyBoth, setMaleQtyBoth] = useState(1);
  const [femaleQtyBoth, setFemaleQtyBoth] = useState(1);
  const [gender, setGender] = useState<"male" | "female" | "pair" | "both" | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [parentViewerOpen, setParentViewerOpen] = useState(false);
  const [parentViewerIdx, setParentViewerIdx] = useState(0);

  const queryClient = useQueryClient();
  const { data: listing, isLoading } = useGetListing(parseInt(id!));

  const handleAddToCart = async () => {
    if (!listing) return;
    const listingData = listing as any;
    const pairOnlyCheck = (listingData.pairCount ?? 0) > 0 && listing.availableQuantity === (listingData.pairCount ?? 0) * 2;
    const effectiveGender = pairOnlyCheck ? "pair" : gender;
    const hasMale = (listingData.maleQuantity ?? 0) > 0;
    const hasFemale = (listingData.femaleQuantity ?? 0) > 0;
    const needsGender = !pairOnlyCheck && (hasMale || hasFemale);
    if (needsGender && !effectiveGender) {
      toast({ variant: "destructive", title: "Select option", description: "Please choose how you'd like to buy." });
      return;
    }

    setAddingToCart(true);
    try {
      if (gender === "both") {
        if (maleQtyBoth <= 0 && femaleQtyBoth <= 0) {
          toast({ variant: "destructive", title: "Invalid quantity", description: "Select at least 1 male or female." });
          return;
        }
        const requests: Promise<Response>[] = [];
        if (maleQtyBoth > 0) {
          requests.push(fetch(`${getApiBase()}/cart`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ listingId: listing.id, quantity: maleQtyBoth, gender: "male" }),
          }));
        }
        if (femaleQtyBoth > 0) {
          requests.push(fetch(`${getApiBase()}/cart`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ listingId: listing.id, quantity: femaleQtyBoth, gender: "female" }),
          }));
        }
        const results = await Promise.all(requests);
        const failed = results.find(r => !r.ok);
        if (failed) {
          const errData = await failed.json();
          toast({ variant: "destructive", title: "Error", description: errData.error || "Failed to add to cart" });
          return;
        }
        toast({ title: "Added to cart!", description: `${listing.breed} (both genders) added to your cart.` });
      } else {
        const res = await fetch(`${getApiBase()}/cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ listingId: listing.id, quantity: qty, ...(effectiveGender ? { gender: effectiveGender } : {}) }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({ variant: "destructive", title: "Error", description: data.error || "Failed to add to cart" });
          return;
        }
        toast({ title: "Added to cart!", description: `${listing.breed} added to your cart.` });
      }
      void queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    } finally {
      setAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              {[80, 40, 60, 100, 80].map((w, i) => (
                <div key={i} className="h-5 bg-gray-200 rounded-lg animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
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

  const l = listing as any;
  const isPairOnly = (l.pairCount ?? 0) > 0 && l.availableQuantity === (l.pairCount ?? 0) * 2;
  const fee = platformFee(listing.price, isPairOnly);
  const total = (listing.price + fee) * qty;

  const media: MediaItem[] = [
    ...(listing.photos ?? []).map((url, i) => ({ kind: "image" as const, url, label: `Photo ${i + 1}` })),
    ...(listing.videoUrl ? [{ kind: "video" as const, url: listing.videoUrl, label: "Video" }] : []),
  ];

  const parentPhotos: MediaItem[] = [
    ...(listing.fatherPhoto ? [{ kind: "image" as const, url: listing.fatherPhoto, label: "♂ Father" }] : []),
    ...(listing.motherPhoto ? [{ kind: "image" as const, url: listing.motherPhoto, label: "♀ Mother" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Media gallery */}
          <div>
            <MediaCarousel media={media} />

            {/* Parent Photos */}
            {parentPhotos.length > 0 && (
              <div className="mt-5 space-y-2">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  Parent Photos
                  <span className="text-xs text-gray-400 font-normal">tap to enlarge</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {listing.fatherPhoto && (
                    <ParentPhoto
                      src={listing.fatherPhoto}
                      label="Father"
                      borderColor="border-blue-200"
                      badgeClass="bg-blue-100 text-blue-700"
                      badgeText="♂ Father"
                      onOpen={() => { setParentViewerIdx(0); setParentViewerOpen(true); }}
                    />
                  )}
                  {listing.motherPhoto && (
                    <ParentPhoto
                      src={listing.motherPhoto}
                      label="Mother"
                      borderColor="border-pink-200"
                      badgeClass="bg-pink-100 text-pink-700"
                      badgeText="♀ Mother"
                      onOpen={() => { setParentViewerIdx(listing.fatherPhoto ? 1 : 0); setParentViewerOpen(true); }}
                    />
                  )}
                </div>
                {parentViewerOpen && (
                  <MediaViewer items={parentPhotos} initialIndex={parentViewerIdx} onClose={() => setParentViewerOpen(false)} />
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant="secondary" className="capitalize">{listing.category}</Badge>
                {listing.vaccinated && (
                  <Badge className="bg-green-100 text-green-800 border-0">✓ Vaccinated</Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{listing.breed}</h1>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{listing.city}, Kerala</span>
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
              <p className="text-sm text-teal-700">{isPairOnly ? "Price per pair" : "Price per pet"}</p>
              <p className="text-3xl font-bold text-teal-700">{formatPrice(listing.price)}</p>
              <p className="text-xs text-teal-600/70 mt-1">+ ₹{fee} platform fee{isPairOnly ? " (pair listing)" : ""}</p>
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
                <h3 className="font-semibold mb-1 text-gray-900">About this pet</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{listing.description}</p>
              </div>
            )}

            {listing.vaccinationDetails && (
              <div>
                <h3 className="font-semibold mb-1 text-gray-900">Vaccination Details</h3>
                <p className="text-muted-foreground text-sm">{listing.vaccinationDetails}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isPairOnly ? (
                <span>{l.pairCount} pair{l.pairCount !== 1 ? "s" : ""} available</span>
              ) : (
                <span>{listing.availableQuantity} of {listing.quantity} available</span>
              )}
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
                {/* Purchase mode selection */}
                {(() => {
                  const maleQty = l.maleQuantity ?? 0;
                  const femaleQty = l.femaleQuantity ?? 0;
                  const pairQty = l.pairCount ?? 0;
                  const hasBoth = maleQty > 0 && femaleQty > 0;

                  if (isPairOnly) {
                    return (
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-sm font-semibold text-purple-700 mb-1">♥ Pair listing — sold as pairs only</p>
                        <p className="text-xs text-purple-600">{pairQty} pair{pairQty !== 1 ? "s" : ""} available · ₹{listing.price} per pair</p>
                      </div>
                    );
                  }

                  if (maleQty > 0 || femaleQty > 0) {
                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">How would you like to buy?</p>
                        <div className="grid grid-cols-2 gap-2">
                          {maleQty > 0 && (
                            <button
                              type="button"
                              onClick={() => { setGender("male"); setQty(1); }}
                              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                                gender === "male"
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 hover:border-blue-300 text-gray-700"
                              }`}
                            >
                              ♂ Male only
                              <span className="block text-xs mt-0.5 font-normal text-gray-500">{maleQty} available</span>
                            </button>
                          )}
                          {femaleQty > 0 && (
                            <button
                              type="button"
                              onClick={() => { setGender("female"); setQty(1); }}
                              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                                gender === "female"
                                  ? "border-pink-500 bg-pink-50 text-pink-700"
                                  : "border-gray-200 hover:border-pink-300 text-gray-700"
                              }`}
                            >
                              ♀ Female only
                              <span className="block text-xs mt-0.5 font-normal text-gray-500">{femaleQty} available</span>
                            </button>
                          )}
                          {hasBoth && (
                            <button
                              type="button"
                              onClick={() => { setGender("both"); setMaleQtyBoth(1); setFemaleQtyBoth(1); }}
                              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                                gender === "both"
                                  ? "border-teal-500 bg-teal-50 text-teal-700"
                                  : "border-gray-200 hover:border-teal-300 text-gray-700"
                              }`}
                            >
                              ♂♀ Both genders
                              <span className="block text-xs mt-0.5 font-normal text-gray-500">Mix male + female</span>
                            </button>
                          )}
                          {pairQty > 0 && (
                            <button
                              type="button"
                              onClick={() => { setGender("pair"); setQty(1); }}
                              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                                gender === "pair"
                                  ? "border-purple-500 bg-purple-50 text-purple-700"
                                  : "border-gray-200 hover:border-purple-300 text-gray-700"
                              }`}
                            >
                              ♥ Bonded pair
                              <span className="block text-xs mt-0.5 font-normal text-gray-500">{pairQty} pair{pairQty > 1 ? "s" : ""} available</span>
                            </button>
                          )}
                        </div>

                        {/* Both genders: separate qty controls */}
                        {gender === "both" && (
                          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-gray-500 font-medium">Set quantity for each gender:</p>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-700 font-medium w-16">♂ Male:</span>
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setMaleQtyBoth(q => Math.max(0, q - 1))}>-</Button>
                                <span className="w-6 text-center text-sm font-medium">{maleQtyBoth}</span>
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setMaleQtyBoth(q => Math.min(maleQty, q + 1))}>+</Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-pink-600 font-medium w-16">♀ Female:</span>
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setFemaleQtyBoth(q => Math.max(0, q - 1))}>-</Button>
                                <span className="w-6 text-center text-sm font-medium">{femaleQtyBoth}</span>
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setFemaleQtyBoth(q => Math.min(femaleQty, q + 1))}>+</Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Single qty (male/female/pair modes) */}
                {gender !== "both" && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium">Quantity:</label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setQty(q => Math.max(1, q - 1))}>-</Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button variant="outline" size="sm" onClick={() => {
                        const l = listing as any;
                        const maxQty = gender === "male" ? (l.maleQuantity ?? listing.availableQuantity) :
                                       gender === "female" ? (l.femaleQuantity ?? listing.availableQuantity) :
                                       gender === "pair" ? (l.pairCount ?? 1) :
                                       listing.availableQuantity;
                        setQty(q => Math.min(maxQty, q + 1));
                      }}>+</Button>
                    </div>
                    {gender === "pair" && <span className="text-xs text-purple-600 font-medium">= {qty * 2} pets</span>}
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  {gender === "both" ? (
                    <span>
                      Total: <span className="font-semibold text-foreground">
                        {formatPrice((listing.price + platformFee(listing.price)) * (maleQtyBoth + femaleQtyBoth))}
                      </span>
                      <span className="text-xs ml-1">(incl. platform fee)</span>
                    </span>
                  ) : (
                    <span>
                      Total: <span className="font-semibold text-foreground">{formatPrice((listing.price + platformFee(listing.price, isPairOnly || gender === "pair")) * qty)}</span>
                      <span className="text-xs ml-1">(incl. platform fee)</span>
                    </span>
                  )}
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={listing.availableQuantity === 0 || addingToCart}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {listing.availableQuantity === 0 ? "Sold Out" : addingToCart ? "Adding..." : "Add to Cart"}
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
