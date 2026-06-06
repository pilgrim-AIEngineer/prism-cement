// Shared chrome for /(auth)/** — login + first-login profile completion.
// No session required to reach these routes.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      {children}
    </div>
  );
}
