"use client";

import Image from "next/image";
import type { MaterialCarousel } from "@/lib/landing/carousels";

// One auto-scrolling marquee row per material category. The logo list is
// rendered twice back-to-back and translated -50%, so the loop is seamless.
// Hover pauses the animation (see `.animate-marquee` in globals.css).
function CarouselRow({ carousel }: { carousel: MaterialCarousel }) {
  // Duplicate the tiles so the -50% translate lands on an identical frame.
  const tiles = [...carousel.logos, ...carousel.logos];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
        {carousel.name}
      </h3>
      <div className="group relative overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0f1115] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0f1115] to-transparent" />

        <ul className="flex w-max animate-marquee gap-5 group-hover:[animation-play-state:paused]">
          {tiles.map((logo, index) => (
            <li
              key={`${logo.id}-${index}`}
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/95 p-3 shadow-lg sm:h-28 sm:w-28"
            >
              <Image
                src={logo.url}
                alt={logo.name}
                width={96}
                height={96}
                className="h-full w-full object-contain"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MaterialCarouselsSection({ carousels }: { carousels: MaterialCarousel[] }) {
  if (carousels.length === 0) return null;

  return (
    <section className="bg-[#0f1115] px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Brands across every material
          </h2>
          <p className="mt-3 text-base text-gray-400">
            Trusted names our verified vendors supply, organised by material type.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          {carousels.map((carousel) => (
            <CarouselRow key={carousel.id} carousel={carousel} />
          ))}
        </div>
      </div>
    </section>
  );
}
