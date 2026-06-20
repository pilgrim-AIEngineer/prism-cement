const STEPS = [
  {
    number: "01",
    title: "Tell us what you need",
    description:
      "Post your material requirements by category — type, grade, quantity. One project, every material, in one place.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Get competitive quotes",
    description:
      "Verified suppliers compete for your order and quote their best bulk price. You get the sharpest rate on the market — without the calls and haggling.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Get it delivered",
    description:
      "Lock in the best deal and we get your materials to site, fast. Less time chasing vendors, more time building — and bigger margins on every project.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-brand-bg py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            How it works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-brand-text">
            From requirement to delivery — in three steps
          </h2>
          <p className="mt-3 text-brand-muted text-base sm:text-lg max-w-xl mx-auto">
            Post once, let suppliers compete, and get the best bulk price delivered to your site.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* connecting progress line behind the step cards (desktop) */}
          <div
            className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-12 hidden h-px bg-gradient-to-r from-brand-border via-brand-accent/40 to-brand-border md:block"
            aria-hidden
          />

          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative bg-brand-card rounded-2xl border border-brand-border p-7 flex flex-col gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full bg-brand-accent text-white flex items-center justify-center shrink-0 ring-4 ring-brand-bg">
                  {step.icon}
                </div>
                <span className="text-3xl font-bold text-brand-border">{step.number}</span>
              </div>
              <h3 className="text-lg font-semibold text-brand-text">{step.title}</h3>
              <p className="text-sm text-brand-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm font-medium text-brand-muted">
          <svg className="h-4 w-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          More suppliers competing means a lower price on every order you place.
        </p>
      </div>
    </section>
  );
}
