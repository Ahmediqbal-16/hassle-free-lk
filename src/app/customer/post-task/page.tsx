"use client";

import { useState, lazy, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ServiceCategory } from "@/types";
import { ArrowLeft, MapPin, Loader, ImagePlus, X } from "lucide-react";
import { colomboAreas } from "@/lib/areas";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const MapPicker = lazy(() => import("@/components/MapPicker"));

const categories: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "moving", label: "Moving", icon: "📦" },
  { value: "repairs", label: "Repairs", icon: "🔧" },
  { value: "errands", label: "Errands", icon: "🛍️" },
  { value: "gardening", label: "Gardening", icon: "🌿" },
  { value: "painting", label: "Painting", icon: "🖌️" },
  { value: "plumbing", label: "Plumbing", icon: "🚿" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "nanny", label: "Nanny", icon: "👶" },
  { value: "elderly_care", label: "Elderly Care", icon: "🧓" },
  { value: "cat_sitting", label: "Cat Sitting", icon: "🐱" },
  { value: "other", label: "Other", icon: "✨" },
];

const DEFAULT_LAT = 6.9271;
const DEFAULT_LNG = 79.8612;

export default function PostTaskPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocationError("Could not get your location. Please pin it on the map.");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3 - photos.length);
    const newPhotos = [...photos, ...files].slice(0, 3);
    setPhotos(newPhotos);
    const previews = newPhotos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(previews);
  }

  function removePhoto(idx: number) {
    const newPhotos = photos.filter((_, i) => i !== idx);
    const newPreviews = photoPreviews.filter((_, i) => i !== idx);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) return [];
    const supabase = createClient();
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("task-photos").upload(name, file, { contentType: file.type });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from("task-photos").getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { setError("Please select a category"); return; }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    setUploadingPhotos(true);
    const photoUrls = await uploadPhotos();
    setUploadingPhotos(false);

    const { error: taskError } = await supabase.from("tasks").insert({
      customer_id: user.id,
      title,
      description,
      category,
      budget: parseInt(budget),
      location,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      status: "open",
      latitude: lat,
      longitude: lng,
      photos: photoUrls,
    });

    if (taskError) { setError(taskError.message); setLoading(false); return; }
    router.push("/customer/dashboard");
  }

  const loadingLabel = uploadingPhotos ? "Uploading photos…" : "Posting…";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/customer/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-lg font-bold text-gray-900">{t('postTask')}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('taskTitle')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
              placeholder="e.g. Clean my 3-bedroom apartment"
            />
          </div>

          {/* Category */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">{t('category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-semibold transition-all ${
                    category === cat.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-100 text-gray-500 hover:border-gray-200 bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('description')}</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 resize-none transition-all"
              placeholder="Describe what you need done, any special requirements…"
            />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t('uploadPhotos')} <span className="text-gray-400 font-normal">(optional, up to 3)</span>
            </label>
            <div className="flex gap-3 flex-wrap">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors bg-gray-50"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs font-medium">Add photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          </div>

          {/* Budget & Area */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('budget')}</label>
                <input
                  type="number"
                  required
                  min="500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('area')}</label>
                <select
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 transition-all"
                >
                  <option value="">Select area</option>
                  {colomboAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t('preferredDate')} <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 transition-all"
              />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 transition-all"
              />
            </div>
          </div>

          {/* Location picker */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">{t('pinLocation')}</label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60"
              >
                {locating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                {t('useMyLocation')}
              </button>
            </div>
            {locationError && <p className="text-red-500 text-xs mb-2">{locationError}</p>}
            <p className="text-gray-400 text-xs mb-3">Click the map or drag the pin to set your exact location</p>
            <Suspense fallback={<div className="w-full h-56 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-400 text-sm animate-pulse">Loading map…</div>}>
              <MapPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
            </Suspense>
            <p className="text-gray-400 text-xs mt-2">📍 {lat.toFixed(5)}, {lng.toFixed(5)}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all disabled:opacity-60 shadow-xl shadow-blue-200 hover:-translate-y-0.5"
          >
            {loading ? loadingLabel : t('postTask')}
          </button>
        </form>
      </main>
    </div>
  );
}
