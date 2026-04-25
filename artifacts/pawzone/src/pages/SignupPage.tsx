import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PawPrint, AlertCircle, CheckCircle } from "lucide-react";

export function SignupPage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "buyer" as "buyer" | "seller" | "transporter",
    address: "",
    city: "",
    pincode: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const signupMutation = useSignup({
    mutation: {
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => setLocation("/login"), 2000);
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Registration failed. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    signupMutation.mutate({ data: { ...form, state: "Kerala", country: "India" } });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className="text-muted-foreground">
            {form.role !== "buyer"
              ? "Your account is pending admin approval. You'll be notified once approved."
              : "Your account has been created. Redirecting to login..."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <PawPrint className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">PawZone</h1>
          <p className="text-muted-foreground mt-1">Create your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Join Kerala's #1 pet marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Account Type</Label>
                  <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="transporter">Transporter</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.role !== "buyer" && (
                    <p className="text-xs text-amber-600">Requires admin approval</p>
                  )}
                </div>

                <div className="space-y-1 col-span-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <Label>City (Kerala)</Label>
                  <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur", "Kasaragod", "Pathanamthitta", "Idukki", "Wayanad"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
                {signupMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
