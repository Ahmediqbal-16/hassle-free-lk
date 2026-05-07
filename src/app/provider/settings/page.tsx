"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, BankAccount } from "@/types";
import { ArrowLeft, Camera, CheckCircle, Upload, Building2, CreditCard } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import BottomNav from "@/components/BottomNav";

type Tab = "photo" | "nic" | "bank";

const SRI_LANKA_BANKS = [
  "Bank of Ceylon", "People's Bank", "Commercial Bank", "Hatton National Bank",
  "Sampath Bank", "Seylan Bank", "Nations Trust Bank", "DFCC Bank",
  "Union Bank", "Pan Asia Bank", "Amana Bank", "MCB Bank",
  "National Development Bank", "Cargills Bank", "Sanasa Development Bank",
];

export default function ProviderSettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const nicFrontRef = useRef<HTMLInputElement>(null);
  const nicBackRef = useRef<HTMLInputElement>(null);
  const bankPhotoRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("photo");

  // Photo
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");

  // NIC
  const [nicNumber, setNicNumber] = useState("");
  const [nicFrontFile, setNicFrontFile] = useState<File | null>(null);
  const [nicBackFile, setNicBackFile] = useState<File | null>(null);
  const [nicFrontPreview, setNicFrontPreview] = useState("");
  const [nicBackPreview, setNicBackPreview] = useState("");
  const [nicSubmitting, setNicSubmitting] = useState(false);
  const [nicMsg, setNicMsg] = useState("");

  // Bank
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [bankPhotoFile, setBankPhotoFile] = useState<File | null>(null);
  const [bankPhotoPreview, setBankPhotoPreview] = useState("");
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileData?.role !== "provider") { router.push("/"); return; }
      setProfile(profileData);
      setNicNumber(profileData.nic_number || "");

      const { data: bankData } = await supabase.from("bank_accounts").select("*").eq("provider_id", user.id).single();
      if (bankData) {
        setBankAccount(bankData);
        setBankName(bankData.bank_name);
        setAccountName(bankData.account_name);
        setAccountNumber(bankData.account_number);
        setBranch(bankData.branch || "");
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setPhotoUploading(true);
    setPhotoMsg("");
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setPhotoMsg("Upload failed: " + uploadError.message); setPhotoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const cacheBusted = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: cacheBusted }).eq("id", profile.id);
    setProfile({ ...profile, avatar_url: cacheBusted });
    setPhotoMsg(t('photoUpdated'));
    setPhotoUploading(false);
  }

  async function handleNicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !nicNumber) return;
    setNicSubmitting(true);
    setNicMsg("");
    const supabase = createClient();
    let frontPath = profile.nic_front_path || "";
    let backPath = profile.nic_back_path || "";

    if (nicFrontFile) {
      const ext = nicFrontFile.name.split(".").pop();
      const path = `${profile.id}/front.${ext}`;
      await supabase.storage.from("nic-documents").upload(path, nicFrontFile, { upsert: true });
      frontPath = path;
    }
    if (nicBackFile) {
      const ext = nicBackFile.name.split(".").pop();
      const path = `${profile.id}/back.${ext}`;
      await supabase.storage.from("nic-documents").upload(path, nicBackFile, { upsert: true });
      backPath = path;
    }

    await supabase.from("profiles").update({
      nic_number: nicNumber,
      nic_front_path: frontPath,
      nic_back_path: backPath,
      nic_submitted: true,
      is_verified: false,
    }).eq("id", profile.id);

    setProfile({ ...profile, nic_number: nicNumber, nic_front_path: frontPath, nic_back_path: backPath, nic_submitted: true });
    setNicMsg(t('nicSubmitted'));
    setNicSubmitting(false);
  }

  async function handleBankSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBankSaving(true);
    setBankMsg("");
    const supabase = createClient();

    let passbookPhotoPath = bankAccount?.passbook_photo_path || "";
    if (bankPhotoFile) {
      const ext = bankPhotoFile.name.split(".").pop();
      const path = `${profile.id}/passbook.${ext}`;
      await supabase.storage.from("bank-documents").upload(path, bankPhotoFile, { upsert: true });
      passbookPhotoPath = path;
    }

    const payload = {
      provider_id: profile.id,
      bank_name: bankName,
      account_name: accountName,
      account_number: accountNumber,
      branch,
      passbook_photo_path: passbookPhotoPath || null,
      updated_at: new Date().toISOString(),
    };
    if (bankAccount) {
      await supabase.from("bank_accounts").update(payload).eq("id", bankAccount.id);
    } else {
      const { data } = await supabase.from("bank_accounts").insert(payload).select().single();
      if (data) setBankAccount(data);
    }
    setBankMsg(t('bankSaved'));
    setBankSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { key: "photo", label: t('profilePhoto'), icon: <Camera className="w-4 h-4" /> },
    { key: "nic", label: t('nicVerification'), icon: <CheckCircle className="w-4 h-4" />, badge: !profile?.nic_submitted },
    { key: "bank", label: t('bankAccount'), icon: <Building2 className="w-4 h-4" />, badge: !bankAccount },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
        <Link href="/provider/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-lg font-bold text-gray-900">{t('settings')}</span>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Tab pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(({ key, label, icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all relative ${
                activeTab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-gray-100 text-gray-600 hover:border-gray-200"
              }`}
            >
              {icon} {label}
              {badge && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          ))}
        </div>

        {/* Profile Photo Tab */}
        {activeTab === "photo" && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-5xl font-black text-blue-700 mx-auto overflow-hidden">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name[0]
                )}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div>
              <div className="font-bold text-gray-900 text-xl">{profile?.full_name}</div>
              <div className="text-gray-400 text-sm mt-1">{profile?.city}</div>
            </div>

            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {photoUploading ? (
                <><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> {t('uploadingPhoto')}</>
              ) : (
                <><Upload className="w-4 h-4" /> {t('changePhoto')}</>
              )}
            </button>

            {photoMsg && (
              <div className="bg-green-50 border border-green-100 text-green-700 rounded-2xl px-4 py-3 text-sm font-medium">
                ✓ {photoMsg}
              </div>
            )}
          </div>
        )}

        {/* NIC Verification Tab */}
        {activeTab === "nic" && (
          <form onSubmit={handleNicSubmit} className="space-y-4">
            {profile?.is_verified ? (
              <div className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center shadow-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-800 mb-2">{t('nicApproved')}</h2>
                <p className="text-green-600 text-sm">Your identity has been verified. You can now receive tasks.</p>
              </div>
            ) : profile?.nic_submitted ? (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center shadow-sm">
                <div className="text-4xl mb-3">⏳</div>
                <h2 className="text-lg font-bold text-amber-800">{t('nicSubmitted')}</h2>
                <p className="text-amber-600 text-sm mt-1">Our team will review your NIC within 24 hours.</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">!</span>
                </div>
                <p className="text-blue-700 text-sm font-medium">{t('nicHint')}</p>
              </div>
            )}

            {!profile?.is_verified && (
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nicNumber')}</label>
                  <input
                    type="text"
                    value={nicNumber}
                    onChange={(e) => setNicNumber(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 font-mono"
                    placeholder="199012345678 or 901234567V"
                  />
                </div>

                {/* NIC Front */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nicFront')}</label>
                  <div
                    onClick={() => nicFrontRef.current?.click()}
                    className="w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden"
                  >
                    {nicFrontPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nicFrontPreview} alt="" className="w-full h-full object-cover" />
                    ) : profile?.nic_front_path ? (
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                        <span className="text-sm text-green-600 font-medium">Photo uploaded</span>
                        <p className="text-xs text-gray-400">Click to replace</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-500 font-medium">Click to upload front</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={nicFrontRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setNicFrontFile(f); setNicFrontPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </div>

                {/* NIC Back */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nicBack')}</label>
                  <div
                    onClick={() => nicBackRef.current?.click()}
                    className="w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden"
                  >
                    {nicBackPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nicBackPreview} alt="" className="w-full h-full object-cover" />
                    ) : profile?.nic_back_path ? (
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                        <span className="text-sm text-green-600 font-medium">Photo uploaded</span>
                        <p className="text-xs text-gray-400">Click to replace</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-500 font-medium">Click to upload back</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={nicBackRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setNicBackFile(f); setNicBackPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </div>

                {nicMsg && (
                  <div className="bg-green-50 border border-green-100 text-green-700 rounded-2xl px-4 py-3 text-sm font-medium">
                    ✓ {nicMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={nicSubmitting || !nicNumber}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-lg shadow-blue-200"
                >
                  {nicSubmitting ? "Submitting…" : t('submitNic')}
                </button>
              </div>
            )}
          </form>
        )}

        {/* Bank Account Tab */}
        {activeTab === "bank" && (
          <form onSubmit={handleBankSave} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{t('bankAccount')}</h2>
                <p className="text-gray-400 text-xs">Your earnings will be transferred here</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('bankName')}</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
              >
                <option value="">Select your bank</option>
                {SRI_LANKA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('accountHolderName')}</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                placeholder="Name exactly as on bank account"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('accountNumber')}</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 font-mono"
                placeholder="0000 0000 0000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('branch')}</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                placeholder="e.g. Colombo 3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Passbook / Bank Statement Photo</label>
              <p className="text-xs text-gray-400 mb-2">Upload a photo showing your name and account number</p>
              <div
                onClick={() => bankPhotoRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden"
              >
                {bankPhotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bankPhotoPreview} alt="" className="w-full h-full object-cover" />
                ) : bankAccount?.passbook_photo_path ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                    <span className="text-sm text-green-600 font-medium">Photo uploaded</span>
                    <p className="text-xs text-gray-400">Click to replace</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">Click to upload</span>
                    <span className="text-xs text-gray-400">Passbook or bank statement</span>
                  </>
                )}
              </div>
              <input
                ref={bankPhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setBankPhotoFile(f); setBankPhotoPreview(URL.createObjectURL(f)); }
                }}
              />
            </div>

            {bankMsg && (
              <div className="bg-green-50 border border-green-100 text-green-700 rounded-2xl px-4 py-3 text-sm font-medium">
                ✓ {bankMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={bankSaving}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-lg shadow-blue-200"
            >
              {bankSaving ? "Saving…" : t('saveBankDetails')}
            </button>
          </form>
        )}
      </main>
      <BottomNav role="provider" />
    </div>
  );
}
