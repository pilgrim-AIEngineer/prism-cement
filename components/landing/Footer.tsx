import Image from "next/image";

const LINK_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "For builders", href: "#for-builders" },
      { label: "For suppliers", href: "#for-vendors" },
      { label: "Why us", href: "#why-us" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-brand-footer text-white px-4 pt-16 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Image
                src="/assets/logo_transparent.png"
                alt="BuildCityBulk"
                width={32}
                height={32}
                className="object-contain"
              />
              <p className="text-lg font-bold tracking-tight">BuildCityBulk</p>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
              Bulk building materials at competitive prices, delivered fast.
              Verified suppliers compete for your order so you always get the
              best rate.
            </p>
          </div>

          {LINK_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                {col.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} BuildCityBulk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
