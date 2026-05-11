import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useGetListings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PawPrint, MapPin, Search, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/api";

const CATEGORIES = ["dogs", "cats", "birds", "fish", "rabbits", "others"];
const KERALA_CITIES = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur"];

export function ListingsPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [category, setCategory] = useState(params.get("category") || "");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data: rawData, isLoading } = useGetListings({
    page,
    limit: 12,
    category: category || undefined,
    city: city || undefined,
    search: q || undefined,
  } as any);
  const data = rawData as any;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Filter bar */}
      <div className="bg-muted/30 py-5 sm:py-8 px-4 border-b sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4">Browse Pets</h1>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search breed, type..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="pl-9 h-11 rounded-xl"
              />
            </div>
            <div className="flex gap-2.5 sm:gap-3">
              <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="flex-1 sm:w-44 h-11 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={city} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="flex-1 sm:w-52 h-11 rounded-xl">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kerala</SelectItem>
                  {KERALA_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-2xl">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded-lg" />
                  <div className="h-3 bg-muted animate-pulse rounded-lg w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data?.listings?.length ? (
          <div className="text-center py-20">
            <PawPrint className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No pets found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {data.listings.length} of {data.total} pets
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.listings.map((listing: any) => (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <div className="bg-white hover:shadow-lg transition-all cursor-pointer overflow-hidden group rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] duration-200">
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {listing.photos?.[0] ? (
                        <img
                          src={listing.photos[0]}
                          alt={listing.breed}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Pet"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{listing.breed}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{listing.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{formatPrice(listing.price)}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {listing.city}
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {listing.vaccinated && (
                          <Badge className="text-xs bg-green-100 text-green-800 border-0">✓ Vaccinated</Badge>
                        )}
                        {listing.availableQuantity > 0 ? (
                          <Badge variant="secondary" className="text-xs">{listing.availableQuantity} available</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                        )}
                      </div>
                      {(listing as any).petCode && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Shield className="w-3 h-3 text-teal-600" />
                          <code className="text-xs text-teal-600 font-mono">{(listing as any).petCode}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl gap-1 h-11 px-4"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-3 font-medium">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.totalPages}
                  className="rounded-xl gap-1 h-11 px-4"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
