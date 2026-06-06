// Role-scoped shell for /(admin)/** — ADMIN-only session gate and admin nav land here.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
