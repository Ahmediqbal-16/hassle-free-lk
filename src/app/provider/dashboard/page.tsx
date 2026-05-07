"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, Booking } from "@/types";
import { LogOut, CheckCircle, Briefcase, Star, ChevronRight, Settings } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ProviderDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (profileData?.role !== "provider") { router.push("/login"); return; }
      setProfile(profileData);

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*, package:service_packages(*, category:service_categories(*)), customer:profiles!customer_id(full_name, city, phone)")
        .eq("provider_id", user.id)
        .order("scheduled_date", { ascending: true });

      setBookings(bookingData || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = bookings.filter(b => b.status === "confirmed" || b.status === "in_progress");
  const completed = bookings.filter(b => b.status === "completed");
  const totalEarnings = completed.reduce((sum, b) => sum + (b.package?.price || 0) * 0.85, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <span className="text-xl font-black text-blue-600">{t('appName')}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {profile && <NotificationBell userId={profile.id} />}
          <Link href="/provider/settings" className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50">
            <Settings className="w-5 h-5" />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm transition-colors p-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">{t('logout')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Greeting */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-7 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 overflow-hidden flex items-center justify-center text-2xl font-black text-white shrink-0">
              {profile?.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile?.full_name?.[0]}
            </div>
            <div>
              <p className="text-slate-300 text-sm font-medium">Provider Dashboard</p>
              <h1 className="text-2xl font-black">{t('hello')}, {profile?.full_name?.split(" ")[0]} 👋</h1>
              {profile?.city && <p className="text-slate-400 mt-1 text-sm">📍 {profile.city}</p>}
            </div>
          </div>

          {!profile?.nic_submitted && !profile?.is_verified && (
            <Link
              href="/provider/settings"
              className="mt-4 flex items-center gap-2 px-4 py-3 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors"
            >
              <span>📋</span>
              <span className="flex-1">Submit your NIC to get verified</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          {profile?.nic_submitted && !profile?.is_verified && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300 text-sm font-medium">
              ⏳ Verification pending — we&apos;ll notify you once approved
            </div>
          )}
          {profile?.is_verified && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-green-500/20 border border-green-400/30 rounded-xl text-green-300 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Verified provider
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Briefcase, label: "Upcoming", value: upcoming.length, color: "text-blue-600" },
            { icon: CheckCircle, label: "Completed", value: completed.length, color: "text-green-600" },
            { icon: Star, label: "Est. Earnings", value: `LKR ${Math.round(totalEarnings / 1000)}k`, color: "text-amber-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-gray-400 text-xs mt-0.5 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Upcoming Jobs</h2>
            {bookings.length > 0 && (
              <Link href="/provider/tasks" className="text-blue-600 text-sm font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 font-medium">No upcoming jobs</p>
              <p className="text-gray-400 text-sm mt-2">Jobs assigned by our team will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0 mt-0.5">{booking.package?.category?.icon || "🔧"}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{booking.package?.name}</div>
                        <div className="text-sm text-gray-500">{booking.package?.category?.name}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                          <span>📅 {new Date(booking.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "medium" })}</span>
                          <span>🕐 {booking.scheduled_time}</span>
                        </div>
                        {booking.area && <div className="text-xs text-gray-400 mt-1">📍 {booking.area}</div>}
                        {booking.customer && (
                          <div className="text-xs text-gray-400 mt-1">👤 {(booking.customer as Profile).full_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[booking.status]}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <div className="font-black text-gray-900">LKR {booking.package?.price.toLocaleString()}</div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav role="provider" />
    </div>
  );
}
