import { useState } from "react";
import { X, Mail, Phone, User, Lock, Eye, EyeOff, KeyRound, ShieldCheck, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step =
  | "verify"
  | "loading"
  | "buyer_reset"
  | "seller_pending"
  | "seller_code"
  | "success"
  | "error";

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("verify");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [buyerToken, setBuyerToken] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setStep("loading");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed. Please check your details.");
        setStep("verify");
        return;
      }
      setUserRole(data.role);
      if (data.role === "buyer") {
        setBuyerToken(data.token);
        setStep("buyer_reset");
      } else {
        setRequestId(data.requestId);
        setStep("seller_pending");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("verify");
    }
  };

  const handleBuyerReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep("loading");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: buyerToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed. Please try again.");
        setStep("buyer_reset");
        return;
      }
      setSuccessMsg("Password reset successfully! You can now log in.");
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
      setStep("buyer_reset");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4}$/.test(code)) {
      setError("Enter the 4-digit code provided by admin.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep("loading");
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code. Please try again.");
        setStep("seller_code");
        return;
      }
      setSuccessMsg("Password reset successfully! You can now log in.");
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
      setStep("seller_code");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Forgot Password</h2>
              <p className="text-white/75 text-xs">We'll verify your identity</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6">
          {/* Step: Verify identity */}
          {(step === "verify" || (step === "loading" && !buyerToken && !requestId)) && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-gray-600 text-sm">Enter your registered details to verify your identity.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold text-gray-700">Registered Full Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-9 rounded-xl border-gray-200 h-11"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={step === "loading"}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Registered Phone Number</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-9 rounded-xl border-gray-200 h-11"
                    placeholder="10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    inputMode="numeric"
                    disabled={step === "loading"}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Registered Email ID</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    className="pl-9 rounded-xl border-gray-200 h-11"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={step === "loading"}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold" disabled={step === "loading"}>
                {step === "loading" ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</span>
                ) : "Check Details"}
              </Button>
            </form>
          )}

          {/* Step: Loading (between steps) */}
          {step === "loading" && (buyerToken || requestId) && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="text-gray-500 text-sm">Processing...</p>
            </div>
          )}

          {/* Step: Buyer — set new password directly */}
          {step === "buyer_reset" && (
            <form onSubmit={handleBuyerReset} className="space-y-4">
              <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl mb-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Identity verified! Set your new password.
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold text-gray-700">New Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showNew ? "text" : "password"}
                    className="pl-9 pr-10 rounded-xl border-gray-200 h-11"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    className="pl-9 pr-10 rounded-xl border-gray-200 h-11"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold">
                Reset Password
              </Button>
            </form>
          )}

          {/* Step: Seller/Transporter — waiting for admin code */}
          {step === "seller_pending" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Request Submitted</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Your identity has been verified. A password reset request has been sent to the admin.
                  <br /><br />
                  The admin will review your request and provide a <strong>4-digit reset code</strong>. Once you have the code, enter it below.
                </p>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-base font-bold"
                onClick={() => setStep("seller_code")}
              >
                I Have the Code
              </Button>
              <button
                type="button"
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                onClick={onClose}
              >
                Close — I'll come back later
              </button>
            </div>
          )}

          {/* Step: Seller/Transporter — enter 4-digit code */}
          {step === "seller_code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-gray-600 text-sm">Enter the 4-digit code provided by admin, then set your new password.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold text-gray-700">4-Digit Reset Code</Label>
                <Input
                  className="mt-1.5 rounded-xl border-gray-200 h-14 text-center text-2xl font-bold tracking-widest"
                  placeholder="0000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  inputMode="numeric"
                  maxLength={4}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">New Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showNew ? "text" : "password"}
                    className="pl-9 pr-10 rounded-xl border-gray-200 h-11"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    className="pl-9 pr-10 rounded-xl border-gray-200 h-11"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold">
                Reset Password
              </Button>
              <button
                type="button"
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
                onClick={() => setStep("seller_pending")}
              >
                ← Back
              </button>
            </form>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Password Reset!</h3>
              <p className="text-gray-500 text-sm">{successMsg}</p>
              <Button className="w-full h-12 rounded-xl text-base font-bold" onClick={onClose}>
                Go to Login
              </Button>
            </div>
          )}
        </div>

        {/* Step indicator */}
        {(step === "verify" || step === "buyer_reset" || step === "seller_pending" || step === "seller_code") && (
          <div className="px-6 pb-4 flex justify-center gap-1.5">
            {["verify", userRole === "buyer" ? "buyer_reset" : "seller_pending"].map((s, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  (step === "verify" && i === 0) ||
                  (step !== "verify" && i === 1)
                    ? "w-6 bg-teal-600"
                    : "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
