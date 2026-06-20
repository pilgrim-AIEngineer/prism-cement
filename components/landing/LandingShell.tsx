"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { MaterialCarouselsSection } from "./MaterialCarouselsSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { AudienceSection } from "./AudienceSection";
import { TrustSection } from "./TrustSection";
import { Footer } from "./Footer";
import { LoginModal } from "./LoginModal";
import type { MaterialCarousel } from "@/lib/landing/carousels";

export function LandingShell({ carousels }: { carousels: MaterialCarousel[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const open = () => setIsModalOpen(true);
  const close = () => setIsModalOpen(false);

  return (
    <>
      <Navbar onLoginClick={open} />
      <main>
        <HeroSection onLoginClick={open} />
        <MaterialCarouselsSection carousels={carousels} />
        <HowItWorksSection />
        <AudienceSection />
        <TrustSection />
      </main>
      <Footer />
      <LoginModal isOpen={isModalOpen} onClose={close} />
    </>
  );
}
