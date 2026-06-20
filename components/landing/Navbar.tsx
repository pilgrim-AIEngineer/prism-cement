import Image from "next/image";
import { CONTACT } from "@/lib/landing/contact";

interface NavbarProps {
  onLoginClick: () => void;
}

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For builders", href: "#for-builders" },
  { label: "For suppliers", href: "#for-vendors" },
  { label: "Why us", href: "#why-us" },
];

export function Navbar({ onLoginClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-brand-bg/90 backdrop-blur-sm border-b border-brand-border">
      <div className="bg-brand-footer text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-1.5 text-xs font-medium sm:justify-end">
          <a
            href={CONTACT.phoneHref}
            className="inline-flex items-center gap-1.5 text-white/80 transition-colors hover:text-brand-accent"
          >
            <span aria-hidden>📞</span>
            {CONTACT.phone}
          </a>
          <a
            href={CONTACT.emailHref}
            className="inline-flex items-center gap-1.5 text-white/80 transition-colors hover:text-brand-accent"
          >
            <span aria-hidden>✉️</span>
            {CONTACT.email}
          </a>
        </div>
      </div>
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <Image
            src="/assets/logo_transparent.png"
            alt="BuildCityBulk"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="text-xl font-bold text-brand-text tracking-tight">
            BuildCityBulk
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-accent"
            >
              {link.label}
            </a>
          ))}
        </div>

        <button
          onClick={onLoginClick}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent-h transition-colors"
        >
          Login
        </button>
      </nav>
    </header>
  );
}
