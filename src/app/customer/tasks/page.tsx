"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Task } from "@/types";
import { ArrowLeft, PlusCircle, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import BottomNav from "@/components/BottomNav";

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const statusLabel: Record<string, string> = {
  open: "Waiting for provider",
  assigned: "Provider assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const filters = ["All", "open", "assigned", "in_progress", "completed", "cancelled"];

export default function CustomerTasksPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      setTasks(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = activeFilter === "All" ? tasks : tasks.filter(t => t.status === activeFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/customer/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-lg font-bold text-gray-900">{t('myTasks')}</span>
        </div>
        <Link
          href="/customer/post-task"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:block">{t('postTask')}</span>
          <span className="sm:hidden">Post</span>
        </Link>
      </header>

      {/* Filter pills */}
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
            {f === "All" ? "All" : f.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            {f === "All" ? ` (${tasks.length})` : ` (${tasks.filter(t => t.status === f).length})`}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 mb-6 font-medium">{t('noTasksYet')}</p>
            <Link
              href="/customer/post-task"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <PlusCircle className="w-4 h-4" /> {t('postTask')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-900 truncate">{task.title}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${statusColors[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">{task.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span className="capitalize">📂 {task.category.replace("_", " ")}</span>
                      <span>📍 {task.location}</span>
                      {task.scheduled_date && <span>📅 {new Date(task.scheduled_date).toLocaleDateString()}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{statusLabel[task.status]}</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="font-black text-gray-900">LKR {task.budget.toLocaleString()}</div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav role="customer" />
    </div>
  );
}
