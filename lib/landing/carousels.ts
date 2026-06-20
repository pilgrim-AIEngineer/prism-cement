import { db } from "@/lib/db";
import { brandLogoPublicUrl } from "@/lib/uploads/brandLogos";

export interface CarouselLogo {
  id: string;
  name: string;
  url: string;
}

export interface MaterialCarousel {
  id: string;
  name: string;
  logos: CarouselLogo[];
}

// Public read for the landing-page carousels: active categories that have at
// least one active logo, each with its active logos in display order.
// This is marketing data (not blinded), so it is queried directly — no serializer.
export async function getLandingCarousels(): Promise<MaterialCarousel[]> {
  const categories = await db.category.findMany({
    where: { active: true, brandLogos: { some: { active: true } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      brandLogos: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, storagePath: true },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    logos: category.brandLogos.map((logo) => ({
      id: logo.id,
      name: logo.name,
      url: brandLogoPublicUrl(logo.storagePath),
    })),
  }));
}
