import Image from "next/image";

interface HeroSectionProps {
  onLoginClick: () => void;
}

export function HeroSection({ onLoginClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-24 overflow-hidden">
      {/* Background Image with Matte Polish (Overlay) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/hero_background.png"
          alt="Building materials background"
          fill
          className="object-cover"
          priority
        />
        {/* Matte polish overlay */}
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[4px]"></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 drop-shadow-2xl transform transition-transform hover:scale-105 duration-500">
          <Image
            src="/assets/logo.png"
            alt="Prism Logo"
            width={160}
            height={160}
            className="mx-auto object-contain"
          />
        </div>

        {/* Eyebrow */}
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-accent bg-black/40 backdrop-blur-md rounded-full px-5 py-2 mb-6 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          Verified Vendors · Seamless Connection
        </span>

        {/* Headline */}
        <h1 
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-4"
          style={{ 
            textShadow: "1px 1px 0 #222, 2px 2px 0 #222, 3px 3px 0 #222, 4px 4px 0 #222, 5px 5px 0 #222, 6px 6px 15px rgba(0,0,0,0.8)" 
          }}
        >
          Procure Building<br />
          Materials in <span className="text-brand-accent">Bulk</span>
        </h1>

        {/* Subheadline */}
        <p 
          className="mt-6 text-xl sm:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed font-medium"
          style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.9)" }}
        >
          The ultimate platform connecting builders to verified vendors. Simplify your bulk procurement process efficiently.
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
          <button
            onClick={onLoginClick}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-10 py-4 text-lg font-bold bg-brand-accent text-white hover:bg-brand-accent-h transition-all shadow-[0_0_20px_rgba(var(--brand-accent),0.4)] hover:shadow-[0_0_30px_rgba(var(--brand-accent),0.7)] transform hover:-translate-y-1"
          >
            Get Started Free
          </button>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-10 py-4 text-lg font-bold border-2 border-white/20 text-white bg-black/20 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 transition-all shadow-xl"
          >
            See how it works
          </a>
        </div>

        {/* Social proof hint */}
        <p className="mt-10 text-sm sm:text-base text-gray-300 font-medium tracking-wide" style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.8)" }}>
          Trusted by builders and vendors across India
        </p>
      </div>
    </section>
  );
}
