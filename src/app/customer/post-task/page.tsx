"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ServiceCategory, ServicePackage } from "@/types";
import { ArrowLeft, MapPin, Loader, Clock, CheckCircle } from "lucide-react";
import { colomboAreas } from "@/lib/areas";

const MapPicker = lazy(() => import("@/components/MapPicker"));

type Step = "categories" | "packages" | "form";

const DEFAULT_LAT = 6.9271;
const DEFAULT_LNG = 79.8612;

export default function BookServicePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("categories");
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [locating, setLocating] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("service_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setCategories(data || []);
    }
    loadCategories();
  }, []);

  async function selectCategory(cat: ServiceCategory) {
    setSelectedCategory(cat);
    setPackagesLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("service_packages")
      .select("*")
      .eq("category_id", cat.id)
      .eq("is_active", true)
      .order("sort_order");
    setPackages(data || []);
    setPackagesLoading(false);
    setStep("packages");
  }

  function selectPackage(pkg: ServicePackage) {
    setSelectedPackage(pkg);
    setStep("form");
  }

  function detectLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPackage) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: bookingError } = await supabase.from("bookings").insert({
      package_id: selectedPackage.id,
      customer_id: user.id,
      scheduled_date: date,
      scheduled_time: time,
      address: address,
      area: area,
      latitude: lat,
      longitude: lng,
      notes: notes || null,
      payment_method: paymentMethod,
      status: "pending",
      payment_status: "pending",
    });

    if (bookingError) { setError(bookingError.message); setLoading(false); return; }
    router.push("/customer/dashboard");
  }

  // ── STEP 1: CATEGORIES ────────────────────────────────────────────────────
  if (step === "categories") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <Link href="/customer/dashboard" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-lg font-bold text-gray-900">Book a Service</span>
        </header>
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">What do you need?</h1>
            <p className="text-gray-400 mt-1">Choose a category to see available services</p>
          </div>
          {categories.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 text-center"
                >
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-200">{cat.icon}</span>
                  <div>
                    <div className="font-bold text-gray-900 text-base">{cat.name}</div>
                    {cat.description && <div className="text-gray-400 text-xs mt-1 leading-snug">{cat.description}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── STEP 2: PACKAGES ──────────────────────────────────────────────────────
  if (step === "packages") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setStep("categories")} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-gray-900">
            {selectedCategory?.icon} {selectedCategory?.name}
          </span>
        </header>
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900">Select a package</h1>
            <p className="text-gray-400 mt-1">Fixed prices — no hidden charges</p>
          </div>
          {packagesLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => selectPackage(pkg)}
                  className="group w-full flex items-center justify-between bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-blue-400 hover:shadow-lg transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900">{pkg.name}</div>
                    {pkg.description && <div className="text-gray-400 text-sm mt-0.5 line-clamp-2">{pkg.description}</div>}
                    <div className="flex items-center gap-1 mt-2 text-gray-400 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      ~{pkg.duration_minutes >= 60 ? `${Math.floor(pkg.duration_minutes / 60)}h${pkg.duration_minutes % 60 ? ` ${pkg.duration_minutes % 60}m` : ""}` : `${pkg.duration_minutes}m`}
                    </div>
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    <div className="text-2xl font-black text-blue-600">LKR {pkg.price.toLocaleString()}</div>
                    <div className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold group-hover:bg-blue-700 transition-colors">
                      Select →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── STEP 3: BOOKING FORM ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => setStep("packages")} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-gray-900">Booking Details</span>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        {/* Selected package summary */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-5 text-white mb-6 shadow-xl shadow-blue-200">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selectedCategory?.icon}</span>
            <div>
              <div className="text-blue-200 text-sm">{selectedCategory?.name}</div>
              <div className="font-black text-xl">{selectedPackage?.name}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-bold">LKR {selectedPackage?.price.toLocaleString()}</span>
                <span className="text-blue-300 text-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{selectedPackage && selectedPackage.duration_minutes >= 60
                    ? `${Math.floor(selectedPackage.duration_minutes / 60)}h${selectedPackage.duration_minutes % 60 ? ` ${selectedPackage.duration_minutes % 60}m` : ""}`
                    : `${selectedPackage?.duration_minutes}m`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Date & Time */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-3">When do you need it?</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Time</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <label className="block text-sm font-bold text-gray-700">Service Address</label>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Area / District</label>
              <select
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 text-sm transition-all"
              >
                <option value="">Select area</option>
                {colomboAreas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Street / Building</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 text-sm transition-all"
                placeholder="e.g. 12A, Galle Road, Apartment 3B"
              />
            </div>
            {/* Map pin */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 font-medium">Pin exact location (optional)</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60"
                >
                  {locating ? <Loader className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                  Use my location
                </button>
              </div>
              <Suspense fallback={<div className="w-full h-44 rounded-2xl bg-gray-100 animate-pulse" />}>
                <MapPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
              </Suspense>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              {(["cash", "online"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
                    paymentMethod === method
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}
                >
                  <span className="text-2xl">{method === "cash" ? "💵" : "💳"}</span>
                  {method === "cash" ? "Cash on Day" : "Pay Online"}
                  {paymentMethod === method && <CheckCircle className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 text-sm resize-none transition-all placeholder-gray-400"
              placeholder="e.g. Please bring your own cleaning supplies. 3rd floor, no lift."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all disabled:opacity-60 shadow-xl shadow-blue-200 hover:-translate-y-0.5"
          >
            {loading ? "Confirming…" : `Confirm Booking — LKR ${selectedPackage?.price.toLocaleString()}`}
          </button>
          <p className="text-center text-gray-400 text-xs pb-4">
            Our team will confirm and assign a verified provider shortly.
          </p>
        </form>
      </main>
    </div>
  );
}
