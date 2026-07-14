import { UrbanGreenLanding } from "@/components/urbangreen";
import type { Metadata } from "next";
import "./urbangreen.css";

export const metadata: Metadata = {
  title: "UrbanGreen Tech, Reimagining Urban Spaces",
  description:
    "UrbanGreen Tech creates smart, sustainable green infrastructure for modern cities. Explore our solutions for urban greening, AI-powered optimization, and environmental impact.",
};

export default function UrbanGreenPage() {
  return <UrbanGreenLanding />;
}
