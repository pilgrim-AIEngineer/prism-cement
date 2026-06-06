// Role-scoped shell for /(builder)/** — session + VERIFIED gate and builder nav land here.
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
