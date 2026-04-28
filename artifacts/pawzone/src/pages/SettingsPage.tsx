import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, ChevronLeft, User, Mail, Phone, Lock, MapPin, LogOut, Percent, AlertCircle } from "lucide-react";

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
  const [sharePct, setSharePct] = useState<string>(
    String((user as any)?.platformSharePercent ?? "")
  );

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone((user as any)?.phone ?? "");
    setAddress((user as any)?.address ?? "");
    setCity((user as any)?.city ?? "");
    setPincode((user as any)?.pincode ?? "");
    setSharePct(String((user as any)?.platformSharePercent ?? ""));
  }, [user]);

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
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
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

          {role === "transporter" && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-700" /> Platform Share %
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-amber-900">
                  Share of each transport fee paid to the platform (minimum 10%). Required after admin approval to receive deliveries.
                </p>
                <div>
                  <Label htmlFor="share-pct" className="text-xs">Share (%)</Label>
                  <Input
                    id="share-pct"
                    data-testid="input-platform-share"
                    type="number"
                    min={10}
                    max={100}
                    value={sharePct}
                    onChange={(e) => setSharePct(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  data-testid="button-save-share"
                  disabled={!sharePct || Number(sharePct) < 10 || saving === "Platform Share"}
                  onClick={() => callUpdate({ platformSharePercent: Number(sharePct) }, "Platform Share")}
                >
                  {saving === "Platform Share" ? "Saving…" : "Save platform share"}
                </Button>
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
