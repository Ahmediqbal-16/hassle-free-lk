"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Booking } from "@/types";
import { ArrowLeft, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const filters = ["All", "confirmed", "in_progress", "completed", "cancelled"];

export default function ProviderJobsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("bookings")
        .select("*, package:service_packages(*, category:service_categories(*)), customer:profiles!customer_id(full_name)")
        .eq("provider_id", user.id)
        .order("scheduled_date", { ascending: false });

      setBookings(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = activeFilter === "All" ? bookings : bookings.filter(b => b.status === activeFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <Link href="/provider/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-lg font-bold text-gray-900">My Jobs</span>
        <span className="ml-auto text-sm text-gray-400">{bookings.length} total</span>
      </header>

      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              activeFilter === f
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "All"
              ? `All (${bookings.length})`
              : `${f.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} (${bookings.filter(b => b.status === f).length})`}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 font-medium">No jobs here yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl shrink-0 mt-0.5">{booking.package?.category?.icon || "🔧"}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-gray-900 truncate">{booking.package?.name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusColors[booking.status]}`}>
                          {booking.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{booking.package?.category?.name}</div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                        <span>📅 {new Date(booking.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "medium" })}</span>
                        <span>🕐 {booking.scheduled_time}</span>
                        {booking.area && <span>📍 {booking.area}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="font-black text-gray-900">LKR {booking.package?.price.toLocaleString()}</div>
                    {booking.status === "completed" && (
                      <div className="text-green-600 text-xs font-semibold">
                        Earned ~LKR {Math.round((booking.package?.price || 0) * 0.85).toLocaleString()}
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav role="provider" />
    </div>
  );
}
