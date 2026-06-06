// Role-scoped shell for /(vendor)/** — session + VERIFIED + category gate and vendor nav land here.
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
