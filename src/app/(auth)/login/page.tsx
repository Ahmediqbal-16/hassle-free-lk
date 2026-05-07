"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Phone, ArrowRight, Mail } from "lucide-react";

function formatPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-\(\)]/g, "");
  if (/^0\d{9}$/.test(cleaned)) return "+94" + cleaned.slice(1);
  if (cleaned.startsWith("+")) return cleaned;
  return "+" + cleaned;
}

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"phone" | "email">("phone");

  // Phone OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === "otp") startCooldown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  function startCooldown() {
    setResendCooldown(30);
    timerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function redirect(userId: string) {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    if (!profile) { router.push("/signup"); return; }
    if (profile.role === "provider") router.push("/provider/dashboard");
    else if (profile.role === "admin") router.push("/admin");
    else router.push("/customer/dashboard");
  }

  async function sendOtp() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone: formatPhone(phone) });
    if (error) setError(error.message);
    return !error;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const ok = await sendOtp();
    if (ok) setStep("otp");
    setLoading(false);
  }

  async function handleResend() {
    setError("");
    const ok = await sendOtp();
    if (ok) startCooldown();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token: otp,
      type: "sms",
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) await redirect(data.user.id);
    setLoading(false);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) await redirect(data.user.id);
    setLoading(false);
  }

  function switchMethod(m: "phone" | "email") {
    setMethod(m);
    setError("");
    setStep("phone");
    setOtp("");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50 pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-black text-blue-600 mb-6">
            Hassle Free
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-2">
            {method === "phone" && step === "otp" ? `Code sent to ${phone}` : "Log in to your account"}
          </p>
        </div>

        {/* Method toggle */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          <button
            onClick={() => switchMethod("phone")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              method === "phone" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            <Phone className="w-4 h-4" /> Phone
          </button>
          <button
            onClick={() => switchMethod("email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              method === "email" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
        </div>

        <form
          onSubmit={
            method === "email"
              ? handleEmailLogin
              : step === "phone" ? handleSendOtp : handleVerifyOtp
          }
          className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          {method === "email" ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : step === "phone" ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all text-center text-2xl tracking-widest font-bold"
                placeholder="000000"
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="text-gray-400 text-sm hover:text-gray-600"
                >
                  Change number
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResend}
                  className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-default"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {loading
              ? "Please wait…"
              : method === "email"
                ? <>"Log In" <ArrowRight className="w-4 h-4" /></>
                : step === "phone"
                  ? <>"Send Code" <ArrowRight className="w-4 h-4" /></>
                  : <>"Verify" <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-600 font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
