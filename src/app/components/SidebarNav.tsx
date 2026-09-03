"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const pathname = usePathname();

  const sections = [
    {
      title: "Core Platform",
      links: [
        { href: "/", label: "Overview" },
        { href: "/payments", label: "Payments", badge: "Live" },
        { href: "/payment-links/new", label: "Create Payment Link", badge: "Live" },
        { href: "/customers", label: "Customers" },
        { href: "/products", label: "Products" },
        { href: "/orders", label: "Orders" },
      ]
    },
    {
      title: "Recoveries",
      links: [
        { href: "/recoveries", label: "Revenue at Risk" },
      ]
    },
    {
      title: "Intelligence",
      links: [
        { href: "/insights", label: "Insights Engine" },
        { href: "/insights/leaks", label: "Revenue Leaks" },
        { href: "/insights/memory", label: "Recovery Memory" },
        { href: "/recovery-lab", label: "Recovery Lab (A/B)" },
        { href: "/copilot", label: "Copilot" },
      ]
    },
    {
      title: "Configuration",
      links: [
        { href: "/settings/preferences", label: "Teach RazorRecovery" },
        { href: "/settings/incentives", label: "Incentives & Vouchers" },
        { href: "/settings/razorpay", label: "Razorpay Integration" },
      ]
    }
  ];

  return (
    <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto font-sans">
      {sections.map((sec) => (
        <div key={sec.title}>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-2">
            {sec.title}
          </div>
          <div className="space-y-1">
            {sec.links.map((link) => {
              // Routes that are prefixes of child routes must match exactly;
              // otherwise /insights would highlight when on /insights/leaks etc.
              const EXACT_MATCH_ROUTES = ["/insights", "/settings", "/recovery-lab"];
              const isActive = pathname === link.href ||
                (!EXACT_MATCH_ROUTES.includes(link.href) && link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-white shadow-2xs border border-zinc-700"
                      : "text-zinc-600 hover:text-black hover:bg-zinc-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-zinc-400"}`}></span>
                    <span>{link.label}</span>
                  </span>
                  {link.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive ? "bg-zinc-700 text-white border border-zinc-600" : "bg-zinc-100 text-black border border-zinc-300"
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
