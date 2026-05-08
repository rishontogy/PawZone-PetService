import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Mail, Phone, Lock, MapPin, LogOut, Truck, AlertCircle, Plus, X } from "lucide-react";

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

export function SettingsPage() {
  const { user, logout, refresh } = useAuth() as any;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");
  const [address, setAddress] = useState((user as any)?.address ?? "");
  const [city, setCity] = useState((user as any)?.city ?? "");
  const [pincode, setPincode] = useState((user as any)?.pincode ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [dpList, setDpList] = useState<string[]>((user as any)?.deliveryPoints ?? []);
  const [dpDistrict, setDpDistrict] = useState("");
  const [dpTown, setDpTown] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone((user as any)?.phone ?? "");
    setAddress((user as any)?.address ?? "");
    setCity((user as any)?.city ?? "");
    setPincode((user as any)?.pincode ?? "");
    setDpList((user as any)?.deliveryPoints ?? []);
  }, [user]);

  const addDpTown = () => {
    if (!dpTown || dpList.includes(dpTown)) return;
    setDpList(prev => [...prev, dpTown]);
    setDpTown("");
  };
  const removeDpTown = (t: string) => setDpList(prev => prev.filter(p => p !== t));

  const callUpdate = async (payload: any, label: string) => {
    setSaving(label);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      toast({ title: "Saved", description: `${label} updated` });
      if (typeof refresh === "function") await refresh();
      return true;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message ?? "Failed" });
      return false;
    } finally {
      setSaving(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sign in to access settings.</p>
      </div>
    );
  }

  const role = (user as any).role;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-teal-600" /> Settings
          </h1>
        </div>

        <div className="space-y-4">
          {/* Report an Issue (top-of-page quick action) */}
          <Card className="border-red-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" /> Report an Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!reportOpen ? (
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 w-full sm:w-auto"
                  data-testid="button-open-report-issue"
                  onClick={() => setReportOpen(true)}
                >
                  <AlertCircle className="w-4 h-4 mr-1.5" /> Report an Issue to Admin
                </Button>
              ) : (
                <>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="Describe the issue you're experiencing…"
                    value={reportText}
                    data-testid="input-report-issue"
                    onChange={(e) => setReportText(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setReportOpen(false); setReportText(""); }}
                      data-testid="button-cancel-report-issue"
                    >Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!reportText.trim() || submittingReport}
                      data-testid="button-submit-report-issue"
                      onClick={async () => {
                        setSubmittingReport(true);
                        try {
                          const token = localStorage.getItem("pawzone_token");
                          const res = await fetch("/api/support/report", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token ?? ""}`,
                            },
                            body: JSON.stringify({ description: reportText }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || "Failed to send report");
                          toast({ title: "Report sent", description: "Admin has been notified. We'll get back to you soon." });
                          setReportOpen(false);
                          setReportText("");
                        } catch (err: any) {
                          toast({ variant: "destructive", title: "Failed", description: err?.message ?? "" });
                        } finally {
                          setSubmittingReport(false);
                        }
                      }}
                    >{submittingReport ? "Sending…" : "Send Report"}</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="set-name" className="text-xs">Name</Label>
                <Input id="set-name" data-testid="input-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button
                size="sm"
                data-testid="button-save-name"
                disabled={!name || name === user.name || saving === "Name"}
                onClick={() => callUpdate({ name }, "Name")}
              >
                {saving === "Name" ? "Saving…" : "Save name"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal-600" /> Email Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="set-email" className="text-xs">Email</Label>
                <Input id="set-email" data-testid="input-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button
                size="sm"
                data-testid="button-save-email"
                disabled={!email || email === user.email || saving === "Email"}
                onClick={() => callUpdate({ email }, "Email")}
              >
                {saving === "Email" ? "Saving…" : "Save email"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-600" /> Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="set-phone" className="text-xs">Phone</Label>
                <Input id="set-phone" data-testid="input-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button
                size="sm"
                data-testid="button-save-phone"
                disabled={!phone || phone === ((user as any).phone ?? "") || saving === "Phone"}
                onClick={() => callUpdate({ phone }, "Phone")}
              >
                {saving === "Phone" ? "Saving…" : "Save phone"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-600" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="cur-pw" className="text-xs">Current Password</Label>
                <Input id="cur-pw" data-testid="input-current-password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-pw" className="text-xs">New Password (min 6 chars)</Label>
                <Input id="new-pw" data-testid="input-new-password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <Button
                size="sm"
                data-testid="button-save-password"
                disabled={!currentPw || newPw.length < 6 || saving === "Password"}
                onClick={async () => {
                  const ok = await callUpdate({ currentPassword: currentPw, newPassword: newPw }, "Password");
                  if (ok) { setCurrentPw(""); setNewPw(""); }
                }}
              >
                {saving === "Password" ? "Saving…" : "Update password"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" /> Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="set-address" className="text-xs">Street Address</Label>
                <Input id="set-address" data-testid="input-address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="set-city" className="text-xs">City</Label>
                  <Input id="set-city" data-testid="input-city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="set-pin" className="text-xs">Pincode</Label>
                  <Input id="set-pin" data-testid="input-pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                </div>
              </div>
              <Button
                size="sm"
                data-testid="button-save-address"
                disabled={saving === "Address"}
                onClick={() => callUpdate({ address, city, pincode }, "Address")}
              >
                {saving === "Address" ? "Saving…" : "Save address"}
              </Button>
            </CardContent>
          </Card>

          {/* Delivery Points — buyers and sellers only */}
          {role !== "transporter" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  {role === "buyer" ? "Delivery Points" : "Pickup / Delivery Points"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">
                  {role === "buyer"
                    ? "The towns where you can receive pet deliveries. Transporters are matched based on these."
                    : "The towns where you can hand over pets to transporters for pickup."}
                </p>

                {/* Current points */}
                {dpList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {dpList.map(pt => (
                      <span key={pt} className="inline-flex items-center gap-1 text-xs bg-teal-50 border border-teal-200 text-teal-700 rounded-full px-2.5 py-1 font-medium">
                        📍 {pt}
                        <button type="button" onClick={() => removeDpTown(pt)} className="hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No delivery points saved yet.</p>
                )}

                {/* Add new point */}
                <div className="flex gap-2">
                  <Select value={dpDistrict} onValueChange={(v) => { setDpDistrict(v); setDpTown(""); }}>
                    <SelectTrigger className="flex-1 rounded-xl border-gray-200 text-sm h-9">
                      <SelectValue placeholder="District" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(KERALA_DISTRICTS).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dpTown} onValueChange={setDpTown} disabled={!dpDistrict}>
                    <SelectTrigger className="flex-1 rounded-xl border-gray-200 text-sm h-9">
                      <SelectValue placeholder={dpDistrict ? "Town" : "Select district first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(KERALA_DISTRICTS[dpDistrict] ?? []).map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" className="rounded-xl flex-shrink-0" onClick={addDpTown} disabled={!dpTown}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  data-testid="button-save-delivery-points"
                  disabled={saving === "Delivery Points"}
                  onClick={() => callUpdate({ deliveryPoints: dpList }, "Delivery Points")}
                >
                  {saving === "Delivery Points" ? "Saving…" : "Save Delivery Points"}
                </Button>
              </CardContent>
            </Card>
          )}

          {role === "transporter" && (
            <Card className="border-blue-200 bg-blue-50/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-700" /> Transporter Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-blue-900">
                  PawZone charges a flat <span className="font-bold">₹40 platform fee</span> per delivered order. You keep the rest of the transport fee you set when accepting an order.
                </p>
                <p className="text-xs text-blue-700">
                  Example: Set ₹150 transport fee → you earn ₹110 per delivery.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                data-testid="button-logout"
                onClick={() => { logout(); setLocation("/login"); }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
