"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/server/actions/auth";

/* ─── Inline icons ────────────────────────────────────────────── */
function IcHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcUsersCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
function IcFileText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
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
function IcBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}
function IcMapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IcImage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
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

/* ─── Types ───────────────────────────────────────────────────── */
interface SidebarProps {
  adminPhone: string;
  pendingCount: number;
  openRequirementsCount: number;
  unreadNotifCount: number;
  onClose?: () => void;
}

/* ─── Component ───────────────────────────────────────────────── */
export function Sidebar({
  adminPhone,
  pendingCount,
  openRequirementsCount,
  unreadNotifCount,
  onClose,
}: SidebarProps) {
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
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: <IcHome />, exactMatch: true },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          href: "/admin/users",
          label: "Verification Queue",
          icon: <IcUsersCheck />,
          badge: pendingCount,
        },
        {
          href: "/admin/requirements",
          label: "Bid Review",
          icon: <IcGavel />,
          badge: openRequirementsCount,
        },
      ],
    },
    {
      label: "Configuration",
      items: [
        { href: "/admin/forms", label: "Form Templates", icon: <IcFileText /> },
        { href: "/admin/cities", label: "Launch Cities", icon: <IcMapPin /> },
        { href: "/admin/brands", label: "Brand Logos", icon: <IcImage /> },
        { href: "/admin/audit", label: "Audit Log", icon: <IcBook /> },
      ],
    },
    {
      label: "Inbox",
      items: [
        {
          href: "/admin/notifications",
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

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-stone-200/50 bg-white/80 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/80">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-200/50 px-5 dark:border-zinc-800/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-brand-accent-h text-white shadow-sm shadow-brand-accent/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-none text-stone-900 dark:text-zinc-100">
            BuildBid
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Admin Console
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-6">
          {navGroups.map((group) => (
            <li key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
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
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-brand-accent to-brand-accent-h text-white shadow-md shadow-brand-accent/20"
                            : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                        }`}
                      >
                        <span className="h-4 w-4 shrink-0">{item.icon}</span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {"badge" in item && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
                              isActive
                                ? "bg-white/25 text-white"
                                : "bg-brand-accent text-white"
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

      {/* Footer: admin profile + sign-out */}
      <div className="shrink-0 border-t border-stone-200/50 px-4 py-4 dark:border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-border bg-gradient-to-br from-brand-bg to-white dark:border-zinc-700/50 dark:from-zinc-800 dark:to-zinc-900 shadow-sm">
            <span className="text-xs font-bold text-brand-accent">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-stone-900 dark:text-zinc-100">
              Administrator
            </p>
            <p className="truncate text-[10px] text-stone-500 dark:text-zinc-400">
              {adminPhone}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isPending}
            title="Sign out"
            className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <IcLogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}
