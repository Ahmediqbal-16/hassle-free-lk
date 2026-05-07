"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, ClipboardList, Search } from "lucide-react";

interface BottomNavProps {
  role: "customer" | "provider";
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const links =
    role === "customer"
      ? [
          { href: "/customer/dashboard", icon: Home, label: "Home" },
          { href: "/customer/post-task", icon: PlusCircle, label: "Post Task" },
          { href: "/customer/tasks", icon: ClipboardList, label: "My Tasks" },
        ]
      : [
          { href: "/provider/dashboard", icon: Home, label: "Home" },
          { href: "/provider/dashboard", icon: Search, label: "Browse" },
          { href: "/provider/tasks", icon: ClipboardList, label: "My Tasks" },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 sm:hidden safe-bottom">
      <div className="flex">
        {links.map(({ href, icon: Icon, label }, i) => {
          const isActive = pathname === href && !(role === "provider" && i === 1 && pathname !== "/provider/dashboard");
          return (
            <Link
              key={`${href}-${i}`}
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
