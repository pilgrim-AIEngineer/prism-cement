import Image from "next/image";

const BADGES = [
  {
    label: "Lower prices",
    description: "Bulk volume plus suppliers competing for your order drives the price down on every line item.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    label: "Faster supply",
    description: "Skip the calls and chasing. Materials are sourced and delivered to your site on your timeline.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    label: "Verified quality",
    description: "Every supplier is vetted and every brand is genuine — competitive pricing without cutting corners.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

export function TrustSection() {
  return (
    <section id="why-us" className="relative overflow-hidden py-24 px-4">
      {/* Real job-site photo behind a deep warm overlay — the page's
          authoritative, cinematic anchor. Text stays fully legible. */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/hero_background.png"
          alt=""
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-footer/95 via-brand-footer/88 to-brand-footer/96" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Why BuildCityBulk
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
          Cheaper. Faster. Reliable.
        </h2>
        <p className="mt-3 text-base sm:text-lg max-w-xl mx-auto text-white/60">
          The fastest, most cost-effective way to source building materials in bulk.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {BADGES.map((badge) => (
            <div key={badge.label} className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
                {badge.icon}
              </div>
              <p className="text-base font-semibold text-white">{badge.label}</p>
              <p className="text-sm text-white/55 leading-relaxed text-center max-w-[220px]">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
