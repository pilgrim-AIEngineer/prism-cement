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
          className="object-cover object-center"
          priority
        />
        {/* Refined matte polish overlay - slightly lighter center, darker edges */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#0f1115]/90"></div>
      </div>

      <div className="relative z-10 max-w-5xl w-full text-center flex flex-col items-center">
        {/* Logo - Floating in a soft frosted glass placeholder */}
        <div className="mb-10 bg-white/80 backdrop-blur-2xl p-5 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/60 transform transition-all hover:scale-105 hover:shadow-[0_15px_50px_rgba(0,0,0,0.6)] hover:bg-white/90 duration-500">
          <Image
            src="/assets/logo_transparent.png"
            alt="Prism Logo"
            width={160}
            height={160}
            className="object-contain drop-shadow-sm"
          />
        </div>

        {/* Eyebrow with sleek glassmorphism and glow */}
        <div className="mb-8 relative inline-flex group cursor-default">
          <div className="absolute transition-all duration-1000 opacity-50 -inset-px bg-gradient-to-r from-brand-accent via-orange-500 to-brand-accent rounded-full blur-md group-hover:opacity-80 group-hover:-inset-1 animate-pulse"></div>
          <span className="relative inline-flex items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-white bg-black/70 backdrop-blur-xl rounded-full px-6 py-2.5 border border-white/10">
            <span className="text-brand-accent mr-2">✦</span>
            Verified Vendors · Seamless Connection
            <span className="text-brand-accent ml-2">✦</span>
          </span>
        </div>

        {/* Headline with Smooth 3D Gradient Effect */}
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400">
            Procure Building<br />
            Materials in
          </span>{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ff8c42] via-brand-accent to-[#cc5200]">
            Bulk
          </span>
        </h1>

        {/* Subheadline - Improved legibility */}
        <p className="mt-2 text-xl sm:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed font-normal drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          The ultimate platform connecting builders to verified vendors. <br className="hidden sm:block" />
          Simplify your bulk procurement process efficiently.
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
          <button
            onClick={onLoginClick}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-10 py-4 text-lg font-bold text-white bg-brand-accent overflow-hidden transition-all shadow-[0_0_30px_rgba(230,90,30,0.3)] hover:shadow-[0_0_50px_rgba(230,90,30,0.5)] hover:-translate-y-1"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative">Get Started Free</span>
          </button>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-10 py-4 text-lg font-bold border border-white/20 text-white bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/40 transition-all shadow-xl hover:-translate-y-1"
          >
            See how it works
          </a>
        </div>

        {/* Social proof hint */}
        <div className="mt-16 flex items-center justify-center gap-4 opacity-80">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/30"></div>
          <p className="text-sm sm:text-base text-gray-300 font-medium tracking-widest uppercase">
            Trusted across India
          </p>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/30"></div>
        </div>
      </div>
    </section>
  );
}
