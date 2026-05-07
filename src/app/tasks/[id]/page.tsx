"use client";

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Task, Profile, Bid } from "@/types";
import { ArrowLeft, MapPin, Calendar, CheckCircle, Send, Star, Tag, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const MapView = lazy(() => import("@/components/MapPicker"));

interface Review {
  id: string;
  rating: number;
  politeness_rating?: number;
  helpfulness_rating?: number;
  punctuality_rating?: number;
  comment?: string;
  reviewer_id: string;
}

interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [task, setTask] = useState<Task | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [hoverPoliteness, setHoverPoliteness] = useState(0);
  const [hoverHelpfulness, setHoverHelpfulness] = useState(0);
  const [hoverPunctuality, setHoverPunctuality] = useState(0);
  const [politenessRating, setPolitenessRating] = useState(0);
  const [helpfulnessRating, setHelpfulnessRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [providerRating, setProviderRating] = useState<number | null>(null);
  const [providerReviewCount, setProviderReviewCount] = useState(0);

  // Bids
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) setCurrentUser(profile);

        const { data: taskData } = await supabase.from("tasks").select("*").eq("id", id).single();
        if (!taskData) { router.push("/"); return; }
        setTask(taskData);

        const { data: cust } = await supabase.from("profiles").select("*").eq("id", taskData.customer_id).single();
        if (cust) setCustomer(cust);

        if (taskData.provider_id) {
          const { data: prov } = await supabase.from("profiles").select("*").eq("id", taskData.provider_id).single();
          if (prov) setProvider(prov);

          const { data: provReviews } = await supabase
            .from("reviews").select("rating").eq("reviewee_id", taskData.provider_id);
          if (provReviews && provReviews.length > 0) {
            const avg = provReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / provReviews.length;
            setProviderRating(avg);
            setProviderReviewCount(provReviews.length);
          }
        }

        const { data: msgs } = await supabase
          .from("messages").select("*").eq("task_id", id).order("created_at", { ascending: true });
        setMessages(msgs || []);

        const { data: existingReview } = await supabase
          .from("reviews").select("*").eq("task_id", id).eq("reviewer_id", user.id).single();
        if (existingReview) { setReview(existingReview); setReviewSubmitted(true); }

        // Load bids
        const { data: bidsData } = await supabase
          .from("bids")
          .select("*, provider:profiles!provider_id(full_name, city, is_verified)")
          .eq("task_id", id)
          .order("created_at", { ascending: true });
        if (bidsData) {
          setBids(bidsData);
          if (profile?.role === "provider") {
            const mb = bidsData.find((b: Bid) => b.provider_id === user.id) || null;
            setMyBid(mb);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Task detail error:", err);
        setLoading(false);
      }
    }

    load();

    const poll = setInterval(async () => {
      const { data: latestTask } = await supabase.from("tasks").select("*").eq("id", id).single();
      if (latestTask) {
        setTask((prev) => {
          if (!prev) return latestTask;
          if (!prev.provider_id && latestTask.provider_id) {
            supabase.from("profiles").select("*").eq("id", latestTask.provider_id).single()
              .then(({ data }) => { if (data) setProvider(data); });
          }
          return latestTask;
        });
      }
      const { data: latestMsgs } = await supabase
        .from("messages").select("*").eq("task_id", id).order("created_at", { ascending: true });
      if (latestMsgs) setMessages(latestMsgs);

      const { data: latestBids } = await supabase
        .from("bids")
        .select("*, provider:profiles!provider_id(full_name, city, is_verified)")
        .eq("task_id", id)
        .order("created_at", { ascending: true });
      if (latestBids) setBids(latestBids);
    }, 5000);

    return () => clearInterval(poll);
  }, [id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !task) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("messages").insert({
      task_id: task.id,
      sender_id: currentUser.id,
      content: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  }

  async function acceptTask() {
    if (!task || !currentUser) return;
    setActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ provider_id: currentUser.id, status: "assigned" })
      .eq("id", task.id);
    if (!error) setTask({ ...task, provider_id: currentUser.id, status: "assigned" });
    setActionLoading(false);
  }

  async function markComplete() {
    if (!task) return;
    setActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: "completed" }).eq("id", task.id);
    if (!error) setTask({ ...task, status: "completed" });
    setActionLoading(false);
  }

  async function cancelTask() {
    if (!task) return;
    setActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: "cancelled" }).eq("id", task.id);
    if (!error) setTask({ ...task, status: "cancelled" });
    setActionLoading(false);
  }

  async function withdrawFromTask() {
    if (!task || !currentUser) return;
    if (!window.confirm(t('withdrawConfirm'))) return;
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("tasks").update({ provider_id: null, status: "open" }).eq("id", task.id);
    await supabase.from("bids").update({ status: "pending" }).eq("task_id", task.id);
    setTask({ ...task, provider_id: undefined, status: "open" });
    setProvider(null);
    setBids((prev) => prev.map((b) => ({ ...b, status: "pending" as const })));
    setMyBid((prev) => prev ? { ...prev, status: "pending" as const } : null);
    setActionLoading(false);
  }

  async function findSomeoneElse() {
    if (!task) return;
    if (!window.confirm(t('findSomeoneConfirm'))) return;
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("tasks").update({ provider_id: null, status: "open" }).eq("id", task.id);
    await supabase.from("bids").update({ status: "pending" }).eq("task_id", task.id);
    setTask({ ...task, provider_id: undefined, status: "open" });
    setProvider(null);
    setBids((prev) => prev.map((b) => ({ ...b, status: "pending" as const })));
    setActionLoading(false);
  }

  async function submitBid() {
    if (!task || !currentUser || !bidAmount) return;
    setSubmittingBid(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bids")
      .insert({ task_id: task.id, provider_id: currentUser.id, amount: parseInt(bidAmount), message: bidMessage.trim() || null })
      .select("*, provider:profiles!provider_id(full_name, city, is_verified)")
      .single();
    if (!error && data) {
      setMyBid(data);
      setBids((prev) => [...prev, data]);
    }
    setSubmittingBid(false);
  }

  async function acceptBid(bid: Bid) {
    if (!task) return;
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("tasks").update({ provider_id: bid.provider_id, status: "assigned" }).eq("id", task.id);
    await supabase.from("bids").update({ status: "accepted" }).eq("id", bid.id);
    await supabase.from("bids").update({ status: "rejected" }).neq("id", bid.id).eq("task_id", task.id);
    setTask((prev) => prev ? { ...prev, provider_id: bid.provider_id, status: "assigned" } : prev);
    setBids((prev) => prev.map((b) => b.id === bid.id ? { ...b, status: "accepted" } : { ...b, status: "rejected" }));
    if (bid.provider) setProvider(bid.provider as Profile);
    setActionLoading(false);
  }

  async function submitReview() {
    if (!task || !currentUser) return;
    if (!politenessRating || !helpfulnessRating || !punctualityRating) return;
    const revieweeId = isCustomer ? task.provider_id : task.customer_id;
    if (!revieweeId) return;
    setSubmittingReview(true);
    const supabase = createClient();
    const overallRating = Math.round((politenessRating + helpfulnessRating + punctualityRating) / 3);
    const { data, error } = await supabase.from("reviews").insert({
      task_id: task.id,
      reviewer_id: currentUser.id,
      reviewee_id: revieweeId,
      rating: overallRating,
      politeness_rating: politenessRating,
      helpfulness_rating: helpfulnessRating,
      punctuality_rating: punctualityRating,
      comment: reviewComment.trim() || null,
    }).select().single();
    if (!error && data) { setReview(data); setReviewSubmitted(true); }
    setSubmittingReview(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!task || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-50">
        <p>Could not load task.</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">Go home</Link>
      </div>
    );
  }

  const isCustomer = currentUser.role === "customer";
  const isProvider = currentUser.role === "provider";
  const isMyTask = task.provider_id === currentUser.id;
  const canChat = task.provider_id && (task.customer_id === currentUser.id || task.provider_id === currentUser.id);
  const backHref = isProvider ? "/provider/dashboard" : "/customer/tasks";
  const getSenderName = (senderId: string) => {
    if (senderId === customer?.id) return customer.full_name.split(" ")[0];
    if (senderId === provider?.id) return provider.full_name.split(" ")[0];
    return "User";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <Link href={backHref} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-lg font-bold text-gray-900">{t('taskDetails')}</span>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[task.status]}`}>
          {task.status.replace("_", " ")}
        </span>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Provider overview — shown to customer when task is assigned/in_progress */}
        {isCustomer && provider && (task.status === "assigned" || task.status === "in_progress") && (
          <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-6 text-white shadow-xl">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Your Provider</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 overflow-hidden flex items-center justify-center text-2xl font-black shrink-0">
                {provider.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={provider.avatar_url} alt="" className="w-full h-full object-cover" />
                  : provider.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-xl font-black truncate">{provider.full_name}</h2>
                  {provider.is_verified && (
                    <span className="shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                {provider.city && <p className="text-slate-400 text-sm">📍 {provider.city}</p>}
                {providerRating !== null ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(providerRating) ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`} />
                    ))}
                    <span className="text-sm font-bold ml-1">{providerRating.toFixed(1)}</span>
                    <span className="text-slate-400 text-sm">({providerReviewCount})</span>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm mt-1">No reviews yet</p>
                )}
              </div>
            </div>
            <Link
              href={`/provider/${provider.id}`}
              className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-semibold transition-colors"
            >
              View full profile <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={findSomeoneElse}
              disabled={actionLoading}
              className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              {actionLoading ? "Resetting…" : "Not the right fit? Find someone else"}
            </button>
          </div>
        )}

        {/* Main task card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900 mb-3">{task.title}</h1>
          <p className="text-gray-600 leading-relaxed mb-5">{task.description}</p>

          {/* Photos */}
          {task.photos && task.photos.length > 0 && (
            <div className="flex gap-2 mb-5 overflow-x-auto">
              {task.photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="w-28 h-28 rounded-2xl object-cover shrink-0 border border-gray-100" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Tag className="w-4 h-4 shrink-0 text-blue-500" />
              <span className="capitalize">{task.category.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin className="w-4 h-4 shrink-0 text-blue-500" />
              <span>{task.location}</span>
            </div>
            {task.scheduled_date && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar className="w-4 h-4 shrink-0 text-blue-500" />
                <span>
                  {new Date(task.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "long" })}
                  {task.scheduled_time && ` · ${task.scheduled_time}`}
                </span>
              </div>
            )}
          </div>

          {task.latitude && task.longitude && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-500" /> {t('pinnedLocation')}
              </p>
              <Suspense fallback={<div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" />}>
                <MapView lat={task.latitude} lng={task.longitude} />
              </Suspense>
            </div>
          )}

          <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 font-medium">{t('budget2')}</div>
              <div className="text-3xl font-black text-gray-900">LKR {task.budget.toLocaleString()}</div>
              {isProvider && (
                <div className="text-sm text-green-600 mt-0.5 font-medium">
                  {t('youEarn')} ~LKR {Math.round(task.budget * 0.85).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {isProvider && task.status === "open" && !myBid && (
                <button
                  onClick={acceptTask}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-lg shadow-blue-200"
                >
                  {actionLoading ? "Accepting…" : t('acceptTask')}
                </button>
              )}
              {isProvider && isMyTask && task.status === "assigned" && (
                <button
                  onClick={markComplete}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  {actionLoading ? "Updating…" : t('markComplete')}
                </button>
              )}
              {isProvider && isMyTask && task.status === "assigned" && (
                <button
                  onClick={withdrawFromTask}
                  disabled={actionLoading}
                  className="px-5 py-2.5 border border-orange-200 text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-colors disabled:opacity-60 text-sm"
                >
                  {actionLoading ? "Withdrawing…" : t('withdrawTask')}
                </button>
              )}
              {isCustomer && task.status === "open" && (
                <button
                  onClick={cancelTask}
                  disabled={actionLoading}
                  className="px-5 py-2.5 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  {actionLoading ? "Cancelling…" : t('cancelTask')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Provider bid submission */}
        {isProvider && task.status === "open" && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">{t('submitBid')}</h2>
            {myBid ? (
              <div className={`rounded-2xl p-4 text-sm font-semibold text-center ${
                myBid.status === "accepted" ? "bg-green-50 text-green-700" :
                myBid.status === "rejected" ? "bg-gray-50 text-gray-500" :
                "bg-blue-50 text-blue-700"
              }`}>
                {myBid.status === "accepted" ? `✓ ${t('bidAccepted')}` :
                 myBid.status === "rejected" ? t('bidRejected') :
                 `⏳ ${t('bidPending')}`}
                <div className="text-base font-black mt-1">LKR {myBid.amount.toLocaleString()}</div>
                {myBid.message && <div className="font-normal mt-1 text-xs">"{myBid.message}"</div>}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('yourBidAmount')}</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                    placeholder={task.budget.toString()}
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bidMessage')}</label>
                  <textarea
                    rows={3}
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 resize-none"
                    placeholder="Introduce yourself, your experience…"
                  />
                </div>
                <button
                  onClick={submitBid}
                  disabled={!bidAmount || submittingBid}
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-lg shadow-blue-200"
                >
                  {submittingBid ? "Sending…" : t('sendBid')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Customer: view bids */}
        {isCustomer && task.status === "open" && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">{t('bids')} ({bids.length})</h2>
            {bids.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">🤝</div>
                <p className="font-medium">{t('noBids')}</p>
                <p className="text-sm">Providers will send offers soon.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <div key={bid.id} className={`rounded-2xl p-4 border transition-all ${
                    bid.status === "accepted" ? "border-green-200 bg-green-50" :
                    bid.status === "rejected" ? "border-gray-100 bg-gray-50 opacity-60" :
                    "border-gray-100 bg-gray-50 hover:border-blue-200"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                          {bid.provider?.full_name?.[0] || "P"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/provider/${bid.provider_id}`}
                              className="font-bold text-gray-900 hover:text-blue-600 transition-colors truncate"
                            >
                              {bid.provider?.full_name}
                            </Link>
                            {bid.provider?.is_verified && (
                              <span className="shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs">{bid.provider?.city}</div>
                          {bid.message && <div className="text-gray-500 text-sm mt-1">"{bid.message}"</div>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-black text-gray-900 text-lg">LKR {bid.amount.toLocaleString()}</div>
                        {bid.status === "pending" && (
                          <button
                            onClick={() => acceptBid(bid)}
                            disabled={actionLoading}
                            className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                          >
                            {t('acceptBid')}
                          </button>
                        )}
                        {bid.status === "accepted" && (
                          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-xl text-xs font-bold">
                            ✓ Accepted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={`/provider/${bid.provider_id}`}
                        className="text-xs text-blue-600 font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all"
                      >
                        View profile <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* People */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">{t('people')}</h2>
          <div className="space-y-4">
            {customer && (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-lg shrink-0">
                  {customer.full_name[0]}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{customer.full_name}</div>
                  <div className="text-xs text-gray-400">{t('customer')} · {customer.city}</div>
                </div>
              </div>
            )}
            {provider ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-lg shrink-0">
                  {provider.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 truncate">{provider.full_name}</div>
                    {provider.is_verified && (
                      <span className="shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{t('provider')} · {provider.city}</div>
                </div>
                <Link
                  href={`/provider/${provider.id}`}
                  className="shrink-0 text-xs text-blue-600 font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all"
                >
                  Profile <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">{t('waitingForProvider')}</div>
            )}
          </div>
        </div>

        {/* Chat */}
        {canChat ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{t('chat')}</h2>
            </div>
            <div className="h-72 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center pt-8 font-medium">{t('noMessages')}</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && (
                          <span className="text-xs text-gray-400 px-1 font-medium">{getSenderName(msg.sender_id)}</span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-sm shadow-sm"
                            : "bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100"
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-300 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            {task.status !== "cancelled" && (
              <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-white">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center text-gray-400 text-sm shadow-sm">
            <div className="text-3xl mb-2">💬</div>
            <p className="font-medium">{t('chatAvailableAfter')}</p>
          </div>
        )}

        {/* Rating */}
        {task.status === "completed" && (isCustomer ? !!task.provider_id : isProvider && isMyTask) && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">
              {isCustomer ? t('rateProvider') : "Rate the Customer"}
            </h2>
            {reviewSubmitted ? (
              <div className="space-y-3 py-2">
                {[
                  { label: isCustomer ? "😊 Politeness" : "😊 Respectfulness", val: review?.politeness_rating ?? review?.rating ?? 0 },
                  { label: isCustomer ? "🤝 Helpfulness" : "📋 Clarity", val: review?.helpfulness_rating ?? review?.rating ?? 0 },
                  { label: isCustomer ? "⏰ Punctuality" : "💳 Fairness", val: review?.punctuality_rating ?? review?.rating ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-32 shrink-0">{label}</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`w-5 h-5 ${s <= val ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                ))}
                {review?.comment && (
                  <p className="text-gray-500 text-sm mt-3 pt-3 border-t border-gray-100">"{review.comment}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { label: isCustomer ? "😊 Politeness" : "😊 Respectfulness", val: politenessRating, hover: hoverPoliteness, setVal: setPolitenessRating, setHover: setHoverPoliteness },
                  { label: isCustomer ? "🤝 Helpfulness" : "📋 Clarity", val: helpfulnessRating, hover: hoverHelpfulness, setVal: setHelpfulnessRating, setHover: setHoverHelpfulness },
                  { label: isCustomer ? "⏰ Punctuality" : "💳 Fairness", val: punctualityRating, hover: hoverPunctuality, setVal: setPunctualityRating, setHover: setHoverPunctuality },
                ].map(({ label, val, hover, setVal, setHover }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{label}</span>
                      {val > 0 && (
                        <span className="text-xs font-semibold text-gray-400">
                          {[t('poor'), t('fair'), t('good'), t('great'), t('excellent')][val - 1]}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setVal(s)}
                          onMouseEnter={() => setHover(s)}
                          onMouseLeave={() => setHover(0)}
                        >
                          <Star className={`w-8 h-8 transition-colors ${
                            s <= (hover || val) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Leave a comment (optional)…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
                />
                <button
                  onClick={submitReview}
                  disabled={!politenessRating || !helpfulnessRating || !punctualityRating || submittingReview}
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-200"
                >
                  {submittingReview ? "Submitting…" : t('submitReview')}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
