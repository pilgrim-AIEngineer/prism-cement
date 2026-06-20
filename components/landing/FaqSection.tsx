const FAQS = [
  {
    q: "How do you get me lower prices?",
    a: "Two ways. You're buying in bulk, which already commands better rates — and instead of one vendor's quote, multiple verified suppliers compete for your order. Competition pushes the price down, and you keep the difference.",
  },
  {
    q: "What materials can I source?",
    a: "All the major building-material categories — cement, steel, aggregates, blocks, and more — across the brands you already build with. Post one project and source everything in one place.",
  },
  {
    q: "How fast is delivery?",
    a: "Fast supply is the whole point. Once you lock a quote, we coordinate sourcing and get materials to your site quickly — so your timeline never waits on procurement.",
  },
  {
    q: "Does it cost anything to use?",
    a: "Getting quotes is free — post your requirement, compare competitive supplier prices, and only commit when the numbers work for you. No obligation to buy.",
  },
  {
    q: "Are the suppliers reliable?",
    a: "Every supplier on BuildCityBulk is vetted before they can quote, and we only list genuine brands. You get sharp pricing without gambling on quality or reliability.",
  },
];

export function FaqSection() {
  return (
    <section className="bg-brand-bg py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            FAQ
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-brand-text">
            Questions, answered
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-brand-border bg-brand-card px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-brand-text">
                {faq.q}
                <svg
                  className="h-5 w-5 shrink-0 text-brand-accent transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-brand-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
