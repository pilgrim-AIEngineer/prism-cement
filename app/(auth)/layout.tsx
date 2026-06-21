import Image from "next/image";

// Shared chrome for /(auth)/** — login + first-login profile completion.
// No session required to reach these routes.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand strip, hidden on small screens */}
      <div className="hidden w-[420px] shrink-0 flex-col justify-between bg-brand-bg p-10 lg:flex">
        <div>
          <Image
            src="/assets/logo_transparent.png"
            alt="BuildCityBulk"
            width={140}
            height={40}
            className="mb-16"
            priority
          />
          <h2 className="text-2xl font-semibold leading-snug text-brand-text">
            Bulk building materials
            <br />
            at the best price.
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-muted">
            Connect with verified suppliers, get competitive quotes, and have
            materials delivered to your site — fast.
          </p>
        </div>

        <p className="text-xs text-brand-muted/60">
          © {new Date().getFullYear()} BuildCityBulk
        </p>
      </div>

      {/* Right panel — auth forms */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        {/* Mobile-only logo */}
        <div className="mb-10 lg:hidden">
          <Image
            src="/assets/logo_transparent.png"
            alt="BuildCityBulk"
            width={120}
            height={34}
            priority
          />
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
