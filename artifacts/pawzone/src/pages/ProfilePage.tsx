import { useState } from "react";
import { useGetMe, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/api";
import { User, Shield, Percent, Settings as SettingsIcon, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { enabled: !!user } });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    address: (user as any)?.address ?? "",
    city: (user as any)?.city ?? "",
  });

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        toast({ title: "Profile updated!" });
        setEditing(false);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error });
      },
    },
  });

  const profileUser = me ?? user;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <User className="w-6 h-6" /> My Profile
        </h1>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Account Information</CardTitle>
              <Badge className={`text-xs capitalize ${getStatusColor((profileUser as any)?.status ?? "approved")}`}>
                {(profileUser as any)?.status ?? "approved"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{profileUser?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{profileUser?.role} Account</p>
              </div>
            </div>

            {(profileUser as any)?.sellerId && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Seller ID:</span>
                <code className="text-sm font-mono text-primary">{(profileUser as any).sellerId}</code>
              </div>
            )}

            {!editing ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{(profileUser as any)?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{(profileUser as any)?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{(profileUser as any)?.address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="text-sm font-medium">{(profileUser as any)?.city}, Kerala</p>
                </div>
                {(profileUser as any)?.role === "transporter" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Percent className="w-4 h-4 text-amber-700" />
                    <div className="flex-1">
                      <p className="text-xs text-amber-800 font-medium">Platform Share %</p>
                      <p className="text-sm font-semibold text-amber-900">
                        {(profileUser as any)?.platformSharePercent
                          ? `${(profileUser as any).platformSharePercent}%`
                          : "Not set — required to accept deliveries"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setForm({
                      name: (profileUser as any)?.name ?? "",
                      phone: (profileUser as any)?.phone ?? "",
                      address: (profileUser as any)?.address ?? "",
                      city: (profileUser as any)?.city ?? "",
                    });
                    setEditing(true);
                  }}>
                    Edit Profile
                  </Button>
                  <Link href="/settings">
                    <Button variant="outline">
                      <SettingsIcon className="w-4 h-4 mr-1.5" /> Account Settings
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                updateProfile.mutate({ data: form });
              }} className="space-y-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
