interface CtaSectionProps {
  onLoginClick: () => void;
}

export function CtaSection({ onLoginClick }: CtaSectionProps) {
  return (
    <section className="bg-brand-card px-4 py-24">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-brand-border bg-brand-accent px-8 py-14 text-center shadow-xl sm:px-14">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to cut your material costs?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Post your requirement in minutes, get competitive bulk quotes from
          verified suppliers, and have it delivered to site. Free to start — no
          obligation to buy.
        </p>
        <button
          onClick={onLoginClick}
          className="mt-9 inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-bold text-brand-accent shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-bg"
        >
          Get bulk quotes
        </button>
      </div>
    </section>
  );
}
