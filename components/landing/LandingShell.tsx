"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { AudienceSection } from "./AudienceSection";
import { TrustSection } from "./TrustSection";
import { Footer } from "./Footer";
import { LoginModal } from "./LoginModal";

export function LandingShell() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const open = () => setIsModalOpen(true);
  const close = () => setIsModalOpen(false);

  return (
    <>
      <Navbar onLoginClick={open} />
      <main>
        <HeroSection onLoginClick={open} />
        <HowItWorksSection />
        <AudienceSection />
        <TrustSection />
      </main>
      <Footer />
      <LoginModal isOpen={isModalOpen} onClose={close} />
    </>
  );
}
