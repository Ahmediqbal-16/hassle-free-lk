"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, Task } from "@/types";
import { LogOut, CheckCircle, Briefcase, Star, Search, ChevronRight, Settings } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

const categoryIcons: Record<string, string> = {
  cleaning: "🧹", moving: "📦", repairs: "🔧", errands: "🛍️",
  gardening: "🌿", painting: "🖌️", plumbing: "🚿", electrical: "⚡",
  nanny: "👶", elderly_care: "🧓", cat_sitting: "🐱", other: "✨",
};

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ProviderDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const allCategories = [
    "all", "cleaning", "moving", "repairs", "errands", "gardening",
    "painting", "plumbing", "electrical", "nanny", "elderly_care", "cat_sitting", "other",
  ];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (profileData?.role !== "provider") { router.push("/login"); return; }
      setProfile(profileData);

      const { data: open } = await supabase
        .from("tasks")
        .select("*, customer:profiles!customer_id(full_name, city)")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      const { data: mine } = await supabase
        .from("tasks").select("*").eq("provider_id", user.id).order("created_at", { ascending: false });

      setOpenTasks(open || []);
      setMyTasks(mine || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const completedCount = myTasks.filter((task) => task.status === "completed").length;
  const earnings = myTasks.filter((task) => task.status === "completed").reduce((sum, task) => sum + task.budget * 0.85, 0);

  const filteredOpen = openTasks.filter((task) => {
    const matchSearch = search === "" || task.title.toLowerCase().includes(search.toLowerCase()) || task.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || task.category === categoryFilter;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <span className="text-xl font-black text-blue-600">{t('appName')}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {profile && <NotificationBell userId={profile.id} />}
          <Link
            href="/provider/settings"
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50"
          >
            <Settings className="w-5 h-5" />
          </Link>
          {!profile?.is_verified && (
            <span className="hidden sm:block px-2.5 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">{t('pendingVerification')}</span>
          )}
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
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0]
              )}
            </div>
            <div>
              <p className="text-slate-300 text-sm font-medium">{t('providerDashboard')}</p>
              <h1 className="text-2xl font-black">
                {t('hello')}, {profile?.full_name?.split(" ")[0]} 👋
              </h1>
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
              ⏳ {t('pendingVerification')} — we&apos;ll notify you once approved
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Briefcase, label: t('activeTasks'), value: myTasks.filter(task => task.status === "assigned" || task.status === "in_progress").length, color: "text-blue-600" },
            { icon: CheckCircle, label: t('completed'), value: completedCount, color: "text-green-600" },
            { icon: Star, label: t('estEarnings'), value: `LKR ${Math.round(earnings / 1000)}k`, color: "text-amber-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-gray-400 text-xs mt-0.5 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Available tasks */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('availableInArea')}</h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchTasks')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  categoryFilter === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-gray-100 text-gray-500 hover:border-gray-200"
                }`}
              >
                {cat === "all" ? "All" : `${categoryIcons[cat] || "✨"} ${cat.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}`}
              </button>
            ))}
          </div>

          {filteredOpen.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 font-medium">{t('noOpenTasksArea')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOpen.map((task) => (
                <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{categoryIcons[task.category] || "✨"}</span>
                        <Link href={`/tasks/${task.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors truncate">
                          {task.title}
                        </Link>
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-2 ml-7">{task.description}</p>
                      <div className="ml-7 flex flex-wrap gap-2 text-xs text-gray-400">
                        <span>📍 {task.location}</span>
                        {task.scheduled_date && <span>📅 {new Date(task.scheduled_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-gray-900">LKR {task.budget.toLocaleString()}</div>
                      <div className="text-green-600 text-xs mt-0.5">~LKR {Math.round(task.budget * 0.85).toLocaleString()}</div>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="mt-3 inline-flex px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        {t('viewChat')}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t('myTasks')}</h2>
            {myTasks.length > 0 && (
              <Link href="/provider/tasks" className="text-blue-600 text-sm font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          {myTasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8 bg-white rounded-2xl border border-gray-100">{t('noTasksAccepted')}</p>
          ) : (
            <div className="space-y-3">
              {myTasks.slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="group flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{task.title}</div>
                    <div className="text-gray-400 text-xs mt-0.5 capitalize">{task.category.replace("_", " ")} · {task.location}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[task.status]}`}>
                      {task.status.replace("_", " ")}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
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
