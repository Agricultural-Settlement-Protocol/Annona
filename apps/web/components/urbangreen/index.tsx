"use client";

import { CoreFeaturesSection } from "./core-features-section";
import { CtaSection } from "./cta-section";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { RoadmapSection } from "./roadmap-section";
import { ScrollingMarquee } from "./scrolling-marquee";
import { SiteFooter } from "./site-footer";
import { SolutionsSection } from "./solutions-section";
import { SustainabilitySection } from "./sustainability-section";
import { TechStackSection } from "./tech-stack-section";

export function UrbanGreenLanding() {
  return (
    <div className="urbangreen-body min-h-screen flex flex-col relative">
      <Header />
      <HeroSection />
      <ScrollingMarquee />
      <TechStackSection />
      <SustainabilitySection />
      <CoreFeaturesSection />
      <RoadmapSection />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}
