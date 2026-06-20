import Image from "next/image";

interface HeroSectionProps {
  onLoginClick: () => void;
}

const PROOF_POINTS = [
  "Competitive bulk pricing",
  "Fast site delivery",
  "Verified suppliers",
];

export function HeroSection({ onLoginClick }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-brand-bg px-4 py-20 sm:py-28">
      {/* Construction job-site backdrop. The photo renders at full strength;
          a single left-heavy gradient keeps the copy crisp while letting the
          job-site stay visible on the right, behind the quote card. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/assets/hero_background.png"
          alt=""
          fill
          priority
          className="object-cover object-right"
        />
        {/* protect the copy (left) → reveal the photo (right) */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-bg via-brand-bg/88 to-brand-bg/45" />
        {/* gentle bottom/top blend into the cream section */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/70 via-transparent to-brand-bg/55" />
        {/* warm accent glow */}
        <div className="absolute inset-0 bg-[radial-gradient(55rem_38rem_at_90%_0%,rgba(200,90,42,0.16),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — copy */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-card px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
            Bulk materials · Best prices · Fast supply
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-brand-text sm:text-5xl lg:text-6xl">
            Stop overpaying for{" "}
            <span className="text-brand-accent">building materials.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-brand-muted lg:mx-0">
            BuildCityBulk gets you competitive bulk quotes from verified
            suppliers and delivers straight to your site — fast. Lower costs on
            every order, more margin on every project.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <button
              onClick={onLoginClick}
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand-accent px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-accent/20 transition-all hover:-translate-y-0.5 hover:bg-brand-accent-h sm:w-auto"
            >
              Get bulk quotes
            </button>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-xl border border-brand-border bg-brand-card px-8 py-3.5 text-base font-bold text-brand-text transition-colors hover:border-brand-accent hover:text-brand-accent sm:w-auto"
            >
              See how it works
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
            {PROOF_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-sm font-medium text-brand-muted"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-brand-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — "suppliers compete, you save" quote card */}
        <QuoteCard />
      </div>
    </section>
  );
}

/**
 * Sales visual: a sample requirement with competing supplier quotes and the
 * lowest price highlighted — shows the core value (competition drives your
 * cost down) at a glance.
 */
function QuoteCard() {
  const quotes = [
    { name: "Supplier A", price: "₹3xx", best: false },
    { name: "Supplier B", price: "₹3xx", best: false },
    { name: "Supplier C", price: "₹2xx", best: true },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-brand-border bg-brand-card p-6 shadow-[0_24px_60px_-20px_rgba(45,18,8,0.35)] sm:p-8">
        {/* requirement header */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Your requirement
            </p>
            <p className="mt-0.5 text-sm font-bold text-brand-text">
              Cement · OPC 53 · 500 bags
            </p>
          </div>
          <span className="rounded-full bg-brand-accent-soft px-3 py-1 text-xs font-semibold text-brand-accent">
            3 quotes
          </span>
        </div>

        {/* competing quotes */}
        <ul className="mt-4 flex flex-col gap-2.5">
          {quotes.map((q) => (
            <li
              key={q.name}
              className={`flex items-center justify-between rounded-xl border p-3.5 ${
                q.best
                  ? "border-brand-accent bg-brand-accent/5"
                  : "border-brand-border bg-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-brand-text">{q.name}</span>
                {q.best && (
                  <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Best price
                  </span>
                )}
              </div>
              <span
                className={`text-sm font-bold ${
                  q.best ? "text-brand-accent" : "text-brand-muted"
                }`}
              >
                {q.price}
                <span className="text-xs font-normal">/bag</span>
              </span>
            </li>
          ))}
        </ul>

        {/* delivery line */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-bg px-4 py-3 text-sm font-medium text-brand-text">
          <svg className="h-5 w-5 shrink-0 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          Lowest bulk price, delivered to your site fast.
        </div>
      </div>

      {/* floating savings chip */}
      <div className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-full bg-brand-text px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        You save more
      </div>
    </div>
  );
}
