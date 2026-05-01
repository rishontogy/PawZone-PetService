import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Upload, X, ImagePlus, CheckCircle } from "lucide-react";
import { getApiBase } from "@/lib/api";

const CATEGORIES = ["dogs", "cats", "birds", "fish", "rabbits", "others"];
const KERALA_CITIES = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur", "Kasaragod", "Wayanad", "Idukki", "Pathanamthitta"];

export function CreateListingPage() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: "",
    breed: "",
    price: "",
    maleQuantity: "0",
    femaleQuantity: "0",
    vaccinated: false,
    vaccinationDetails: "",
    description: "",
    address: user?.address || "",
    city: user?.city || "",
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Only image files are allowed" });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 5MB per image" });
      return null;
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${getApiBase()}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      // Fallback to data URL if upload fails
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    const data = await res.json();
    return data.url;
  };

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
      toast({ title: "Video uploaded", description: "Buyers will be able to watch it on your listing." });
    } finally {
      setVideoUploading(false);
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).slice(0, 5 - photos.length);
    if (fileArr.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(fileArr.map(uploadFile));
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

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const male = parseInt(form.maleQuantity) || 0;
    const female = parseInt(form.femaleQuantity) || 0;
    if (male + female <= 0) {
      toast({ variant: "destructive", title: "Invalid quantity", description: "Add at least 1 male or female." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: form.category,
          breed: form.breed,
          price: parseFloat(form.price),
          quantity: male + female,
          maleQuantity: male,
          femaleQuantity: female,
          vaccinated: form.vaccinated,
          vaccinationDetails: form.vaccinationDetails || undefined,
          description: form.description || "—",
          photos: photos.length > 0 ? photos : undefined,
          videoUrl: videoUrl || undefined,
          address: form.address,
          city: form.city,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to create listing" });
        return;
      }
      toast({ title: "Listing submitted!", description: "Your listing is pending admin approval." });
      setLocation("/seller/listings");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white p-6">
            <CardTitle className="text-xl">Create New Listing</CardTitle>
            <p className="text-white/80 text-sm mt-1">Add your pet details below. Admin will review before publishing.</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category + Breed */}
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

              {/* Price */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Price per pet (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  className="rounded-xl border-gray-200"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                  placeholder="e.g. 15000"
                />
              </div>

              {/* Gender Inventory */}
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Label className="font-semibold text-gray-700 block">Gender-based Inventory *</Label>
                <p className="text-xs text-gray-500">Set how many males and females are available. At least one must be &gt; 0.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-blue-700">♂ Male Count</Label>
                    <Input
                      type="number"
                      min="0"
                      className="rounded-xl border-blue-200 bg-white"
                      value={form.maleQuantity}
                      onChange={(e) => setForm({ ...form, maleQuantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-pink-600">♀ Female Count</Label>
                    <Input
                      type="number"
                      min="0"
                      className="rounded-xl border-pink-200 bg-white"
                      value={form.femaleQuantity}
                      onChange={(e) => setForm({ ...form, femaleQuantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                {(parseInt(form.maleQuantity) || 0) + (parseInt(form.femaleQuantity) || 0) > 0 && (
                  <p className="text-xs text-blue-600 font-medium">
                    Total: {(parseInt(form.maleQuantity) || 0) + (parseInt(form.femaleQuantity) || 0)} pet(s)
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Description</Label>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the pet, health status, temperament, age..."
                />
              </div>

              {/* Vaccination */}
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

              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="font-semibold text-gray-700">Photos (up to 5)</Label>

                {/* Preview grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
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

                {/* Drop zone */}
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
                        <p className="text-xs text-gray-400 mt-1">or click to browse • Max 5MB each • JPG, PNG, WebP</p>
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
                <p className="text-xs text-gray-500">Upload a short clip of your pet — .mp4 or .mov, max 50MB.</p>
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

              {/* Location */}
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
                disabled={submitting || !form.category || !form.breed || !form.price || !form.city || ((parseInt(form.maleQuantity) || 0) + (parseInt(form.femaleQuantity) || 0) <= 0)}
              >
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
