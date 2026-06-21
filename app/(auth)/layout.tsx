import Image from "next/image";

// Shared chrome for /(auth)/** — login + first-login profile completion.
// No session required to reach these routes.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Left panel — brand strip, hidden on small screens */}
      <div className="relative hidden w-[460px] shrink-0 flex-col justify-between overflow-hidden bg-brand-text p-12 lg:flex">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-brand-accent/20 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-brand-accent/10 blur-[80px]"
        />

        <div className="relative z-10">
          <Image
            src="/assets/logo_transparent.png"
            alt="BuildCityBulk"
            width={150}
            height={42}
            className="mb-14 brightness-0 invert"
            priority
          />
          <h2 className="text-3xl font-bold leading-snug text-white">
            Bulk building materials
            <br />
            <span className="text-brand-accent">at the best price.</span>
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Connect with verified suppliers, get competitive quotes, and have
            materials delivered to your site — fast.
          </p>

          {/* Trust badges */}
          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: "shield", text: "Verified supplier network" },
              { icon: "bolt", text: "Fast site delivery" },
              { icon: "chart", text: "Competitive bulk pricing" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent/15">
                  <svg
                    className="h-4 w-4 text-brand-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    {item.icon === "shield" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    )}
                    {item.icon === "bolt" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    )}
                    {item.icon === "chart" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                      />
                    )}
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/75">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">
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
            width={130}
            height={37}
            priority
          />
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
