const BUILDER_FEATURES = [
  "Competitive bulk pricing on every material category — suppliers compete, you save",
  "One platform for your whole project — stop juggling a dozen vendors",
  "Fast delivery to your site, on your timeline",
  "Verified suppliers and genuine brands only — quality you can build on",
];

const VENDOR_FEATURES = [
  "A steady stream of high-volume bulk orders from serious builders",
  "Grow your sales without cold calls, marketing spend, or chasing leads",
  "Quote on orders that match your categories and capacity",
  "Real, ready-to-buy demand — not browsers wasting your time",
];

function FeatureCard({
  id,
  title,
  features,
  accent,
  cta,
  onLoginClick,
}: {
  id: string;
  title: string;
  features: string[];
  accent: string;
  cta: string;
  onLoginClick: () => void;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 bg-brand-card rounded-2xl border border-brand-border p-8 flex flex-col gap-6"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-brand-text">{title}</span>
        <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-brand-accent bg-brand-accent-soft rounded-full px-3 py-1">
          {accent}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-brand-muted leading-relaxed">
            <svg
              className="w-5 h-5 text-brand-accent shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onLoginClick}
        className="mt-auto inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-brand-accent px-5 py-2.5 text-sm font-semibold text-brand-accent transition-colors hover:bg-brand-accent hover:text-white"
      >
        {cta}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  );
}

export function AudienceSection({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <section className="bg-brand-card py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Two sides, one platform
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-brand-text">
            More profit for both sides
          </h2>
          <p className="mt-3 text-brand-muted text-base sm:text-lg max-w-xl mx-auto">
            Builders cut costs. Suppliers win volume. BuildCityBulk makes both happen — fast.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard
            id="for-builders"
            title="For Builders"
            features={BUILDER_FEATURES}
            accent="Builder"
            cta="Get bulk quotes"
            onLoginClick={onLoginClick}
          />
          <FeatureCard
            id="for-vendors"
            title="For Suppliers"
            features={VENDOR_FEATURES}
            accent="Supplier"
            cta="Start selling"
            onLoginClick={onLoginClick}
          />
        </div>
      </div>
    </section>
  );
}
