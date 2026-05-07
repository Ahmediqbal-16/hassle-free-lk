"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle, Briefcase, CreditCard, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/types";
import { useLanguage } from "@/components/LanguageProvider";

const typeIcon: Record<string, React.ReactNode> = {
  task: <Briefcase className="w-4 h-4 text-blue-600" />,
  bid: <Info className="w-4 h-4 text-purple-600" />,
  success: <CheckCircle className="w-4 h-4 text-green-600" />,
  payment: <CreditCard className="w-4 h-4 text-emerald-600" />,
  info: <Info className="w-4 h-4 text-gray-500" />,
  warning: <Info className="w-4 h-4 text-amber-500" />,
};

const typeBg: Record<string, string> = {
  task: "bg-blue-50",
  bid: "bg-purple-50",
  success: "bg-green-50",
  payment: "bg-emerald-50",
  info: "bg-gray-50",
  warning: "bg-amber-50",
};

export default function NotificationBell({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchNotifications() {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-blue-600" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-900">{t('notifications')}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 font-medium hover:underline">
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">{t('noNotifications')}</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    markRead(notif.id);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? "bg-blue-50/40" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${typeBg[notif.type] || "bg-gray-50"}`}>
                    {typeIcon[notif.type] || typeIcon.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${!notif.read ? "text-gray-900" : "text-gray-600"}`}>
                      {notif.title}
                    </div>
                    {notif.body && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.body}</div>
                    )}
                    <div className="text-xs text-gray-300 mt-1">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {new Date(notif.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && notif_has_task_link(notifications) && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function notif_has_task_link(notifications: Notification[]) {
  return notifications.some((n) => n.task_id);
}
