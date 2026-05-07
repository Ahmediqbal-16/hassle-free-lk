"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarPlus, ClipboardList, Briefcase } from "lucide-react";

interface BottomNavProps {
  role: "customer" | "provider";
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const links =
    role === "customer"
      ? [
          { href: "/customer/dashboard", icon: Home, label: "Home" },
          { href: "/customer/post-task", icon: CalendarPlus, label: "Book" },
          { href: "/customer/tasks", icon: ClipboardList, label: "Bookings" },
        ]
      : [
          { href: "/provider/dashboard", icon: Home, label: "Home" },
          { href: "/provider/tasks", icon: Briefcase, label: "My Jobs" },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 sm:hidden">
      <div className="flex">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
