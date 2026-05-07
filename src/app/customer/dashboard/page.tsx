"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, Booking } from "@/types";
import { CalendarPlus, ClipboardList, LogOut, ChevronRight, Settings } from "lucide-react";
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

const statusLabel: Record<string, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function CustomerDashboard() {
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
      if (profileData?.role !== "customer") { router.push("/login"); return; }
      setProfile(profileData);

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*, package:service_packages(*, category:service_categories(*))")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
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

  const active = bookings.filter(b => b.status === "confirmed" || b.status === "in_progress" || b.status === "pending");
  const completed = bookings.filter(b => b.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <span className="text-xl font-black text-blue-600">{t('appName')}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {profile && <NotificationBell userId={profile.id} />}
          <Link href="/customer/settings" className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50">
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
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-7 text-white shadow-xl shadow-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center text-2xl font-black text-white shrink-0">
              {profile?.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile?.full_name?.[0]}
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium">Welcome back</p>
              <h1 className="text-2xl font-black">{t('hello')}, {profile?.full_name?.split(" ")[0]} 👋</h1>
              {profile?.city && <p className="text-blue-200 mt-1 text-sm">📍 {profile.city}</p>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: bookings.length, color: "text-gray-900" },
            { label: "Active", value: active.length, color: "text-blue-600" },
            { label: "Completed", value: completed.length, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-gray-400 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/customer/post-task"
            className="group flex items-center gap-3 p-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            <CalendarPlus className="w-7 h-7 shrink-0" />
            <div>
              <div className="font-bold">Book a Service</div>
              <div className="text-blue-200 text-xs">Fixed prices</div>
            </div>
          </Link>
          <Link
            href="/customer/tasks"
            className="group flex items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <ClipboardList className="w-7 h-7 text-blue-600 shrink-0" />
            <div>
              <div className="font-bold text-gray-900">My Bookings</div>
              <div className="text-gray-400 text-xs">{bookings.length} total</div>
            </div>
          </Link>
        </div>

        {/* Recent bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
            {bookings.length > 0 && (
              <Link href="/customer/tasks" className="text-blue-600 text-sm font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500 mb-5 font-medium">No bookings yet</p>
              <Link
                href="/customer/post-task"
                className="inline-flex px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Book your first service
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 5).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="group flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{booking.package?.category?.icon || "🔧"}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{booking.package?.name}</div>
                      <div className="text-gray-400 text-sm mt-0.5">
                        {booking.package?.category?.name} · {new Date(booking.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "medium" })}
                      </div>
                      <div className="text-xs mt-0.5 text-gray-400">{statusLabel[booking.status]}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <div className="font-bold text-gray-900">LKR {booking.package?.price.toLocaleString()}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[booking.status]}`}>
                      {booking.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav role="customer" />
    </div>
  );
}
