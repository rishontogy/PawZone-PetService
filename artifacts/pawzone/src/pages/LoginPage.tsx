import { useState } from "react";
import { Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint, AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { OtpVerificationModal } from "@/components/OtpVerificationModal";

export function LoginPage() {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [otpModal, setOtpModal] = useState<{ userId: number; otp: string; role: "buyer" | "seller" | "transporter" } | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        if (data.requiresOtp) {
          // Account approved but OTP not yet verified — show OTP modal
          setOtpModal({ userId: data.userId, otp: data.otp, role: data.role });
        } else {
          login(data.token, data.user as any);
        }
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
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <PawPrint className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">PawZone</h1>
            <p className="text-gray-500 mt-1">India's Trusted Pet Marketplace</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-500 px-8 py-5">
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="text-white/80 text-sm">Sign in to your account</p>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold text-gray-700">Email or ID</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="your@email.com"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      required
                      className="pl-9 rounded-xl border-gray-200 h-11"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9 pr-10 rounded-xl border-gray-200 h-11"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-bold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-5 text-center text-sm text-gray-500">
                Don't have an account?{" "}
                <Link href="/signup" className="text-teal-600 hover:underline font-semibold">
                  Sign up free
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* OTP Verification Modal — shown when login returns requiresOtp: true */}
      {otpModal && (
        <OtpVerificationModal
          userId={otpModal.userId}
          otp={otpModal.otp}
          role={otpModal.role}
          mode="login"
          onVerified={(token, user) => {
            setOtpModal(null);
            login(token, user);
          }}
        />
      )}
    </>
  );
}
