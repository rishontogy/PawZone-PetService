import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetListing, useUpdateListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, ImagePlus, CheckCircle, Upload } from "lucide-react";
import { getApiBase } from "@/lib/api";

const CATEGORIES = ["dogs", "cats", "birds", "fish", "rabbits", "others"];
const KERALA_CITIES = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur", "Kasaragod", "Wayanad", "Idukki", "Pathanamthitta"];

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: listing, isLoading } = useGetListing(parseInt(id!));

  const [form, setForm] = useState({
    category: "",
    breed: "",
    price: "",
    quantity: "1",
    vaccinated: false,
    vaccinationDetails: "",
    description: "",
    address: "",
    city: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Populate form when listing loads
  useEffect(() => {
    if (listing) {
      setForm({
        category: (listing as any).category || "",
        breed: (listing as any).breed || "",
        price: String((listing as any).price || ""),
        quantity: String((listing as any).quantity || "1"),
        vaccinated: Boolean((listing as any).vaccinated),
        vaccinationDetails: (listing as any).vaccinationDetails || "",
        description: (listing as any).description || "",
        address: (listing as any).address || "",
        city: (listing as any).city || "",
      });
      setPhotos((listing as any).photos || []);
      setVideoUrl((listing as any).videoUrl || "");
    }
  }, [listing]);

  const handleVideoFile = async (file: File) => {
    const okType = file.type === "video/mp4" || file.type === "video/quicktime" || /\.(mp4|mov)$/i.test(file.name);
    if (!okType) {
      toast({ variant: "destructive", title: "Invalid file", description: "Only .mp4 or .mov videos are allowed" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Video too large", description: "Max 50MB per video" });
      return;
    }
    setVideoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${getApiBase()}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Upload failed", description: "Could not upload the video. Try again." });
        return;
      }
      const data = await res.json();
      setVideoUrl(data.url);
      toast({ title: "Video uploaded" });
    } finally {
      setVideoUploading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Only images allowed" });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 5MB per image" });
      return null;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${getApiBase()}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch {}
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 5 - photos.length);
    if (!arr.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(arr.map(uploadFile));
      const valid = urls.filter(Boolean) as string[];
      setPhotos((prev) => [...prev, ...valid].slice(0, 5));
    } finally {
      setUploading(false);
    }
  }, [photos.length, token]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const updateListing = useUpdateListing({
    mutation: {
      onSuccess: () => {
        toast({ title: "✅ Listing updated!", description: "Changes saved. Admin re-review may be required." });
        setLocation("/seller/listings");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to update" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateListing.mutate({
      id: parseInt(id!),
      data: {
        category: form.category as any,
        breed: form.breed,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        vaccinated: form.vaccinated,
        vaccinationDetails: form.vaccinationDetails || undefined,
        description: form.description || undefined,
        photos: photos.length > 0 ? photos : undefined,
        videoUrl: videoUrl || undefined,
        address: form.address,
        city: form.city,
      },
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Listing not found.</p>
    </div>
  );

  // Security: only owner can edit
  if ((listing as any).sellerId && user?.id && (listing as any).sellerId !== user.id) {
    setLocation("/seller/listings");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white p-6">
            <CardTitle className="text-xl">Edit Listing</CardTitle>
            <p className="text-white/80 text-sm mt-1">Update your pet listing details below.</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Breed / Type *</Label>
                  <Input
                    className="rounded-xl border-gray-200"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    required
                    placeholder="e.g. Golden Retriever"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Price (₹) *</Label>
                  <Input
                    type="number"
                    min="1"
                    className="rounded-xl border-gray-200"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    className="rounded-xl border-gray-200"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Description</Label>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the pet, health status, temperament, age..."
                />
              </div>

              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, vaccinated: !form.vaccinated })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.vaccinated ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.vaccinated ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <Label className="font-semibold text-gray-700 cursor-pointer">Vaccinated</Label>
                  {form.vaccinated && <CheckCircle className="w-4 h-4 text-green-600" />}
                </div>
                {form.vaccinated && (
                  <Input
                    className="rounded-xl border-green-200 bg-white"
                    value={form.vaccinationDetails}
                    onChange={(e) => setForm({ ...form, vaccinationDetails: e.target.value })}
                    placeholder="e.g. Parvo, Distemper, Rabies — completed June 2025"
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label className="font-semibold text-gray-700">Photos (up to 5)</Label>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/200x200?text=Photo"; }} />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">Cover</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < 5 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive ? "border-teal-500 bg-teal-50" : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
                    } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <ImagePlus className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700">Drag & drop photos here</p>
                        <p className="text-xs text-gray-400 mt-1">or click to browse • Max 5MB each</p>
                        <Button type="button" variant="outline" size="sm" className="mt-3 rounded-lg gap-1.5">
                          <Upload className="w-3.5 h-3.5" /> Choose Files
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Pet Video (optional) */}
              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Pet Video (optional)</Label>
                <p className="text-xs text-gray-500">Upload or replace the pet video — .mp4 or .mov, max 50MB.</p>
                {videoUrl ? (
                  <div className="space-y-2">
                    <video src={videoUrl} controls className="w-full rounded-xl border border-gray-200 max-h-64 bg-black" />
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setVideoUrl("")}>
                      Remove video
                    </Button>
                  </div>
                ) : (
                  <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    videoUploading ? "opacity-60 pointer-events-none" : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
                  }`}>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,.mp4,.mov"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
                      data-testid="input-listing-video"
                    />
                    {videoUploading ? (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm">Uploading video...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Click to upload video</p>
                        <p className="text-xs text-gray-400 mt-1">.mp4 or .mov • Max 50MB</p>
                      </>
                    )}
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Address *</Label>
                  <Input
                    className="rounded-xl border-gray-200"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">City *</Label>
                  <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {KERALA_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-bold"
                disabled={updateListing.isPending || !form.category || !form.breed || !form.price || !form.city}
              >
                {updateListing.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
