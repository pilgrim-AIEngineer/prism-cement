import { db } from "@/lib/db";

/**
 * Returns true when a vendor is fully operational in a category.
 *
 * Both conditions must hold — neither alone is sufficient:
 *   1. `user.status === "VERIFIED"` — the user's global account is active.
 *   2. `vendorCategory.verified === true` — admin has approved them for this
 *      specific category.
 *
 * This helper is called from multiple action files; centralised here to avoid
 * duplication (previously copied across bids.ts and requirements.ts).
 */
export async function isVendorOperationalInCategory(
  vendorId: string,
  categoryId: string,
): Promise<boolean> {
  const result = await db.vendorCategory.findUnique({
    where: { vendorId_categoryId: { vendorId, categoryId } },
    select: { verified: true, vendor: { select: { status: true } } },
  });
  return result?.verified === true && result.vendor.status === "VERIFIED";
}
