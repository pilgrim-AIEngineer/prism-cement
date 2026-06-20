"use client";
import { useState } from "react";
import { VendorSidebar } from "./VendorSidebar";

interface VendorShellProps {
  children: React.ReactNode;
  vendorName: string | null;
  vendorPhone: string;
  unreadNotifCount: number;
}

export function VendorShell({ children, vendorName, vendorPhone, unreadNotifCount }: VendorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-stone-50/80 dark:bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-bg/50 via-stone-50/50 to-transparent dark:from-brand-accent/5 dark:via-zinc-950/50 dark:to-transparent" />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 cursor-default bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <VendorSidebar
          vendorName={vendorName}
          vendorPhone={vendorPhone}
          unreadNotifCount={unreadNotifCount}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200/50 bg-white/80 px-4 py-3 backdrop-blur-md md:hidden dark:border-zinc-800/50 dark:bg-zinc-950/80">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-stone-600 transition-colors hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-accent text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <rect width="16" height="20" x="4" y="2" rx="2" />
                <path d="M9 22v-4h6v4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-stone-900 dark:text-zinc-100">BuildBid</span>
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Vendor
            </span>
          </div>
        </div>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
