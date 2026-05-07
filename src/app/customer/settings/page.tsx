"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function CustomerSettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data?.role !== "customer") { router.push("/"); return; }
      setProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setPhotoUploading(true);
    setPhotoMsg("");
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setPhotoMsg("Upload failed: " + error.message); setPhotoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const cacheBusted = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: cacheBusted }).eq("id", profile.id);
    setProfile({ ...profile, avatar_url: cacheBusted });
    setPhotoMsg(t('photoUpdated'));
    setPhotoUploading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <Link href="/customer/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-lg font-bold text-gray-900">{t('settings')}</span>
      </header>

      <main className="max-w-sm mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm text-center space-y-6">
          {/* Avatar */}
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-5xl font-black text-blue-700 mx-auto overflow-hidden">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name[0]
              )}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div>
            <div className="font-bold text-gray-900 text-2xl">{profile?.full_name}</div>
            <div className="text-gray-400 text-sm mt-1">{profile?.email}</div>
            {profile?.city && <div className="text-gray-400 text-sm">📍 {profile.city}</div>}
          </div>

          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            className="w-full py-3.5 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {photoUploading ? (
              <><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> {t('uploadingPhoto')}</>
            ) : (
              <><Upload className="w-4 h-4" /> {t('changePhoto')}</>
            )}
          </button>

          {photoMsg && (
            <div className="bg-green-50 border border-green-100 text-green-700 rounded-2xl px-4 py-3 text-sm font-medium">
              ✓ {photoMsg}
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-left">
              {[
                { label: "Phone", value: profile?.phone || "Not set" },
                { label: "Area", value: profile?.city || "Not set" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-2xl p-3">
                  <div className="text-xs text-gray-400 font-medium">{label}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
