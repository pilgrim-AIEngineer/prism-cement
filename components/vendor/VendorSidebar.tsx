"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/server/actions/auth";

function IcHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcClipboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
function IcGavel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="m14.5 12.5-8 8a2.119 2.119 0 0 1-3-3l8-8" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </svg>
  );
}
function IcLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}
function IcBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
function IcLogOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

interface VendorSidebarProps {
  vendorName: string | null;
  vendorPhone: string;
  unreadNotifCount: number;
  onClose?: () => void;
}

export function VendorSidebar({ vendorName, vendorPhone, unreadNotifCount, onClose }: VendorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  type NavItem = {
    href: string;
    label: string;
    icon: React.ReactNode;
    exactMatch?: boolean;
    badge?: number;
  };

  const navGroups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: "Workspace",
      items: [
        { href: "/vendor", label: "Dashboard", icon: <IcHome />, exactMatch: true },
        { href: "/vendor/feed", label: "Requirements", icon: <IcClipboard /> },
        { href: "/vendor/bids", label: "My Bids", icon: <IcGavel /> },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/vendor/categories", label: "Categories", icon: <IcLayers /> },
        {
          href: "/vendor/notifications",
          label: "Notifications",
          icon: <IcBell />,
          badge: unreadNotifCount,
        },
      ],
    },
  ];

  function handleSignOut() {
    startTransition(async () => {
      const result = await logout();
      if (result.ok) router.push(result.data.redirectTo);
    });
  }

  const initials = vendorName
    ? vendorName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "V";

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 px-5 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-white shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-none text-zinc-900 dark:text-zinc-100">BuildBid</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Vendor Portal
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-6">
          {navGroups.map((group) => (
            <li key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.exactMatch
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-brand-accent text-white shadow-sm"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
                        }`}
                      >
                        <span className="h-4 w-4 shrink-0">{item.icon}</span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {"badge" in item && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
                              isActive ? "bg-white/25 text-white" : "bg-brand-accent text-white"
                            }`}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer: vendor profile + sign-out */}
      <div className="shrink-0 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-bg dark:border-zinc-700 dark:bg-zinc-800">
            <span className="text-xs font-bold text-brand-accent">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {vendorName ?? "Vendor"}
            </p>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{vendorPhone}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isPending}
            title="Sign out"
            className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <IcLogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}
