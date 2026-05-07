"use client";

import Link from "next/link";
import { CheckCircle, Star, Shield, Clock, ArrowRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const categories = [
  { name: "Cleaning", icon: "🧹", desc: "Deep clean, regular housekeeping" },
  { name: "Moving", icon: "📦", desc: "Help moving home or office" },
  { name: "Repairs", icon: "🔧", desc: "Fix anything around the house" },
  { name: "Errands", icon: "🛍️", desc: "Shopping, deliveries, queues" },
  { name: "Gardening", icon: "🌿", desc: "Lawn care & landscaping" },
  { name: "Painting", icon: "🖌️", desc: "Interior and exterior painting" },
  { name: "Plumbing", icon: "🚿", desc: "Leaks, installations, blockages" },
  { name: "Electrical", icon: "⚡", desc: "Wiring, fixtures, installations" },
  { name: "Nanny", icon: "👶", desc: "Childcare and babysitting" },
  { name: "Elderly Care", icon: "🧓", desc: "Companionship & assistance" },
  { name: "Cat Sitting", icon: "🐱", desc: "Pet care while you're away" },
];

export default function HomePage() {
  const { t } = useLanguage();

  const steps = [
    { step: "1", title: t('postTaskStep'), desc: t('postTaskStepDesc') },
    { step: "2", title: t('getMatchedStep'), desc: t('getMatchedStepDesc') },
    { step: "3", title: t('getDoneStep'), desc: t('getDoneStepDesc') },
  ];

  const trustItems = [
    { icon: Shield, title: t('verifiedProviders'), desc: t('verifiedProvidersDesc') },
    { icon: Star, title: t('ratedReviewed'), desc: t('ratedReviewedDesc') },
    { icon: CheckCircle, title: t('securePayments'), desc: t('securePaymentsDesc') },
    { icon: Clock, title: t('bookIn5'), desc: t('bookIn5Desc') },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-600">{t('appName')}</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="hidden sm:block px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors text-sm"
          >
            {t('logIn')}
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all text-sm shadow-sm hover:shadow-md"
          >
            {t('getStarted')}
          </Link>
        </div>
      </nav>

      {/* Hero — dark gradient */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden pt-20">
        {/* Decorative glows */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-800/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-sm font-medium mb-10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Now live in Colombo, Sri Lanka 🇱🇰
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 leading-[1.08] tracking-tight">
            {t('tagline')}<br />
            <span className="text-blue-400">{t('tagline2')}</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('subTagline')}
          </p>

          <div className="flex gap-4 justify-center flex-wrap mb-16">
            <Link
              href="/signup?role=customer"
              className="group px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-500 transition-all hover:scale-[1.03] shadow-2xl shadow-blue-600/40 flex items-center gap-2"
            >
              {t('iNeedService')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=provider"
              className="group px-8 py-4 border border-slate-600 text-slate-200 rounded-2xl font-bold text-lg hover:border-blue-400 hover:text-blue-300 transition-all flex items-center gap-2"
            >
              {t('iWantToEarn')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Stats row */}
          <div className="inline-flex gap-10 sm:gap-16 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            {[
              { value: "200+", label: "Verified Providers" },
              { value: "1,000+", label: "Tasks Completed" },
              { value: "4.8★", label: "Average Rating" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-white">{value}</div>
                <div className="text-slate-400 text-xs sm:text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-600 flex flex-col items-center gap-2">
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-blue-600 font-semibold text-sm mb-3 uppercase tracking-widest">{t('howItWorks')}</div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">{t('simpleFastReliable')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white text-2xl font-black flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                  {step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-6 py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-blue-600 font-semibold text-sm mb-3 uppercase tracking-widest">{t('services')}</div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">What do you need help with?</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/signup?role=customer&category=${cat.name.toLowerCase()}`}
                className="group flex flex-col items-center gap-3 p-6 bg-white rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{cat.name}</div>
                  <div className="text-gray-400 text-xs mt-1 leading-snug">{cat.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-blue-600 font-semibold text-sm mb-3 uppercase tracking-widest">{t('whyUs')}</div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">{t('whyHassleFree')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustItems.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group text-center p-6 rounded-3xl hover:bg-blue-50 transition-colors duration-300">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-blue-600 transition-colors duration-300">
                  <Icon className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — placeholder */}
      <section className="px-6 py-24 bg-gradient-to-br from-slate-950 to-blue-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-blue-400 font-semibold text-sm mb-3 uppercase tracking-widest">Testimonials</div>
          <h2 className="text-4xl font-black text-white mb-12">What people are saying</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { name: "Kamal P.", area: "Colombo 3", text: "Found a great cleaner within the hour. Absolutely amazing service!", stars: 5 },
              { name: "Nirmala S.", area: "Nugegoda", text: "As a provider, I get steady work. Best decision I made this year.", stars: 5 },
              { name: "Ranjith W.", area: "Dehiwala", text: "The electrician came the same day and fixed everything. Highly recommend.", stars: 5 },
            ].map(({ name, area, text, stars }) => (
              <div key={name} className="bg-white/5 border border-white/10 rounded-3xl p-6 text-left backdrop-blur-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">"{text}"</p>
                <div>
                  <div className="text-white font-semibold text-sm">{name}</div>
                  <div className="text-slate-500 text-xs">{area}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="px-6 py-24 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t('readyToStart')}</h2>
          <p className="text-blue-200 text-lg mb-10">{t('joinHundreds')}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup?role=customer"
              className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl"
            >
              {t('iNeedHelp')}
            </Link>
            <Link
              href="/signup?role=provider"
              className="px-8 py-4 border-2 border-white/40 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              {t('iWantToEarn')}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-bold text-blue-600">{t('appName')}</span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-900 transition-colors">{t('logIn')}</Link>
            <Link href="/signup" className="hover:text-gray-900 transition-colors">{t('signUp')}</Link>
          </div>
          <p className="text-gray-400 text-sm">© 2025 Hassle Free. Made for Sri Lanka 🇱🇰</p>
        </div>
      </footer>
    </div>
  );
}
