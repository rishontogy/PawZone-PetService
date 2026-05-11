import { useState } from "react";
import { Link } from "wouter";
import { useGetListings, useDeleteListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { PlusCircle, Edit, Trash2, PawPrint, Package, PackagePlus, Shield } from "lucide-react";

export function SellerListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restockId, setRestockId] = useState<number | null>(null);
  const [restockQty, setRestockQty] = useState("1");
  const [restocking, setRestocking] = useState(false);

  // Filter by sellerId to only show THIS seller's listings (security fix)
  const { data: rawData, refetch } = useGetListings(
    { sellerId: user?.id as any },
    { query: { enabled: !!user?.id } }
  );
  const data = rawData as any;

  const deleteMutation = useDeleteListing({
    mutation: {
      onSuccess: () => { toast({ title: "Listing deleted" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const myListings: any[] = data?.listings ?? [];

  async function submitRestock() {
    if (restockId == null) return;
    const qty = parseInt(restockQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast({ variant: "destructive", title: "Enter a positive quantity" });
      return;
    }
    setRestocking(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch(`/api/listings/${restockId}/restock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        credentials: "include",
        body: JSON.stringify({ quantityToAdd: qty }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Restock failed");
      }
      toast({ title: "Restocked", description: `Added ${qty} unit(s) — listing is live again.` });
      setRestockId(null);
      setRestockQty("1");
      refetch();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message });
    } finally {
      setRestocking(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6" /> My Listings
            </h1>
            <p className="text-teal-100 text-sm mt-1">{myListings.length} listing{myListings.length !== 1 ? "s" : ""} in your shop</p>
          </div>
          <Link href="/seller/listings/new">
            <Button className="gap-2 bg-white text-teal-700 hover:bg-teal-50 font-bold rounded-xl shadow-lg">
              <PlusCircle className="w-4 h-4" /> Add Listing
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 pb-12">
        {!myListings.length ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <PawPrint className="w-10 h-10 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create your first listing to start selling pets on PawZone.</p>
            <Link href="/seller/listings/new">
              <Button className="rounded-xl px-8">Create First Listing</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myListings.map((listing: any) => (
              <div key={listing.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {listing.photos?.[0] ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.breed}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x225?text=Pet"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(listing.status)}`}>
                      {listing.status === "sold_out" ? "out of stock" : listing.status}
                    </span>
                    {listing.status !== "sold_out" && listing.availableQuantity === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
                        out of stock
                      </span>
                    )}
                  </div>
                  {listing.status === "rejected" && listing.rejectionReason && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs p-2">
                      Rejected: {listing.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900">{listing.breed}</h3>
                  <p className="text-xs text-gray-400 capitalize mb-1">{listing.category}</p>
                  {listing.petCode && (
                    <div className="flex items-center gap-1 mb-2">
                      <Shield className="w-3 h-3 text-teal-600" />
                      <code className="text-xs text-teal-600 font-mono">{listing.petCode}</code>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-teal-600 text-lg">{formatPrice(Number(listing.price ?? 0))}</p>
                    <p className="text-xs text-gray-400">
                      {listing.availableQuantity}/{listing.quantity} available
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {listing.availableQuantity === 0 ? (
                      <Button
                        size="sm"
                        className="flex-1 gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => { setRestockId(listing.id); setRestockQty("1"); }}
                      >
                        <PackagePlus className="w-3 h-3" /> Restock
                      </Button>
                    ) : (
                      <Link href={`/seller/listings/${listing.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1 rounded-xl">
                          <Edit className="w-3 h-3" /> Edit
                        </Button>
                      </Link>
                    )}
                    {listing.availableQuantity === 0 && (
                      <Link href={`/seller/listings/${listing.id}/edit`}>
                        <Button variant="outline" size="sm" className="gap-1 rounded-xl">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 border-red-200 rounded-xl"
                      onClick={() => {
                        if (confirm(`Delete listing for "${listing.breed}"?`)) {
                          deleteMutation.mutate({ id: listing.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {restockId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !restocking && setRestockId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Restock listing</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">How many units would you like to add back to inventory?</p>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1 rounded-xl" disabled={restocking} onClick={() => setRestockId(null)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={restocking} onClick={submitRestock}>
                {restocking ? "Adding..." : "Add to stock"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
