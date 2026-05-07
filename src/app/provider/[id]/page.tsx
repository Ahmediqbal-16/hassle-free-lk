"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile, Review, Booking } from "@/types";
import { ArrowLeft, Star, CheckCircle, MapPin, Calendar } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: providerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("role", "provider")
        .single();
      if (!providerData) { router.push("/"); return; }
      setProvider(providerData);

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviewer_id(full_name)")
        .eq("reviewee_id", id)
        .order("created_at", { ascending: false });
      setReviews(reviewsData || []);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, package:service_packages(*, category:service_categories(*))")
        .eq("provider_id", id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      setCompletedBookings(bookings || []);

      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-gray-900">{t('providerProfile')}</span>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Profile hero */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-7 text-white shadow-xl">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-4xl font-black text-white shrink-0">
              {provider.full_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white truncate">{provider.full_name}</h1>
                {provider.is_verified && (
                  <div className="shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 text-sm mb-3">
                <MapPin className="w-3.5 h-3.5" />
                {provider.city || "Colombo"}
              </div>
              {provider.is_verified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-semibold rounded-full">
                  <CheckCircle className="w-3 h-3" /> {t('verified')}
                </span>
              ) : (
                <span className="inline-flex px-3 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold rounded-full">
                  {t('pendingVerification')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-gray-900">{completedBookings.length}</div>
            <div className="text-gray-400 text-xs mt-1 leading-tight">{t('tasksCompleted')}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-amber-500">
              {avgRating ? `${avgRating}★` : "—"}
            </div>
            <div className="text-gray-400 text-xs mt-1 leading-tight">{t('avgRating')}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-blue-600">{reviews.length}</div>
            <div className="text-gray-400 text-xs mt-1 leading-tight">{t('reviews')}</div>
          </div>
        </div>

        {/* Member since */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <div className="text-xs text-gray-400 font-medium">{t('memberSince')}</div>
            <div className="font-semibold text-gray-900 text-sm">
              {new Date(provider.created_at).toLocaleDateString("en-LK", { year: "numeric", month: "long" })}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reviews')}</h2>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-gray-400 font-medium">{t('noReviews')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {(review.reviewer as Profile | undefined)?.full_name || "Customer"}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(review.created_at).toLocaleDateString("en-LK", { dateStyle: "medium" })}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {[1,2,3,4,5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 text-sm leading-relaxed">"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent completed bookings */}
        {completedBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Completed Work</h2>
            <div className="space-y-2">
              {completedBookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="text-2xl shrink-0">{booking.package?.category?.icon || "🔧"}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{booking.package?.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{booking.package?.category?.name}</div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3 text-right">
                    <div className="font-bold text-green-600 text-sm">LKR {booking.package?.price.toLocaleString()}</div>
                    <div className="text-xs text-green-500">✓ Done</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pb-6" />
      </main>
    </div>
  );
}
