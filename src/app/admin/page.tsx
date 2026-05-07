"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile, Booking, BankAccount, ServiceCategory, ServicePackage } from "@/types";
import { LogOut, CheckCircle, Users, CalendarDays, AlertTriangle, ArrowLeft, Phone, MapPin, Calendar, Settings2, Pencil, Save, X } from "lucide-react";

interface ProviderWithBank extends Profile {
  bank?: BankAccount;
}

interface ProviderUrls {
  nicFront?: string;
  nicBack?: string;
  passbook?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

type AdminTab = "bookings" | "services" | "providers";

export default function AdminPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderWithBank[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [categories, setCategories] = useState<(ServiceCategory & { packages: ServicePackage[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("bookings");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Provider detail
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithBank | null>(null);
  const [providerUrls, setProviderUrls] = useState<ProviderUrls>({});
  const [urlsLoading, setUrlsLoading] = useState(false);

  // Booking detail
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [assigningProvider, setAssigningProvider] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState("");

  // Service editing
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }

      const [{ data: prov }, { data: bookingData }, { data: bankData }, { data: catData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "provider").order("created_at", { ascending: false }),
        supabase.from("bookings")
          .select("*, package:service_packages(*, category:service_categories(*)), customer:profiles!customer_id(full_name, phone, city), provider:profiles!provider_id(full_name, phone)")
          .order("created_at", { ascending: false }),
        supabase.from("bank_accounts").select("*"),
        supabase.from("service_categories").select("*, packages:service_packages(*)").order("sort_order"),
      ]);

      const bankMap: Record<string, BankAccount> = {};
      (bankData || []).forEach((b: BankAccount) => { bankMap[b.provider_id] = b; });
      setProviders((prov || []).map((p: Profile) => ({ ...p, bank: bankMap[p.id] })));
      setBookings((bookingData as Booking[]) || []);
      setCategories((catData || []).map((c: ServiceCategory & { packages: ServicePackage[] }) => ({
        ...c,
        packages: (c.packages || []).sort((a: ServicePackage, b: ServicePackage) => a.sort_order - b.sort_order),
      })));
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
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_verified: true, is_rejected: false } : p));
    setSelectedProvider(null);
    setActionLoading(null);
  }

  async function rejectProvider(providerId: string) {
    setActionLoading(providerId);
    const supabase = createClient();
    await supabase.from("profiles").update({ is_verified: false, is_rejected: true }).eq("id", providerId);
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_verified: false, is_rejected: true } : p));
    setSelectedProvider(null);
    setActionLoading(null);
  }

  async function revokeProvider(providerId: string) {
    setActionLoading(providerId);
    const supabase = createClient();
    await supabase.from("profiles").update({ is_verified: false, is_rejected: false }).eq("id", providerId);
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_verified: false, is_rejected: false } : p));
    setSelectedProvider(null);
    setActionLoading(null);
  }

  async function assignProvider() {
    if (!selectedBooking || !selectedProviderId) return;
    setAssigningProvider(true);
    const supabase = createClient();
    await supabase.from("bookings")
      .update({ provider_id: selectedProviderId, status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", selectedBooking.id);
    const assignedProv = providers.find(p => p.id === selectedProviderId);
    setBookings(prev => prev.map(b => b.id === selectedBooking.id
      ? { ...b, provider_id: selectedProviderId, status: "confirmed", provider: assignedProv as Profile }
      : b
    ));
    setSelectedBooking(null);
    setSelectedProviderId("");
    setAssigningProvider(false);
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    setActionLoading(bookingId);
    const supabase = createClient();
    await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", bookingId);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: status as Booking["status"] } : b));
    if (selectedBooking?.id === bookingId) setSelectedBooking(prev => prev ? { ...prev, status: status as Booking["status"] } : prev);
    setActionLoading(null);
  }

  async function savePackage(pkgId: string) {
    setActionLoading(pkgId);
    const supabase = createClient();
    await supabase.from("service_packages")
      .update({ name: editName, price: parseInt(editPrice) })
      .eq("id", pkgId);
    setCategories(prev => prev.map(cat => ({
      ...cat,
      packages: cat.packages.map(pkg =>
        pkg.id === pkgId ? { ...pkg, name: editName, price: parseInt(editPrice) } : pkg
      ),
    })));
    setEditingPackage(null);
    setActionLoading(null);
  }

  async function togglePackage(pkgId: string, isActive: boolean) {
    const supabase = createClient();
    await supabase.from("service_packages").update({ is_active: !isActive }).eq("id", pkgId);
    setCategories(prev => prev.map(cat => ({
      ...cat,
      packages: cat.packages.map(pkg => pkg.id === pkgId ? { ...pkg, is_active: !isActive } : pkg),
    })));
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

  const pendingProviders = providers.filter(p => !p.is_verified && !p.is_rejected);
  const verifiedProviders = providers.filter(p => p.is_verified);
  const rejectedProviders = providers.filter(p => p.is_rejected);
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "in_progress");

  // ── PROVIDER DETAIL ─────────────────────────────────────────────────────
  if (selectedProvider) {
    const prov = selectedProvider;
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setSelectedProvider(null)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-gray-900">Provider Details</span>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${prov.is_verified ? "bg-green-100 text-green-700" : prov.is_rejected ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
            {prov.is_verified ? "Verified" : prov.is_rejected ? "Rejected" : "Pending"}
          </span>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
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
                {prov.city && <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5"><MapPin className="w-3.5 h-3.5" /> {prov.city}</div>}
                {prov.phone && <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5"><Phone className="w-3.5 h-3.5" /> {prov.phone}</div>}
                {prov.email && <div className="text-gray-400 text-sm mt-0.5">{prov.email}</div>}
                <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
                  <Calendar className="w-3 h-3" /> Joined {new Date(prov.created_at).toLocaleDateString("en-LK", { dateStyle: "medium" })}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {prov.is_verified ? (
                <button onClick={() => revokeProvider(prov.id)} disabled={actionLoading === prov.id}
                  className="flex-1 py-3 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors disabled:opacity-60 text-sm">
                  {actionLoading === prov.id ? "…" : "Revoke Verification"}
                </button>
              ) : (
                <>
                  <button onClick={() => approveProvider(prov.id)} disabled={actionLoading === prov.id}
                    className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-60">
                    {actionLoading === prov.id ? "…" : "✓ Approve"}
                  </button>
                  <button onClick={() => rejectProvider(prov.id)} disabled={actionLoading === prov.id}
                    className="flex-1 py-3 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors disabled:opacity-60">
                    {actionLoading === prov.id ? "…" : "Reject"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">NIC Verification</h2>
            {prov.nic_number && <p className="text-sm text-gray-500 mb-4 font-mono">NIC: {prov.nic_number}</p>}
            {!prov.nic_submitted ? (
              <div className="text-center py-8 text-gray-400"><div className="text-3xl mb-2">📋</div><p className="text-sm font-medium">NIC not submitted yet</p></div>
            ) : urlsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /> Loading documents…
              </div>
            ) : (
              <div className="flex gap-4 flex-wrap">
                {providerUrls.nicFront && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Front</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={providerUrls.nicFront} alt="NIC front" className="w-56 h-36 object-cover rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90" onClick={() => window.open(providerUrls.nicFront, "_blank")} />
                  </div>
                )}
                {providerUrls.nicBack && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Back</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={providerUrls.nicBack} alt="NIC back" className="w-56 h-36 object-cover rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90" onClick={() => window.open(providerUrls.nicBack, "_blank")} />
                  </div>
                )}
                {!providerUrls.nicFront && !providerUrls.nicBack && <p className="text-sm text-gray-400">NIC submitted but no images uploaded.</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Bank Account</h2>
            {!prov.bank ? (
              <div className="text-center py-8 text-gray-400"><div className="text-3xl mb-2">🏦</div><p className="text-sm font-medium">No bank account added yet</p></div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs font-semibold text-gray-400 mb-0.5">Bank</p><p className="font-semibold text-gray-900">{prov.bank.bank_name}</p></div>
                  <div><p className="text-xs font-semibold text-gray-400 mb-0.5">Account Holder</p><p className="font-semibold text-gray-900">{prov.bank.account_name}</p></div>
                  <div><p className="text-xs font-semibold text-gray-400 mb-0.5">Account Number</p><p className="font-mono font-semibold text-gray-900">{prov.bank.account_number}</p></div>
                  {prov.bank.branch && <div><p className="text-xs font-semibold text-gray-400 mb-0.5">Branch</p><p className="font-semibold text-gray-900">{prov.bank.branch}</p></div>}
                </div>
                {urlsLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /> Loading passbook…
                  </div>
                ) : providerUrls.passbook ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Passbook / Statement</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={providerUrls.passbook} alt="Passbook" className="w-full max-w-sm h-44 object-cover rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90" onClick={() => window.open(providerUrls.passbook, "_blank")} />
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

  // ── BOOKING DETAIL ───────────────────────────────────────────────────────
  if (selectedBooking) {
    const bk = selectedBooking;
    const bookingCustomer = bk.customer as Profile | undefined;
    const bookingProvider = bk.provider as Profile | undefined;
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setSelectedBooking(null)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-gray-900">Booking Detail</span>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[bk.status]}`}>
            {bk.status.replace("_", " ")}
          </span>
        </header>
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Service */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">{bk.package?.category?.icon || "🔧"}</span>
              <div>
                <div className="text-gray-400 text-sm">{bk.package?.category?.name}</div>
                <div className="font-black text-xl text-gray-900">{bk.package?.name}</div>
                <div className="text-blue-600 font-bold">LKR {bk.package?.price.toLocaleString()}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {new Date(bk.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "full" })}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {bk.scheduled_time}</div>
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> {bk.area && `${bk.area} — `}{bk.address}</div>
              <div>💳 {bk.payment_method === "cash" ? "Cash on day" : "Online payment"}</div>
            </div>
            {bk.notes && <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500"><span className="font-semibold text-gray-700">Notes: </span>{bk.notes}</div>}
          </div>

          {/* Customer */}
          {bookingCustomer && (
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">
                  {bookingCustomer.full_name?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{bookingCustomer.full_name}</div>
                  {bookingCustomer.phone && <div className="text-sm text-gray-400">{bookingCustomer.phone}</div>}
                  {bookingCustomer.city && <div className="text-xs text-gray-400">{bookingCustomer.city}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Assign provider */}
          {(bk.status === "pending" || bk.status === "confirmed") && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <p className="font-bold text-gray-900 mb-3">
                {bookingProvider ? "Reassign Provider" : "Assign Provider"}
              </p>
              {bookingProvider && (
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Currently: {bookingProvider.full_name}
                </div>
              )}
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mb-3"
              >
                <option value="">Select a verified provider</option>
                {verifiedProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} {p.city ? `— ${p.city}` : ""}</option>
                ))}
              </select>
              <button
                onClick={assignProvider}
                disabled={!selectedProviderId || assigningProvider}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {assigningProvider ? "Assigning…" : bookingProvider ? "Reassign Provider" : "Assign & Confirm"}
              </button>
            </div>
          )}

          {/* Status actions */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-3">
            <p className="font-bold text-gray-900">Update Status</p>
            {bk.status !== "completed" && bk.status !== "cancelled" && (
              <>
                {bk.status !== "in_progress" && (
                  <button onClick={() => updateBookingStatus(bk.id, "in_progress")} disabled={actionLoading === bk.id}
                    className="w-full py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-60">
                    {actionLoading === bk.id ? "…" : "Mark In Progress"}
                  </button>
                )}
                <button onClick={() => updateBookingStatus(bk.id, "completed")} disabled={actionLoading === bk.id}
                  className="w-full py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-60">
                  {actionLoading === bk.id ? "…" : "Mark Completed"}
                </button>
                <button onClick={() => updateBookingStatus(bk.id, "cancelled")} disabled={actionLoading === bk.id}
                  className="w-full py-3 border border-red-200 text-red-500 rounded-2xl font-semibold hover:bg-red-50 transition-colors disabled:opacity-60 text-sm">
                  Cancel Booking
                </button>
              </>
            )}
            {(bk.status === "completed" || bk.status === "cancelled") && (
              <div className="text-center py-4 text-gray-400 text-sm capitalize">{bk.status}</div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── MAIN ADMIN VIEW ──────────────────────────────────────────────────────
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
            { icon: CalendarDays, label: "Pending Bookings", value: pendingBookings.length, color: "text-amber-600", bg: "bg-amber-50" },
            { icon: CalendarDays, label: "Active Jobs", value: activeBookings.length, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: Users, label: "Total Providers", value: providers.length, color: "text-gray-900", bg: "bg-gray-50" },
            { icon: AlertTriangle, label: "Pending Approval", value: pendingProviders.length, color: "text-red-500", bg: "bg-red-50" },
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

        {pendingBookings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-amber-800 font-medium text-sm">
              {pendingBookings.length} booking{pendingBookings.length > 1 ? "s" : ""} waiting for provider assignment
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { key: "bookings", label: `Bookings (${bookings.length})`, icon: CalendarDays },
            { key: "services", label: "Services", icon: Settings2 },
            { key: "providers", label: `Providers (${providers.length})`, icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                activeTab === key ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-100 text-gray-500 hover:border-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── BOOKINGS TAB ────────────────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div className="space-y-3">
            {bookings.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">No bookings yet.</div>
            )}
            {bookings.map((booking) => {
              const cust = booking.customer as Profile | undefined;
              const prov = booking.provider as Profile | undefined;
              return (
                <button
                  key={booking.id}
                  onClick={() => { setSelectedBooking(booking); setSelectedProviderId(booking.provider_id || ""); }}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0 mt-0.5">{booking.package?.category?.icon || "🔧"}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{booking.package?.name}</div>
                        <div className="text-sm text-gray-500">{booking.package?.category?.name}</div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                          <span>📅 {new Date(booking.scheduled_date).toLocaleDateString("en-LK", { dateStyle: "medium" })}</span>
                          {booking.area && <span>📍 {booking.area}</span>}
                          {cust && <span>👤 {cust.full_name}</span>}
                          {prov && <span className="text-green-600">🔧 {prov.full_name}</span>}
                          {!prov && booking.status === "pending" && <span className="text-amber-600 font-medium">⚠ Needs provider</span>}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[booking.status]}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <div className="font-black text-gray-900">LKR {booking.package?.price.toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── SERVICES TAB ────────────────────────────────────────────────── */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400">Edit service names and prices below. Changes take effect immediately for new bookings.</p>
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-black text-gray-900">{cat.name}</h3>
                  <span className="ml-auto text-xs text-gray-400">{cat.packages.filter(p => p.is_active).length} active packages</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {cat.packages.map((pkg) => (
                    <div key={pkg.id} className={`px-6 py-4 ${!pkg.is_active ? "opacity-50" : ""}`}>
                      {editingPackage === pkg.id ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-2">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Package name"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 font-medium">LKR</span>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Price"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => savePackage(pkg.id)} disabled={actionLoading === pkg.id}
                              className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingPackage(null)}
                              className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold text-gray-900">{pkg.name}</div>
                            {pkg.description && <div className="text-xs text-gray-400 mt-0.5">{pkg.description}</div>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-black text-gray-900">LKR {pkg.price.toLocaleString()}</div>
                            </div>
                            <button
                              onClick={() => { setEditingPackage(pkg.id); setEditName(pkg.name); setEditPrice(pkg.price.toString()); }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => togglePackage(pkg.id, pkg.is_active)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                pkg.is_active
                                  ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                              }`}
                            >
                              {pkg.is_active ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PROVIDERS TAB ────────────────────────────────────────────────── */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            {pendingProviders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-amber-600 mb-3 uppercase tracking-wider">Pending Approval ({pendingProviders.length})</h3>
                <div className="space-y-2">
                  {pendingProviders.map((prov) => (
                    <button key={prov.id} onClick={() => openProvider(prov)}
                      className="w-full bg-white rounded-2xl border border-amber-200 p-4 shadow-sm hover:border-amber-400 hover:shadow-md transition-all text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 overflow-hidden flex items-center justify-center text-amber-700 font-black text-lg shrink-0">
                          {prov.avatar_url ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" /> : prov.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{prov.full_name}</div>
                          <div className="text-xs text-gray-400">{prov.phone || prov.email} · {prov.city}</div>
                          <div className="flex gap-3 mt-1">
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
                <h3 className="text-sm font-bold text-green-600 mb-3 uppercase tracking-wider">Verified ({verifiedProviders.length})</h3>
                <div className="space-y-2">
                  {verifiedProviders.map((prov) => (
                    <button key={prov.id} onClick={() => openProvider(prov)}
                      className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-green-100 overflow-hidden flex items-center justify-center text-green-700 font-bold shrink-0">
                          {prov.avatar_url ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" /> : prov.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">{prov.full_name}</span>
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          </div>
                          <div className="text-xs text-gray-400">{prov.city}</div>
                        </div>
                        <div className="text-xs text-gray-400">View →</div>
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
                    <button key={prov.id} onClick={() => openProvider(prov)}
                      className="w-full bg-white rounded-2xl border border-red-100 p-4 shadow-sm hover:border-red-200 transition-all text-left opacity-70">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 overflow-hidden flex items-center justify-center text-red-400 font-bold shrink-0">
                          {prov.avatar_url ? <img src={prov.avatar_url} alt="" className="w-full h-full object-cover" /> : prov.full_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-600">{prov.full_name}</span>
                          <div className="text-xs text-gray-400">{prov.city}</div>
                        </div>
                        <span className="text-xs text-red-400">Rejected</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {providers.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">No providers yet.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
