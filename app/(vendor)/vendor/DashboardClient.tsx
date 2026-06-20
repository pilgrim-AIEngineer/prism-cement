"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";
import { 
  Briefcase, 
  CheckCircle, 
  ChevronRight, 
  Clock, 
  FileText, 
  Bell,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type DashboardClientProps = {
  userStatus: any;
  companyName: string;
  approvedCount: number;
  openReqsCount: number;
  activeBidsCount: number;
  isOperational: boolean;
  isBlocked: boolean;
  recentOpportunities: any[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export function DashboardClient({
  userStatus,
  companyName,
  approvedCount,
  openReqsCount,
  activeBidsCount,
  isOperational,
  isBlocked,
  recentOpportunities,
}: DashboardClientProps) {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto w-full">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 sm:p-12 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {companyName}
          </h1>
          <p className="mt-3 text-indigo-100 max-w-2xl text-lg">
            {isOperational 
              ? "Here's what's happening with your bids and opportunities today."
              : "Complete your profile verification to start bidding on opportunities."}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <AccountStatusBanner status={userStatus} />
      </motion.div>

      {!isBlocked && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-8"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatCard
              label="Approved Categories"
              value={approvedCount}
              hint={approvedCount === 0 ? "Request categories" : "Active categories"}
              icon={<CheckCircle className="h-6 w-6 text-emerald-500" />}
              gradient="from-emerald-500/10 to-teal-500/5"
            />
            <StatCard
              label="Open Requirements"
              value={openReqsCount}
              hint={!isOperational ? "Unlocks when verified" : "Available to bid"}
              icon={<Briefcase className="h-6 w-6 text-indigo-500" />}
              gradient="from-indigo-500/10 to-violet-500/5"
            />
            <StatCard
              label="Active Bids"
              value={activeBidsCount}
              hint={!isOperational ? "Unlocks when verified" : "Awaiting selection"}
              icon={<Activity className="h-6 w-6 text-amber-500" />}
              gradient="from-amber-500/10 to-orange-500/5"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickLink
                  href="/vendor/feed"
                  title="Browse Requirements"
                  description={
                    isOperational
                      ? `${openReqsCount} open in your categories`
                      : "Verify account to view"
                  }
                  icon={<Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
                />
                <QuickLink
                  href="/vendor/bids"
                  title="My Bids"
                  description={
                    activeBidsCount > 0
                      ? `${activeBidsCount} active bid${activeBidsCount === 1 ? "" : "s"}`
                      : "Track all your bids here"
                  }
                  icon={<FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                />
                <QuickLink
                  href="/vendor/categories"
                  title="Categories"
                  description={
                    approvedCount > 0
                      ? `${approvedCount} approved`
                      : "Request categories to start"
                  }
                  icon={<CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
                />
                <QuickLink
                  href="/vendor/notifications"
                  title="Notifications"
                  description="Updates on bids & account"
                  icon={<Bell className="h-6 w-6 text-rose-600 dark:text-rose-400" />}
                />
              </div>
            </div>

            {/* Recent Opportunities */}
            {isOperational && (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  Recent Opportunities
                </h2>
                <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden shadow-sm">
                  {recentOpportunities.length > 0 ? (
                    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                      {recentOpportunities.map((req) => (
                        <Link 
                          key={req.id} 
                          href={`/vendor/feed/${req.anonCode}`}
                          className="group p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                              {req.category?.name || "General"}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {req.anonCode}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                            View details <ChevronRight className="h-3 w-3" />
                          </p>
                        </Link>
                      ))}
                      <Link 
                        href="/vendor/feed"
                        className="p-3 text-center text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                      >
                        View all open requirements
                      </Link>
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-500">
                      <Briefcase className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm">No recent opportunities</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  hint, 
  icon,
  gradient 
}: { 
  label: string; 
  value: number; 
  hint?: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${gradient} rounded-bl-full -mr-10 -mt-10 opacity-50`}></div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-3 text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {value}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
          {icon}
        </div>
      </div>
      {hint && (
        <p className="relative z-10 mt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
      >
        <div className="flex-shrink-0 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
            {title}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300 transition-all group-hover:text-indigo-500 group-hover:translate-x-1 dark:text-zinc-600" />
      </Link>
    </motion.div>
  );
}
