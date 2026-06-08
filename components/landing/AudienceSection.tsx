const BUILDER_FEATURES = [
  "Post category-wise requirements anonymously — no identity revealed to vendors",
  "Receive admin-curated vendor connections after competitive bidding",
  "Compare material options securely through admin brokerage",
  "Track project requirements and completion status end-to-end",
];

const VENDOR_FEATURES = [
  "Discover verified procurement opportunities in your approved categories",
  "Submit competitive bids on anonymised requirements",
  "Win admin-selected awards and expand your client base",
  "Build your reputation through a trusted, admin-verified marketplace",
];

function FeatureCard({
  title,
  features,
  accent,
}: {
  title: string;
  features: string[];
  accent: string;
}) {
  return (
    <div className="bg-brand-card rounded-2xl border border-brand-border p-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-brand-text">{title}</span>
        <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-brand-accent bg-brand-accent/10 rounded-full px-3 py-1">
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
    </div>
  );
}

export function AudienceSection() {
  return (
    <section className="bg-brand-bg py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text">
            Built for Builders and Vendors
          </h2>
          <p className="mt-3 text-brand-muted text-base sm:text-lg max-w-xl mx-auto">
            Whether you source materials or supply them, BuildCityBulk is designed to protect and serve you.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard title="For Builders" features={BUILDER_FEATURES} accent="Builder" />
          <FeatureCard title="For Vendors" features={VENDOR_FEATURES} accent="Vendor" />
        </div>
      </div>
    </section>
  );
}
