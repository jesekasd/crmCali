"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Dumbbell, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Alumnos", icon: Users },
  { href: "/workouts", label: "Rutinas", icon: Dumbbell },
  { href: "/progress", label: "Progreso", icon: BarChart3 },
  { href: "/payments", label: "Pagos", icon: CreditCard }
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
