import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetListings } from "@workspace/api-client-react";
import { formatPrice } from "@/lib/api";
import { PawPrint, Shield, Truck, Star, MapPin, ChevronRight, Heart, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const CATEGORIES = [
  { label: "Dogs", value: "dogs", emoji: "🐕", color: "from-amber-100 to-amber-200", border: "border-amber-300" },
  { label: "Cats", value: "cats", emoji: "🐈", color: "from-purple-100 to-purple-200", border: "border-purple-300" },
  { label: "Birds", value: "birds", emoji: "🦜", color: "from-green-100 to-green-200", border: "border-green-300" },
  { label: "Fish", value: "fish", emoji: "🐟", color: "from-blue-100 to-blue-200", border: "border-blue-300" },
  { label: "Rabbits", value: "rabbits", emoji: "🐇", color: "from-pink-100 to-pink-200", border: "border-pink-300" },
  { label: "Others", value: "others", emoji: "🐾", color: "from-slate-100 to-slate-200", border: "border-slate-300" },
];

export function HomePage() {
  const { data: listingsData } = useGetListings({ page: 1, limit: 8 } as any);
  const listings = listingsData as any;
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) setLocation(`/listings?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-8xl">🐕</div>
          <div className="absolute top-20 right-20 text-6xl">🐈</div>
          <div className="absolute bottom-10 left-1/4 text-7xl">🦜</div>
          <div className="absolute bottom-20 right-1/3 text-5xl">🐟</div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
            India's Fastest Growing Pet Marketplace
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            Find Your Perfect<br />
            <span className="text-yellow-300">Pet Companion</span>
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto">
            Connect with verified breeders. Safe, transparent transactions with our unique PetCode system and certified transporters.
          </p>
          <form onSubmit={handleSearch} className="flex max-w-xl mx-auto mb-6 gap-2">
            <div className="flex-1 flex items-center bg-white rounded-xl shadow-lg overflow-hidden">
              <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search breed, type (e.g. Golden Retriever)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 py-3 px-3 text-gray-800 outline-none text-sm"
              />
            </div>
            <Button type="submit" size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-xl px-6 border-0 shadow-lg">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/listings">
              <Button size="lg" className="bg-white text-teal-700 hover:bg-gray-100 font-bold rounded-xl shadow-md gap-2 border-0">
                Browse Pets <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 rounded-xl gap-2">
                Start Selling
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b shadow-sm py-4 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: "5,000+", label: "Happy Buyers" },
            { value: "500+", label: "Verified Sellers" },
            { value: "50+", label: "Certified Transporters" },
            { value: "100%", label: "Secure Payments" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-teal-600">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
              <p className="text-gray-500 text-sm mt-1">Find your favourite pet type</p>
            </div>
            <Link href="/listings" className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.value} href={`/listings?category=${cat.value}`}>
                <div className={`bg-gradient-to-b ${cat.color} border ${cat.border} rounded-2xl p-4 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer`}>
                  <div className="text-4xl mb-2">{cat.emoji}</div>
                  <p className="text-sm font-semibold text-gray-700">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {listings?.listings?.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Featured Pets</h2>
                <p className="text-gray-500 text-sm mt-1">Handpicked by our team</p>
              </div>
              <Link href="/listings" className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {listings.listings.slice(0, 8).map((listing: any) => (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group border border-gray-100">
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                      {listing.photos?.[0] ? (
                        <img
                          src={listing.photos[0]}
                          alt={listing.breed}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">🐾</div>
                      )}
                      <button className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                        <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                      {listing.vaccinated && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          ✓ Vaccinated
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight">{listing.breed}</h3>
                        <Badge variant="secondary" className="text-xs capitalize ml-1 flex-shrink-0">{listing.category}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                        <MapPin className="w-3 h-3" />
                        {listing.city}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-extrabold text-teal-600">{formatPrice(listing.price)}</span>
                        <span className="text-xs text-gray-400">{listing.availableQuantity ?? listing.quantity} left</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why PawZone */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Choose PawZone?</h2>
            <p className="text-gray-500">We make pet adoption safe, simple and joyful</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Shield className="w-8 h-8 text-teal-600" />, title: "Verified Sellers", desc: "All sellers are reviewed and approved by our expert team before listing pets.", bg: "bg-teal-50" },
              { icon: <Truck className="w-8 h-8 text-blue-600" />, title: "Safe Transport", desc: "Certified transporters ensure humane and safe delivery across the country.", bg: "bg-blue-50" },
              { icon: <Star className="w-8 h-8 text-amber-600" />, title: "PetCode System", desc: "Every pet gets a unique PetCode for full traceability, health records and authenticity.", bg: "bg-amber-50" },
            ].map((f) => (
              <div key={f.title} className={`${f.bg} rounded-2xl p-7 text-center hover:shadow-md transition-shadow`}>
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 px-4 bg-gradient-to-r from-teal-600 to-emerald-500 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3">Have a Pet to Sell?</h2>
          <p className="text-white/85 mb-6">Join hundreds of verified sellers on PawZone and reach thousands of pet lovers.</p>
          <Link href="/signup">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-xl shadow-md border-0 px-8">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <PawPrint className="w-7 h-7 text-teal-400" />
              <span className="text-xl font-bold text-white">PawZone</span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/listings" className="hover:text-white transition-colors">Browse Pets</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sell</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 text-center text-sm">
            <p>© 2025 PawZone — India's Trusted Pet Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
