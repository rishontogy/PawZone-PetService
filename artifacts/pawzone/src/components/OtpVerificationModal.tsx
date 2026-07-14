import { useState, useRef, useEffect, useCallback, ClipboardEvent } from "react";
import { ShieldCheck, X, RotateCcw, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalLock } from "@/components/ModalLock";

interface OtpVerificationModalProps {
  userId: number;
  otp: string;
  role: "buyer" | "seller" | "transporter";
  mode: "signup" | "login";
  onVerified: (token: string, user: any) => void;
  onClose?: () => void;
}

const ROLE_CONFIG = {
  buyer:       { label: "Buyer",       color: "from-teal-600 to-emerald-500",   icon: "🛒" },
  seller:      { label: "Seller",      color: "from-purple-600 to-purple-500",  icon: "🏪" },
  transporter: { label: "Transporter", color: "from-blue-600 to-blue-500",      icon: "🚚" },
};

export function OtpVerificationModal({
  userId, otp, role, mode, onVerified, onClose,
}: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cfg = ROLE_CONFIG[role];

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback((idx: number, value: string) => {
    const ch = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[idx] = ch;
      return next;
    });
    setError("");
    if (ch && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowRight" && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerify();
    }
  }, [digits]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!text) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    setError("");
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }, []);

  const handleClear = () => {
    setDigits(["", "", "", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();
  };

  const handleVerify = async () => {
    const entered = digits.join("");
    if (entered.length < 6) {
      setError("Please enter all 6 characters of your OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp: entered }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Incorrect OTP. Please try again.");
        handleClear();
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onVerified(data.token, data.user);
      }, 1200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const enteredCount = digits.filter(d => d).length;

  return (
    <>
      <ModalLock />
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

        <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className={`bg-gradient-to-r ${cfg.color} px-6 pt-6 pb-5`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  {cfg.icon}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Verify Your Account</h2>
                  <p className="text-white/75 text-xs mt-0.5">{cfg.label} Account — OTP Verification</p>
                </div>
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">

            {/* Status message */}
            {success ? (
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-lg">Email Verified!</p>
                  <p className="text-sm text-gray-500 mt-1">Your account is now active. Signing you in…</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {mode === "signup"
                      ? "Please verify your email with the OTP to activate your account."
                      : "Enter the OTP received to access your dashboard."}
                  </p>
                </div>

                {/* Dev-mode OTP display */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Testing Mode — No email configured yet</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Your OTP: <span className="font-mono font-bold text-base tracking-widest text-amber-900">{otp}</span>
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">This notice will be removed once email delivery is set up.</p>
                  </div>
                </div>

                {/* 6-box OTP input */}
                <div>
                  <div className="flex gap-2 justify-center">
                    {digits.map((d, idx) => (
                      <input
                        key={idx}
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="text"
                        maxLength={1}
                        value={d}
                        onChange={e => handleChange(idx, e.target.value)}
                        onKeyDown={e => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all uppercase caret-transparent
                          ${d ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 bg-gray-50 text-gray-800"}
                          ${error ? "border-red-400 bg-red-50 text-red-700" : ""}
                          focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200`}
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={`OTP digit ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {enteredCount}/6 characters entered · Paste or type your OTP
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear
                  </button>
                  <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading || enteredCount < 6}
                    className="flex-1 h-11 rounded-xl font-bold"
                  >
                    {loading ? "Verifying…" : "Verify OTP"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
