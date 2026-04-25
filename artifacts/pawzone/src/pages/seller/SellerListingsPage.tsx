import { Link } from "wouter";
import { useGetListings, useDeleteListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { PlusCircle, Edit, Trash2, PawPrint, Package, ChevronRight } from "lucide-react";

export function SellerListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-8">
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

      <div className="max-w-5xl mx-auto px-6 -mt-4 pb-12">
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
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(listing.status)}`}>
                      {listing.status}
                    </span>
                  </div>
                  {listing.status === "rejected" && listing.rejectionReason && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs p-2">
                      Rejected: {listing.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900">{listing.breed}</h3>
                  <p className="text-xs text-gray-400 capitalize mb-2">{listing.category}</p>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-teal-600 text-lg">{formatPrice(Number(listing.price ?? 0))}</p>
                    <p className="text-xs text-gray-400">
                      {listing.availableQuantity}/{listing.quantity} available
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/seller/listings/${listing.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 rounded-xl">
                        <Edit className="w-3 h-3" /> Edit
                      </Button>
                    </Link>
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
    </div>
  );
}
