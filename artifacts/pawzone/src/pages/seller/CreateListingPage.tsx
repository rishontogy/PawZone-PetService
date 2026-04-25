import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

const CATEGORIES = ["dogs", "cats", "birds", "fish", "rabbits", "others"];
const KERALA_CITIES = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur", "Kasaragod", "Wayanad", "Idukki", "Pathanamthitta"];

export function CreateListingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    category: "",
    breed: "",
    price: "",
    quantity: "1",
    vaccinated: false,
    vaccinationDetails: "",
    description: "",
    photos: "",
    address: user?.address || "",
    city: user?.city || "",
  });

  const createListing = useCreateListing({
    mutation: {
      onSuccess: () => {
        toast({ title: "Listing submitted!", description: "Your listing is pending admin approval." });
        setLocation("/seller/listings");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to create listing" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const photos = form.photos.split("\n").map(p => p.trim()).filter(Boolean);
    createListing.mutate({
      data: {
        category: form.category as any,
        breed: form.breed,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        vaccinated: form.vaccinated,
        vaccinationDetails: form.vaccinationDetails || undefined,
        description: form.description || undefined,
        photos: photos.length > 0 ? photos : undefined,
        address: form.address,
        city: form.city,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setLocation("/seller/listings")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to listings
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Breed / Type *</Label>
                  <Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <Label>Price (₹) *</Label>
                  <Input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <textarea
                  className="w-full text-sm border rounded-md p-2 resize-none h-24 focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the pet, health status, temperament..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vaccinated"
                  checked={form.vaccinated}
                  onChange={(e) => setForm({ ...form, vaccinated: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <Label htmlFor="vaccinated">Vaccinated</Label>
              </div>

              {form.vaccinated && (
                <div className="space-y-1">
                  <Label>Vaccination Details</Label>
                  <Input
                    value={form.vaccinationDetails}
                    onChange={(e) => setForm({ ...form, vaccinationDetails: e.target.value })}
                    placeholder="e.g., Parvo, Distemper, Rabies - completed June 2025"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Photo URLs (one per line)</Label>
                <textarea
                  className="w-full text-sm border rounded-md p-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.photos}
                  onChange={(e) => setForm({ ...form, photos: e.target.value })}
                  placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Address *</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>City *</Label>
                  <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {KERALA_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createListing.isPending || !form.category}>
                {createListing.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
