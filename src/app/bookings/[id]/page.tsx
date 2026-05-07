"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Booking, Profile } from "@/types";
import { ArrowLeft, Star, CheckCircle, Phone, MapPin, Calendar, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const statusLabel: Record<string, string> = {
  pending: "Awaiting confirmation from our team",
  confirmed: "Confirmed — provider will arrive as scheduled",
  in_progress: "Job is in progress",
  completed: "Job completed",
  cancelled: "Booking cancelled",
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setCurrentUser(profileData);

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*, package:service_packages(*, category:service_categories(*)), customer:profiles!customer_id(*), provider:profiles!provider_id(*)")
        .eq("id", id)
        .single();

      if (!bookingData) { router.push("/customer/dashboard"); return; }
      setBooking(bookingData);

      // Check if review already submitted
      if (bookingData.status === "completed") {
        const { data: existingReview } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", id)
          .eq("reviewer_id", user.id)
          .single();
        if (existingReview) setReviewSubmitted(true);
      }

      setLoading(false);
    }
    load();
  }, [id, router]);

  async function updateStatus(newStatus: string) {
    if (!booking) return;
    setActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", booking.id);
    if (!error) setBooking({ ...booking, status: newStatus as Booking["status"] });
    setActionLoading(false);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || !currentUser || rating === 0) return;
    setReviewLoading(true);
    const supabase = createClient();
    const isCustomer = currentUser.role === "customer";
    const revieweeId = isCustomer ? booking.provider_id : booking.customer_id;
    if (!revieweeId) { setReviewLoading(false); return; }

    await supabase.from("reviews").insert({
      booking_id: booking.id,
      reviewer_id: currentUser.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment || null,
    });
    setReviewSubmitted(true);
    setShowReview(false);
    setReviewLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) return null;

  const isCustomer = currentUser?.role === "customer";
  const isProvider = currentUser?.role === "provider";
  const provider = booking.provider as Profile | undefined;
  const customer = booking.customer as Profile | undefined;
  const backHref = isCustomer ? "/customer/tasks" : "/provider/tasks";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <Link href={backHref} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-lg font-bold text-gray-900">Booking Details</span>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[booking.status]}`}>
          {booking.status.replace("_", " ")}
        </span>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Service card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{booking.package?.category?.icon || "🔧"}</span>
            <div>
              <div className="text-blue-200 text-sm">{booking.package?.category?.name}</div>
              <div className="text-2xl font-black">{booking.package?.name}</div>
              <div className="text-blue-200 mt-1 text-sm font-semibold">LKR {booking.package?.price.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-4 text-blue-200 text-sm font-medium">{statusLabel[booking.status]}</div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">Booking Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              {new Date(booking.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "full" })}
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              {booking.scheduled_time}
            </div>
            <div className="flex items-start gap-3 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span>{booking.area && `${booking.area} — `}{booking.address}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <span className="text-gray-400">💳</span>
              {booking.payment_method === "cash" ? "Cash on day" : "Online payment"}
            </div>
          </div>
          {booking.notes && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-semibold mb-1">Notes</p>
              <p className="text-sm text-gray-600">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Provider card (visible to customer) */}
        {isCustomer && provider && (booking.status === "confirmed" || booking.status === "in_progress" || booking.status === "completed") && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Your Provider</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 overflow-hidden flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">
                {provider.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={provider.avatar_url} alt="" className="w-full h-full object-cover" />
                  : provider.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 truncate">{provider.full_name}</span>
                  {provider.is_verified && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                </div>
                {provider.city && <div className="text-sm text-gray-400">{provider.city}</div>}
                {provider.phone && (
                  <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-blue-600 text-sm mt-1 font-medium hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {provider.phone}
                  </a>
                )}
              </div>
              <Link
                href={`/provider/${provider.id}`}
                className="shrink-0 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
        )}

        {/* Customer card (visible to provider) */}
        {isProvider && customer && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Customer</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center text-2xl font-black text-gray-500 shrink-0">
                {customer.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={customer.avatar_url} alt="" className="w-full h-full object-cover" />
                  : customer.full_name?.[0]}
              </div>
              <div>
                <div className="font-bold text-gray-900">{customer.full_name}</div>
                {customer.city && <div className="text-sm text-gray-400">{customer.city}</div>}
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-blue-600 text-sm mt-1 font-medium hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {customer.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Provider actions */}
        {isProvider && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900">Update Status</h2>
            {booking.status === "confirmed" && (
              <button
                onClick={() => updateStatus("in_progress")}
                disabled={actionLoading}
                className="w-full py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {actionLoading ? "…" : "🚀 Mark as In Progress"}
              </button>
            )}
            {booking.status === "in_progress" && (
              <button
                onClick={() => updateStatus("completed")}
                disabled={actionLoading}
                className="w-full py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {actionLoading ? "…" : "✅ Mark as Completed"}
              </button>
            )}
            {(booking.status === "confirmed" || booking.status === "in_progress") && (
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={actionLoading}
                className="w-full py-3 border border-red-200 text-red-500 rounded-2xl font-semibold hover:bg-red-50 transition-colors disabled:opacity-60 text-sm"
              >
                Cancel
              </button>
            )}
            {booking.status === "completed" && (
              <div className="text-center py-4 text-green-600 font-semibold">✅ Job completed</div>
            )}
          </div>
        )}

        {/* Customer cancel */}
        {isCustomer && booking.status === "pending" && (
          <button
            onClick={() => updateStatus("cancelled")}
            disabled={actionLoading}
            className="w-full py-3 border border-red-200 text-red-500 rounded-2xl font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {actionLoading ? "…" : "Cancel Booking"}
          </button>
        )}

        {/* Review */}
        {booking.status === "completed" && !reviewSubmitted && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            {!showReview ? (
              <button
                onClick={() => setShowReview(true)}
                className="w-full py-3 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors"
              >
                ⭐ Leave a Review
              </button>
            ) : (
              <form onSubmit={submitReview} className="space-y-4">
                <h2 className="font-bold text-gray-900">Leave a Review</h2>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)}>
                      <Star className={`w-8 h-8 transition-colors ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience (optional)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReview(false)}
                    className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-2xl font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rating === 0 || reviewLoading}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {reviewLoading ? "…" : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {reviewSubmitted && (
          <div className="bg-green-50 border border-green-100 rounded-3xl p-5 text-center text-green-700 font-semibold">
            ✅ Review submitted — thank you!
          </div>
        )}
      </main>
    </div>
  );
}
