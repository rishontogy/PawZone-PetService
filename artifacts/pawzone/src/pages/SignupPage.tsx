import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PawPrint, AlertCircle, CheckCircle, User, Mail, Phone, Lock, MapPin, Plus, X } from "lucide-react";

const KERALA_DISTRICTS: Record<string, string[]> = {
  "Thiruvananthapuram": ["Thiruvananthapuram", "Neyyattinkara", "Attingal", "Varkala", "Nedumangad", "Kazhakoottam", "Balaramapuram"],
  "Kollam": ["Kollam", "Punalur", "Karunagappally", "Kottarakkara", "Paravur", "Chavara", "Kundara"],
  "Pathanamthitta": ["Pathanamthitta", "Adoor", "Thiruvalla", "Ranni", "Pandalam", "Konni", "Kozhencherry"],
  "Alappuzha": ["Alappuzha", "Chengannur", "Mavelikkara", "Kayamkulam", "Haripad", "Cherthala", "Kuttanad"],
  "Kottayam": ["Kottayam", "Pala", "Changanassery", "Ettumanoor", "Vaikom", "Kanjirappally", "Erattupetta"],
  "Idukki": ["Idukki", "Thodupuzha", "Munnar", "Kattappana", "Adimali", "Devikulam", "Kumily"],
  "Ernakulam": ["Kochi", "Aluva", "Perumbavoor", "Angamaly", "North Paravur", "Kothamangalam", "Muvattupuzha", "Thrippunithura"],
  "Thrissur": ["Thrissur", "Chalakudy", "Kunnamkulam", "Guruvayur", "Irinjalakuda", "Kodungallur", "Mala"],
  "Palakkad": ["Palakkad", "Ottappalam", "Mannarkkad", "Chittur", "Pattambi", "Shornur", "Alathur"],
  "Malappuram": ["Malappuram", "Manjeri", "Tirur", "Perinthalmanna", "Ponnani", "Kondotty", "Kalpetta"],
  "Kozhikode": ["Kozhikode", "Vadakara", "Koyilandy", "Feroke", "Ramanattukara", "Mukkam", "Koduvally"],
  "Wayanad": ["Kalpetta", "Sulthan Bathery", "Mananthavady", "Vythiri", "Ambalavayal", "Pulpally"],
  "Kannur": ["Kannur", "Thalassery", "Iritty", "Payyanur", "Mattannur", "Sreekandapuram", "Panoor"],
  "Kasaragod": ["Kasaragod", "Kanhangad", "Hosdurg", "Nileshwar", "Bekal", "Cheruvathur", "Uppala"],
};

const KERALA_CITIES = Object.keys(KERALA_DISTRICTS);

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh",
];

const COUNTRIES = ["India", "United Arab Emirates", "United Kingdom", "United States", "Canada", "Australia", "Singapore", "Other"];

type DPEntry = { district: string; towns: string[] };

