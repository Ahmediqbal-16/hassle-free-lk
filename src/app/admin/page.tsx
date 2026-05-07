"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, Task, BankAccount, Payment } from "@/types";
import { LogOut, CheckCircle, Users, ClipboardList, AlertTriangle, ArrowLeft, CreditCard, Phone, MapPin, Calendar } from "lucide-react";

interface ProviderWithBank extends Profile {
  bank?: BankAccount;
}

interface ProviderUrls {
  nicFront?: string;
  nicBack?: string;
  passbook?: string;
}

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  paid: "bg-blue-100 text-blue-700",
  payout_pending: "bg-amber-100 text-amber-700",
  payout_sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
};

export default function AdminPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderWithBank[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"providers" | "tasks" | "payouts">("providers");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithBank | null>(null);
  const [providerUrls, setProviderUrls] = useState<ProviderUrls>({});
  const [urlsLoading, setUrlsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }

      const [{ data: prov }, { data: taskData }, { data: paymentData }, { data: bankData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "provider").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("payments").select("*, task:tasks(title), provider:profiles!provider_id(full_name,email), customer:profiles!customer_id(full_name)").order("created_at", { ascending: false }),
        supabase.from("bank_accounts").select("*"),
      ]);

      const bankMap: Record<string, BankAccount> = {};
      (bankData || []).forEach((b: BankAccount) => { bankMap[b.provider_id] = b; });

      setProviders((prov || []).map((p: Profile) => ({ ...p, bank: bankMap[p.id] })));
      setTasks(taskData || []);
      setPayments((paymentData as Payment[]) || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function openProvider(prov: ProviderWithBank) {
    setSelectedProvider(prov);
    setProviderUrls({});
    setUrlsLoading(true);
    const supabase = createClient();
    const urls: ProviderUrls = {};

    await Promise.all([
      prov.nic_front_path
        ? supabase.storage.from("nic-documents").createSignedUrl(prov.nic_front_path, 3600)
            .then(({ data }) => { if (data) urls.nicFront = data.signedUrl; })
        : Promise.resolve(),
      prov.nic_back_path
        ? supabase.storage.from("nic-documents").createSignedUrl(prov.nic_back_path, 3600)
            .then(({ data }) => { if (data) urls.nicBack = data.signedUrl; })
        : Promise.resolve(),
      prov.bank?.passbook_photo_path
        ? supabase.storage.from("bank-documents").createSignedUrl(prov.bank.passbook_photo_path, 3600)
            .then(({ data }) => { if (data) urls.passbook = data.signedUrl; })
        : Promise.resolve(),
    ]);

    setProviderUrls(urls);
    setUrlsLoading(false);
  }

  async function approveProvider(providerId: string) {
    setActionLoading(providerId);
    const supabase = createClient();
    await supabase.from("profiles").update({ is_verified: true, is_rejected: false }).eq("id", providerId);
    setProviders((prev) => prev.map((p) => p.id === providerId ? { ...p, is_verified: true, is_rejected: false } : p));
    setSelectedProvider(null);
    setActionLoading(null);
  }

  async function rejectProvider(providerId: string) {
    setActionLoading(providerId);
    const supabase = createClient();
    await supabase.from("profiles").update({ is_verified: false, is_rejected: true }).eq("id", providerId);
    setProviders((prev) => prev.map((p) => p.id === providerId ? { ...p, is_verified: false, is_rejected: true } : p));
    setSelectedProvider(null);
    setActionLoading(null);
  }

  async function revokeProvider(providerId: string) {
    setActionLoading(providerId);
    const supabase = createClient();
    await supabase.from("profiles").update({ is_verified: false, is_rejected: false }).eq("id", providerId);
    setProviders((prev) => prev.map((p) => p.id === providerId ? { ...p, is_verified: false, is_rejected: false } : p));
    setSelectedProvider(null);
    setActionLoading(null);
  }

  async function markPayoutSent(paymentId: string) {
    setActionLoading(paymentId);
    const supabase = createClient();
    await supabase.from("payments").update({ status: "payout_sent", updated_at: new Date().toISOString() }).eq("id", paymentId);
    setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status: "payout_sent" } : p));
    setActionLoading(null);
  }

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

  const pendingProviders = providers.filter((p) => !p.is_verified && !p.is_rejected);
  const verifiedProviders = providers.filter((p) => p.is_verified);
  const rejectedProviders = providers.filter((p) => p.is_rejected);
  const unverifiedProviders = pendingProviders; // alias for stat card
  const openTasks = tasks.filter((t) => t.status === "open");
  const pendingPayouts = payments.filter((p) => p.status === "payout_pending");

  // ── PROVIDER DETAIL VIEW ────────────────────────────────────────────────
  if (selectedProvider) {
    const prov = selectedProvider;
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <button
            onClick={() => setSelectedProvider(null)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-gray-900">Provider Details</span>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${prov.is_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {prov.is_verified ? "Verified" : "Pending"}
          </span>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center text-3xl font-black text-gray-500 shrink-0">
                {prov.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" />
                  : prov.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-gray-900 truncate">{prov.full_name}</h1>
                  {prov.is_verified && <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />}
                </div>
                {prov.city && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
                    <MapPin className="w-3.5 h-3.5" /> {prov.city}
                  </div>
                )}
                {prov.phone && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
                    <Phone className="w-3.5 h-3.5" /> {prov.phone}
                  </div>
                )}
                {prov.email && <div className="text-gray-400 text-sm mt-0.5">{prov.email}</div>}
                <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(prov.created_at).toLocaleDateString("en-LK", { dateStyle: "medium" })}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {prov.is_verified ? (
                <button
                  onClick={() => revokeProvider(prov.id)}
                  disabled={actionLoading === prov.id}
                  className="flex-1 py-3 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors disabled:opacity-60 text-sm"
                >
                  {actionLoading === prov.id ? "…" : "Revoke Verification"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => approveProvider(prov.id)}
                    disabled={actionLoading === prov.id}
                    className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {actionLoading === prov.id ? "…" : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => rejectProvider(prov.id)}
                    disabled={actionLoading === prov.id}
                    className="flex-1 py-3 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {actionLoading === prov.id ? "…" : "Reject"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* NIC Documents */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">NIC Verification</h2>
            {prov.nic_number && (
              <p className="text-sm text-gray-500 mb-4 font-mono">NIC: {prov.nic_number}</p>
            )}
            {!prov.nic_submitted ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-medium">NIC not submitted yet</p>
              </div>
            ) : urlsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                Loading documents…
              </div>
            ) : (
              <div className="space-y-4">
                {providerUrls.nicFront || providerUrls.nicBack ? (
                  <div className="flex gap-4 flex-wrap">
                    {providerUrls.nicFront && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Front</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={providerUrls.nicFront}
                          alt="NIC front"
                          className="w-56 h-36 object-cover rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(providerUrls.nicFront, "_blank")}
                        />
                      </div>
                    )}
                    {providerUrls.nicBack && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Back</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={providerUrls.nicBack}
                          alt="NIC back"
                          className="w-56 h-36 object-cover rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(providerUrls.nicBack, "_blank")}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">NIC submitted but no images uploaded.</p>
                )}
              </div>
            )}
          </div>

          {/* Bank Account */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Bank Account</h2>
            {!prov.bank ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">🏦</div>
                <p className="text-sm font-medium">No bank account added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-0.5">Bank</p>
                    <p className="font-semibold text-gray-900">{prov.bank.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-0.5">Account Holder</p>
                    <p className="font-semibold text-gray-900">{prov.bank.account_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-0.5">Account Number</p>
                    <p className="font-mono font-semibold text-gray-900">{prov.bank.account_number}</p>
                  </div>
                  {prov.bank.branch && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-0.5">Branch</p>
                      <p className="font-semibold text-gray-900">{prov.bank.branch}</p>
                    </div>
                  )}
                </div>

                {/* Passbook photo */}
                {urlsLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Loading passbook…
                  </div>
                ) : providerUrls.passbook ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Passbook / Statement</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={providerUrls.passbook}
                      alt="Passbook"
                      className="w-full max-w-sm h-44 object-cover rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(providerUrls.passbook, "_blank")}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No passbook photo uploaded.</p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── MAIN ADMIN VIEW ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-blue-600">Hassle Free</span>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Admin</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Total Providers", value: providers.length, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: AlertTriangle, label: "Pending Approval", value: unverifiedProviders.length, color: "text-amber-600", bg: "bg-amber-50" },
            { icon: ClipboardList, label: "Open Tasks", value: openTasks.length, color: "text-gray-900", bg: "bg-gray-50" },
            { icon: CreditCard, label: "Pending Payouts", value: pendingPayouts.length, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-gray-400 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {unverifiedProviders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-amber-800 font-medium text-sm">
              {unverifiedProviders.length} provider{unverifiedProviders.length > 1 ? "s" : ""} waiting for approval
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { key: "providers", label: `Providers (${providers.length})` },
            { key: "tasks", label: `Tasks (${tasks.length})` },
            { key: "payouts", label: `Payouts (${payments.length})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                activeTab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-gray-100 text-gray-500 hover:border-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── PROVIDERS TAB ─────────────────────────────────────────────── */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            {unverifiedProviders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-amber-600 mb-3 uppercase tracking-wider">Pending Approval</h3>
                <div className="space-y-2">
                  {unverifiedProviders.map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() => openProvider(prov)}
                      className="w-full bg-white rounded-2xl border border-amber-200 p-4 shadow-sm hover:border-amber-400 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 overflow-hidden flex items-center justify-center text-amber-700 font-black text-lg shrink-0">
                          {prov.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" />
                            : prov.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{prov.full_name}</div>
                          <div className="text-xs text-gray-400">{prov.phone || prov.email} · {prov.city}</div>
                          <div className="flex items-center gap-3 mt-1">
                            {prov.nic_submitted && <span className="text-xs text-blue-600 font-medium">📋 NIC submitted</span>}
                            {prov.bank && <span className="text-xs text-green-600 font-medium">🏦 Bank added</span>}
                          </div>
                        </div>
                        <div className="text-xs text-amber-600 font-semibold shrink-0">Review →</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {verifiedProviders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-green-600 mb-3 uppercase tracking-wider">Verified Providers</h3>
                <div className="space-y-2">
                  {verifiedProviders.map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() => openProvider(prov)}
                      className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-green-100 overflow-hidden flex items-center justify-center text-green-700 font-bold shrink-0">
                          {prov.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" />
                            : prov.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">{prov.full_name}</span>
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          </div>
                          <div className="text-xs text-gray-400">{prov.city}</div>
                        </div>
                        <div className="text-xs text-gray-400 shrink-0">View →</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rejectedProviders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-red-500 mb-3 uppercase tracking-wider">Rejected ({rejectedProviders.length})</h3>
                <div className="space-y-2">
                  {rejectedProviders.map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() => openProvider(prov)}
                      className="w-full bg-white rounded-2xl border border-red-100 p-4 shadow-sm hover:border-red-200 transition-all text-left opacity-70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 overflow-hidden flex items-center justify-center text-red-400 font-bold shrink-0">
                          {prov.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" />
                            : prov.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-600 truncate">{prov.full_name}</span>
                          <div className="text-xs text-gray-400">{prov.city}</div>
                        </div>
                        <span className="text-xs text-red-400 shrink-0">Rejected</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {providers.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">
                No providers yet.
              </div>
            )}
          </div>
        )}

        {/* ── TASKS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-bold text-gray-900 hover:text-blue-600 transition-colors truncate"
                      >
                        {task.title}
                      </Link>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span className="capitalize">📂 {task.category.replace("_", " ")}</span>
                      <span>📍 {task.location}</span>
                      <span>🕐 {new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="shrink-0 font-black text-gray-900">LKR {task.budget.toLocaleString()}</div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">No tasks yet.</div>
            )}
          </div>
        )}

        {/* ── PAYOUTS TAB ───────────────────────────────────────────────── */}
        {activeTab === "payouts" && (
          <div className="space-y-4">
            {pendingPayouts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-amber-600 mb-3 uppercase tracking-wider">Pending Payouts</h3>
                <div className="space-y-3">
                  {pendingPayouts.map((payment) => {
                    const provProfile = providers.find((p) => p.id === payment.provider_id);
                    return (
                      <div key={payment.id} className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900">
                              {(payment.provider as unknown as Profile)?.full_name || provProfile?.full_name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {(payment.provider as unknown as Profile)?.email || provProfile?.email}
                            </div>
                            {(payment.task as unknown as Task)?.title && (
                              <div className="text-sm text-gray-500 mt-1">
                                Task: {(payment.task as unknown as Task).title}
                              </div>
                            )}
                            {provProfile?.bank && (
                              <div className="mt-2 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-0.5">
                                <div className="font-semibold">🏦 {provProfile.bank.bank_name}</div>
                                <div>{provProfile.bank.account_name}</div>
                                <div className="font-mono">{provProfile.bank.account_number}</div>
                                {provProfile.bank.branch && <div>Branch: {provProfile.bank.branch}</div>}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-2xl font-black text-gray-900">LKR {payment.provider_amount.toLocaleString()}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Provider receives</div>
                            <button
                              onClick={() => markPayoutSent(payment.id)}
                              disabled={actionLoading === payment.id}
                              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                            >
                              {actionLoading === payment.id ? "…" : "Mark Sent"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">All Payments</h3>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {(payment.task as unknown as Task)?.title || `Payment #${payment.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {(payment.provider as unknown as Profile)?.full_name} · {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${paymentStatusColors[payment.status] || "bg-gray-100 text-gray-500"}`}>
                        {payment.status.replace("_", " ")}
                      </span>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">LKR {payment.amount.toLocaleString()}</div>
                        <div className="text-xs text-green-600">Provider: {payment.provider_amount.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">No payments yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
