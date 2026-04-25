import { Link } from "wouter";
import { useGetListings, useDeleteListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor } from "@/lib/api";
import { PlusCircle, Edit, Trash2, PawPrint } from "lucide-react";

export function SellerListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: rawData, refetch } = useGetListings({ limit: 50 } as any, { query: { enabled: !!user } });
  const data = rawData as any;

  const deleteMutation = useDeleteListing({
    mutation: {
      onSuccess: () => { toast({ title: "Listing deleted" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const myListings = data?.listings ?? [];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Listings</h1>
          <Link href="/seller/listings/new">
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" /> Add Listing
            </Button>
          </Link>
        </div>

        {!myListings.length ? (
          <Card>
            <CardContent className="p-12 text-center">
              <PawPrint className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-2">No listings yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first listing to start selling.</p>
              <Link href="/seller/listings/new"><Button>Create Listing</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="aspect-video bg-muted overflow-hidden relative">
                  {listing.photos?.[0] ? (
                    <img src={listing.photos[0]} alt={listing.breed} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className={`absolute top-2 right-2 text-xs ${getStatusColor(listing.status)}`}>
                    {listing.status}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold">{listing.breed}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{listing.category}</p>
                  <p className="font-bold text-primary mt-1">{formatPrice(listing.price)}</p>
                  <p className="text-xs text-muted-foreground">{listing.availableQuantity}/{listing.quantity} available</p>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/seller/listings/${listing.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Edit className="w-3 h-3" /> Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Delete this listing?")) {
                          deleteMutation.mutate({ id: listing.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
