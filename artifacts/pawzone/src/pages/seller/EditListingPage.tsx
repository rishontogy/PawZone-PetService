import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, ImagePlus, CheckCircle, Upload, Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/api";

const CATEGORIES = ["dogs", "cats", "birds", "fish", "rabbits", "others"];

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fatherInputRef = useRef<HTMLInputElement>(null);
  const motherInputRef = useRef<HTMLInputElement>(null);

  const { data: listing, isLoading } = useGetListing(parseInt(id!));

  const [form, setForm] = useState({
    category: "",
    breed: "",
    price: "",
    maleQuantity: "0",
    femaleQuantity: "0",
    vaccinated: false,
    vaccinationDetails: "",
    description: "",
  });
  const [listingCity, setListingCity] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [fatherPhoto, setFatherPhoto] = useState<string>("");
  const [motherPhoto, setMotherPhoto] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [fatherUploading, setFatherUploading] = useState(false);
  const [motherUploading, setMotherUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (listing) {
      const l = listing as any;
      setForm({
        category: l.category || "",
        breed: l.breed || "",
        price: String(l.price || ""),
        maleQuantity: String(l.maleQuantity ?? Math.floor((l.quantity || 0) / 2)),
        femaleQuantity: String(l.femaleQuantity ?? Math.ceil((l.quantity || 0) / 2)),
        vaccinated: Boolean(l.vaccinated),
        vaccinationDetails: l.vaccinationDetails || "",
        description: l.description || "",
      });
      setListingCity(l.city || "");
      setPhotos(l.photos || []);
      setVideoUrl(l.videoUrl || "");
      setFatherPhoto(l.fatherPhoto || "");
      setMotherPhoto(l.motherPhoto || "");
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

  const uploadParentPhoto = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Only image files allowed" });
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 10MB per image" });
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
      toast({ variant: "destructive", title: "Upload failed", description: "Could not upload parent photo. Try again." });
      return null;
    }
    const data = await res.json();
    return data.url;
  };

  const handleFatherPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFatherUploading(true);
    try {
      const url = await uploadParentPhoto(file);
      if (url) setFatherPhoto(url);
    } finally {
      setFatherUploading(false);
      if (fatherInputRef.current) fatherInputRef.current.value = "";
    }
  };

  const handleMotherPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMotherUploading(true);
    try {
      const url = await uploadParentPhoto(file);
      if (url) setMotherPhoto(url);
    } finally {
      setMotherUploading(false);
      if (motherInputRef.current) motherInputRef.current.value = "";
    }
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

  const parentPhotoRequired = ["dogs", "cats"].includes(form.category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const male = parseInt(form.maleQuantity) || 0;
    const female = parseInt(form.femaleQuantity) || 0;
    if (male + female <= 0) {
      toast({ variant: "destructive", title: "Invalid quantity", description: "Add at least 1 male or female." });
      return;
    }
    if (parentPhotoRequired && !fatherPhoto && !motherPhoto) {
      toast({ variant: "destructive", title: "Parent photo required", description: "Upload at least one parent photo for dogs and cats." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/listings/${id}`, {
        method: "PUT",
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
          description: form.description || undefined,
          photos: photos.length > 0 ? photos : undefined,
          videoUrl: videoUrl || undefined,
          fatherPhoto: fatherPhoto || undefined,
          motherPhoto: motherPhoto || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to update" });
        return;
      }
      toast({ title: "Listing updated!", description: "Changes saved. Admin re-review may be required." });
      setLocation("/seller/listings");
    } finally {
      setSubmitting(false);
    }
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

  if ((listing as any).sellerId && user?.id && (listing as any).sellerId !== user.id) {
    setLocation("/seller/listings");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setLocation("/seller/listings")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" /> Back to listings
          </button>
        </div>
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

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Price per pet (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  className="rounded-xl border-gray-200"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Label className="font-semibold text-gray-700 block">Gender-based Inventory *</Label>
                <p className="text-xs text-gray-500">Update male and female counts. At least one must be &gt; 0.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-blue-700">♂ Male Count</Label>
                    <Input
                      type="number"
                      min="0"
                      className="rounded-xl border-blue-200 bg-white"
                      value={form.maleQuantity}
                      onChange={(e) => setForm({ ...form, maleQuantity: e.target.value })}
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
                    />
                  </div>
                </div>
                {(parseInt(form.maleQuantity) || 0) + (parseInt(form.femaleQuantity) || 0) > 0 && (
                  <p className="text-xs text-blue-600 font-medium">
                    Total: {(parseInt(form.maleQuantity) || 0) + (parseInt(form.femaleQuantity) || 0)} pet(s)
                  </p>
                )}
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
                <label
                  htmlFor="vaccinatedToggleEdit"
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    Vaccinated
                    {form.vaccinated && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{form.vaccinated ? "Yes" : "No"}</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="vaccinatedToggleEdit"
                        className="sr-only"
                        checked={form.vaccinated}
                        onChange={(e) => setForm({ ...form, vaccinated: e.target.checked })}
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${form.vaccinated ? "bg-green-500" : "bg-gray-300"}`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.vaccinated ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </div>
                  </div>
                </label>
                {form.vaccinated && (
                  <Input
                    className="rounded-xl border-green-200 bg-white"
                    value={form.vaccinationDetails}
                    onChange={(e) => setForm({ ...form, vaccinationDetails: e.target.value })}
                    placeholder="e.g. Parvo, Distemper, Rabies — completed June 2025"
                  />
                )}
              </div>

              {/* Pet Photos */}
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

              {/* Parent Photos */}
              <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="font-semibold text-gray-700">
                      Parent Photos {parentPhotoRequired ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    {!parentPhotoRequired && form.category && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        Optional for this pet type
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {parentPhotoRequired
                      ? "Upload at least one parent photo (father or mother). Required for dogs and cats."
                      : "Parent photos are optional for this pet type. Upload if available for buyer trust."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Father Photo */}
                  <div>
                    <Label className="text-sm font-medium text-blue-700 block mb-1">♂ Father Photo</Label>
                    {fatherPhoto ? (
                      <div className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 group">
                        <img src={fatherPhoto} alt="Father" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <button
                          type="button"
                          onClick={() => setFatherPhoto("")}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">Father</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => fatherInputRef.current?.click()}
                        className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${fatherUploading ? "opacity-60 pointer-events-none border-blue-200" : "border-blue-200 hover:border-blue-400 hover:bg-blue-50"}`}
                      >
                        <input ref={fatherInputRef} type="file" accept="image/*" className="hidden" onChange={handleFatherPhotoChange} />
                        {fatherUploading ? (
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-blue-300 mb-1" />
                            <span className="text-xs text-gray-400">Upload</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Mother Photo */}
                  <div>
                    <Label className="text-sm font-medium text-pink-600 block mb-1">♀ Mother Photo</Label>
                    {motherPhoto ? (
                      <div className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 group">
                        <img src={motherPhoto} alt="Mother" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <button
                          type="button"
                          onClick={() => setMotherPhoto("")}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">Mother</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => motherInputRef.current?.click()}
                        className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${motherUploading ? "opacity-60 pointer-events-none border-pink-200" : "border-pink-200 hover:border-pink-400 hover:bg-pink-50"}`}
                      >
                        <input ref={motherInputRef} type="file" accept="image/*" className="hidden" onChange={handleMotherPhotoChange} />
                        {motherUploading ? (
                          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-pink-300 mb-1" />
                            <span className="text-xs text-gray-400">Upload</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {parentPhotoRequired && !fatherPhoto && !motherPhoto && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    ⚠️ Upload at least one parent photo for dogs and cats.
                  </p>
                )}
                {!parentPhotoRequired && !fatherPhoto && !motherPhoto && form.category && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    ℹ️ No parent photos uploaded — that's okay for this pet type.
                  </p>
                )}
                {(fatherPhoto || motherPhoto) && (
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {fatherPhoto && motherPhoto ? "Both parent photos uploaded" : fatherPhoto ? "Father photo uploaded" : "Mother photo uploaded"}
                  </p>
                )}
              </div>

              {/* Pet Video */}
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

              {/* Location — from seller profile, read-only */}
              {listingCity && (
                <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <span className="text-sm text-teal-700 font-medium">📍 Listing location:</span>
                  <span className="text-sm text-teal-900 font-semibold">{listingCity}, Kerala</span>
                  <span className="text-xs text-teal-500 ml-auto">Set from seller profile</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-bold"
                disabled={submitting || !form.category || !form.breed || !form.price || ((parseInt(form.maleQuantity) || 0) + (parseInt(form.femaleQuantity) || 0) <= 0)}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
