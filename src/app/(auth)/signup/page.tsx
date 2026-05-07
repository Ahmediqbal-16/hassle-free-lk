"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types";
import { colomboAreas } from "@/lib/areas";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { Phone, ArrowRight } from "lucide-react";

function formatPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-\(\)]/g, "");
  // Sri Lanka local format: 07X XXXXXXX
  if (/^0\d{9}$/.test(cleaned)) return "+94" + cleaned.slice(1);
  if (cleaned.startsWith("+")) return cleaned;
  return "+" + cleaned;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as UserRole) || "customer";
  const { t } = useLanguage();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const formatted = formatPhone(phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms",
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        phone: formatted,
        full_name: fullName,
        role,
        city,
      }, { onConflict: "id" });
      if (role === "provider") router.push("/provider/dashboard");
      else router.push("/customer/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50 pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LanguageSwitcher />
          </div>
          <Link href="/" className="inline-block text-2xl font-black text-blue-600 mb-4">
            Hassle Free
          </Link>
          <h1 className="text-3xl font-black text-gray-900">{t('createAccount')}</h1>
          <p className="text-gray-500 mt-2">
            {step === "details" ? "Join thousands across Colombo" : `Enter the code sent to ${phone}`}
          </p>
        </div>

        <form
          onSubmit={step === "details" ? handleSendOtp : handleVerifyOtp}
          className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          {step === "details" ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">I want to…</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["customer", "provider"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-3 px-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                        role === r
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-100 text-gray-500 hover:border-gray-200 bg-gray-50"
                      }`}
                    >
                      {r === "customer" ? t('hireSomeone') : t('earnMoney')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('fullName')}</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="Kamal Perera"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('area')}</label>
                <select
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition-all"
                >
                  <option value="">Select your area</option>
                  {colomboAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('phone')}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Include your country code, e.g. +94 for Sri Lanka</p>
              </div>
            </>
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
                  onClick={() => { setStep("details"); setOtp(""); setError(""); }}
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
              ? (step === "details" ? "Sending…" : "Creating account…")
              : <>{step === "details" ? "Send Code" : t('createAccount')} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">{t('logIn')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