export function SignupPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "buyer" as "buyer" | "seller" | "transporter",
    address: "",
    city: "",
    state: "Kerala",
    country: "India",
    pincode: "",
  });
  const [district, setDistrict] = useState("");
  const [dpEntries, setDpEntries] = useState<DPEntry[]>([{ district: "", towns: [] }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isKerala = form.state === "Kerala";
  const keralaTowns = district ? (KERALA_DISTRICTS[district] ?? []) : [];

  const allDeliveryPoints = dpEntries.flatMap(e => e.towns);

  const toggleTown = (entryIdx: number, town: string) => {
    setDpEntries(prev => prev.map((e, i) => {
      if (i !== entryIdx) return e;
      const already = e.towns.includes(town);
      return { ...e, towns: already ? e.towns.filter(t => t !== town) : [...e.towns, town] };
    }));
  };

  const setEntryDistrict = (entryIdx: number, d: string) => {
    setDpEntries(prev => prev.map((e, i) =>
      i === entryIdx ? { district: d, towns: [] } : e
    ));
  };

  const addEntry = () => setDpEntries(prev => [...prev, { district: "", towns: [] }]);
  const removeEntry = (idx: number) => setDpEntries(prev => prev.filter((_, i) => i !== idx));

  const removeTown = (town: string) => {
    setDpEntries(prev => prev.map(e => ({ ...e, towns: e.towns.filter(t => t !== town) })));
  };

  const signupMutation = useSignup({
    mutation: {
      onSuccess: (data: any) => {
        if (form.role === "buyer") {
          login(data.token, data.user);
        } else {
          setSuccess(true);
        }
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Registration failed. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const firstTown = dpEntries[0]?.towns[0] ?? "";
    const city = form.city || firstTown;
    const payload: any = {
      ...form,
      city,
    };
    if (isKerala && form.role !== "transporter" && allDeliveryPoints.length > 0) {
      payload.deliveryPoints = allDeliveryPoints;
    }
    signupMutation.mutate({ data: payload });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-10 shadow-xl border-0">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Account Created!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your account is pending admin approval. You'll receive a notification once approved. Usually takes 24 hours.
          </p>
          <Button className="mt-6 w-full" onClick={() => setLocation("/login")}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <PawPrint className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Join PawZone</h1>
          <p className="text-gray-500 mt-1">Create your account — it's free!</p>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Role selector */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">I want to...</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "buyer", label: "Buy Pets", emoji: "🛒" },
                    { value: "seller", label: "Sell Pets", emoji: "🏪" },
                    { value: "transporter", label: "Transport", emoji: "🚚" },
                  ] as const).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        form.role === r.value
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{r.emoji}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
                {form.role !== "buyer" && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Requires admin approval before dashboard access
                  </p>
                )}
                {form.role === "buyer" && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Instant access after signup
                  </p>
                )}
              </div>

              {/* Name + Email */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Full Name *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input className="pl-9 rounded-xl border-gray-200" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your full name" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Email *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="email" className="pl-9 rounded-xl border-gray-200" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="your@email.com" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Phone *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="tel" className="pl-9 rounded-xl border-gray-200" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Password *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="password" className="pl-9 rounded-xl border-gray-200" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="At least 6 characters" autoComplete="new-password" />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Country</Label>
                    <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                      <SelectTrigger className="mt-1 rounded-xl border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">State</Label>
                    {form.country === "India" ? (
                      <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                        <SelectTrigger className="mt-1 rounded-xl border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIA_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input className="mt-1 rounded-xl border-gray-200" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State/Province" />
                    )}
                  </div>

                  {/* For Kerala buyers/sellers: district for primary city only */}
                  {isKerala && form.role !== "transporter" ? (
                    <>
                      <div>
                        <Label className="text-xs text-gray-500">District (primary)</Label>
                        <Select value={district} onValueChange={(v) => { setDistrict(v); setForm({ ...form, city: "" }); }}>
                          <SelectTrigger className="mt-1 rounded-xl border-gray-200">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                          <SelectContent>
                            {KERALA_CITIES.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Primary Town</Label>
                        <Select
                          value={form.city}
                          onValueChange={(v) => setForm({ ...form, city: v })}
                          disabled={!district}
                        >
                          <SelectTrigger className="mt-1 rounded-xl border-gray-200">
                            <SelectValue placeholder={district ? "Select town" : "Select district first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {keralaTowns.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : isKerala && form.role === "transporter" ? (
                    <>
                      <div>
                        <Label className="text-xs text-gray-500">District</Label>
                        <Select value={district} onValueChange={(v) => { setDistrict(v); setForm({ ...form, city: "" }); }}>
                          <SelectTrigger className="mt-1 rounded-xl border-gray-200">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                          <SelectContent>
                            {KERALA_CITIES.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Town / City</Label>
                        <Select
                          value={form.city}
                          onValueChange={(v) => setForm({ ...form, city: v })}
                          disabled={!district}
                        >
                          <SelectTrigger className="mt-1 rounded-xl border-gray-200">
                            <SelectValue placeholder={district ? "Select town" : "Select district first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {keralaTowns.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label className="text-xs text-gray-500">City *</Label>
                      <Input className="mt-1 rounded-xl border-gray-200" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required placeholder="Your city" />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-gray-500">Pincode</Label>
                    <Input className="mt-1 rounded-xl border-gray-200" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="PIN / ZIP code" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Street Address</Label>
                    <Input className="mt-1 rounded-xl border-gray-200" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Flat/House no, Street name" />
                  </div>
                </div>
                {!isKerala && (
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ Full services (buying, selling, transport) are currently available within Kerala. We're expanding soon — you can sign up now and be ready!
                  </p>
                )}
              </div>

              {/* Delivery Points — for Kerala buyers and sellers only */}
              {isKerala && form.role !== "transporter" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      {form.role === "buyer" ? "Delivery Points" : "Pickup / Delivery Points"}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.role === "buyer"
                        ? "Select the towns where you can receive deliveries. Transporters will match based on these."
                        : "Select towns where you can hand over pets to transporters."}
                    </p>
                  </div>

                  {/* Selected delivery point tags */}
                  {allDeliveryPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allDeliveryPoints.map(town => (
                        <span key={town} className="inline-flex items-center gap-1 text-xs bg-teal-50 border border-teal-200 text-teal-700 rounded-full px-2.5 py-1 font-medium">
                          📍 {town}
                          <button type="button" onClick={() => removeTown(town)} className="hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Per-district entry rows */}
                  {dpEntries.map((entry, idx) => {
                    const entryTowns = entry.district ? (KERALA_DISTRICTS[entry.district] ?? []) : [];
                    return (
                      <div key={idx} className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2">
                        <div className="flex items-center gap-2">
                          <Select value={entry.district} onValueChange={(v) => setEntryDistrict(idx, v)}>
                            <SelectTrigger className="flex-1 rounded-lg border-gray-200 bg-white text-sm h-9">
                              <SelectValue placeholder="Select district" />
                            </SelectTrigger>
                            <SelectContent>
                              {KERALA_CITIES.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {idx > 0 && (
                            <button type="button" onClick={() => removeEntry(idx)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {entry.district && (
                          <div className="grid grid-cols-2 gap-1.5">
                            {entryTowns.map(town => {
                              const checked = entry.towns.includes(town);
                              return (
                                <label key={town} className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors ${checked ? "bg-teal-50 border border-teal-200 text-teal-700 font-medium" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                  <input
                                    type="checkbox"
                                    className="w-3 h-3 accent-teal-600"
                                    checked={checked}
                                    onChange={() => toggleTown(idx, town)}
                                  />
                                  {town}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addEntry}
                    className="flex items-center gap-1.5 text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Delivery Point (different district)
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold" disabled={signupMutation.isPending}>
                {signupMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-teal-600 hover:underline font-semibold">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
