import { useState } from "react";
import { Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint, AlertCircle } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Invalid credentials. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { loginId, password } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <PawPrint className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">PawZone</h1>
          <p className="text-muted-foreground mt-1">Kerala's Premier Pet Marketplace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="loginId">Email or Seller ID or Admin ID</Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="your@email.com"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          <p className="font-medium mb-1">Demo Credentials:</p>
          <p>Buyer: arun@example.com / test123</p>
          <p>Seller: rajan@example.com / seller123</p>
          <p>Admin: PAWZONE_A2005 / PawZone2005</p>
        </div>
      </div>
    </div>
  );
}
