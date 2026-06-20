import { LandingShell } from "@/components/landing/LandingShell";
import { getLandingCarousels } from "@/lib/landing/carousels";

// Render per request so admin-managed logo changes reflect for every visitor
// without a stale static cache (and to avoid build-time DB coupling).
export const dynamic = "force-dynamic";

export default async function Home() {
  const carousels = await getLandingCarousels();
  return <LandingShell carousels={carousels} />;
}
