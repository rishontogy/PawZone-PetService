import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetListings } from "@workspace/api-client-react";
import { formatPrice } from "@/lib/api";
import { PawPrint, Shield, Truck, Star, MapPin, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { label: "Dogs", value: "dogs", emoji: "🐕" },
  { label: "Cats", value: "cats", emoji: "🐈" },
  { label: "Birds", value: "birds", emoji: "🦜" },
  { label: "Fish", value: "fish", emoji: "🐟" },
  { label: "Rabbits", value: "rabbits", emoji: "🐇" },
  { label: "Others", value: "others", emoji: "🐾" },
];

export function HomePage() {
  const { data: listingsData } = useGetListings({ page: 1, limit: 6 } as any);
  const listings = listingsData as any;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <PawPrint className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Kerala's Premier<br />
            <span className="text-primary">Pet Marketplace</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Buy and adopt verified pets from trusted breeders across Kerala. Safe, secure, and transparent transactions with our unique PetCode system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/listings">
              <Button size="lg" className="gap-2">
                Browse Pets <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="gap-2">
                Sell Your Pets
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Browse by Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.value} href={`/listings?category=${cat.value}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{cat.emoji}</div>
                    <p className="text-sm font-medium">{cat.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {listings && listings.listings.length > 0 && (
        <section className="py-12 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Featured Pets</h2>
              <Link href="/listings" className="text-primary hover:underline text-sm flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.listings.slice(0, 6).map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {listing.photos?.[0] ? (
                        <img
                          src={listing.photos[0]}
                          alt={listing.breed}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Pet+Photo"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-base">{listing.breed}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{listing.category}</p>
                        </div>
                        <Badge variant="secondary" className="capitalize">{listing.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{formatPrice(listing.price)}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {listing.city}
                        </div>
                      </div>
                      {listing.vaccinated && (
                        <Badge className="mt-2 text-xs bg-green-100 text-green-800 border-0">✓ Vaccinated</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-12 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Why PawZone?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Verified Sellers</h3>
              <p className="text-muted-foreground text-sm">All sellers are verified by our admin team before they can list pets.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Safe Transport</h3>
              <p className="text-muted-foreground text-sm">Our certified transporters ensure safe and humane delivery across Kerala.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">PetCode System</h3>
              <p className="text-muted-foreground text-sm">Every pet gets a unique PetCode for tracking, health records and authenticity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center items-center gap-2 mb-3">
            <PawPrint className="w-6 h-6" />
            <span className="text-lg font-bold">PawZone</span>
          </div>
          <p className="text-sm text-background/70">© 2025 PawZone — Kerala's Premier Pet Marketplace. All rights reserved.</p>
          <p className="text-xs text-background/50 mt-1">Service available only within Kerala, India.</p>
        </div>
      </footer>
    </div>
  );
}
