"use client";

import Image from "next/image";
import { IMG } from "./images";

export function ScrollingMarquee() {
  return (
    <div className="w-full mt-auto mb-10">
      <div className="marquee-container" style={{ backgroundColor: "#fcf9f8" }}>
        <div className="marquee-content text-5xl md:text-6xl font-medium text-gray-900">
          <span className="mx-8">Green Infrastructure Design</span>
          <Image
            alt="Leaf separator"
            className="rounded-2xl object-cover mx-4 opacity-80"
            src={IMG.marqueeLeaf1}
            width={64}
            height={64}
          />
          <span className="mx-8">Smart Irrigation Systems</span>
          <Image
            alt="Leaf separator"
            className="rounded-2xl object-cover mx-4 opacity-80"
            src={IMG.marqueeLeaf2}
            width={64}
            height={64}
          />
          <span className="mx-8">Green Infrastructure Design</span>
          <Image
            alt="Leaf separator"
            className="rounded-2xl object-cover mx-4 opacity-80"
            src={IMG.marqueeLeaf3}
            width={64}
            height={64}
          />
          <span className="mx-8">Smart Irrigation Systems</span>
        </div>
      </div>
    </div>
  );
}
