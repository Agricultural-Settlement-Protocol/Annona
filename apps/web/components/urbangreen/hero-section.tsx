"use client";

import Image from "next/image";
import { DiagonalArrowIcon, GlobeIcon, PlayIcon, SparkleIcon } from "./icons";
import { IMG } from "./images";

export function HeroSection() {
  return (
    <main className="flex-grow flex flex-col md:flex-row px-4 md:px-8 pt-8 pb-12 gap-8 relative max-w-[1440px] w-full mx-auto md:h-[calc(100vh-96px)] md:min-h-[700px]">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 flex flex-col gap-12 md:gap-0 md:justify-between flex-shrink-0 md:h-full">
        {/* Company Info */}
        <div className="flex flex-col gap-3 pl-4">
          <Image
            alt="Leaf Logo"
            className="rounded-full object-cover"
            src={IMG.logo}
            width={48}
            height={48}
          />
          <span className="text-sm font-medium text-gray-700">
            UrbanGreen Tech
          </span>
        </div>
        {/* Team Card */}
        <div
          className="bg-soft-green overflow-hidden relative flex flex-col gap-6 p-8"
          style={{ borderRadius: "3rem", borderBottomLeftRadius: "4rem" }}
        >
          <div className="flex -space-x-3">
            <Image
              alt="Team member 1"
              className="w-12 h-12 rounded-full object-cover"
              style={{
                borderWidth: 2,
                borderColor: "#d8ead0",
                borderStyle: "solid",
              }}
              src={IMG.team1}
              width={48}
              height={48}
            />
            <Image
              alt="Team member 2"
              className="w-12 h-12 rounded-full object-cover relative z-10"
              style={{
                borderWidth: 2,
                borderColor: "#d8ead0",
                borderStyle: "solid",
              }}
              src={IMG.team2}
              width={48}
              height={48}
            />
            <Image
              alt="Team member 3"
              className="w-12 h-12 rounded-full object-cover relative z-20"
              style={{
                borderWidth: 2,
                borderColor: "#d8ead0",
                borderStyle: "solid",
              }}
              src={IMG.team3}
              width={48}
              height={48}
            />
          </div>
          <span className="text-lg font-medium text-gray-900">Our Team</span>
          <div className="absolute bottom-6 right-6 flex gap-1">
            <div
              className="w-8 h-8 rounded-full bg-white opacity-80"
              style={{ borderTopLeftRadius: 0 }}
            />
            <div className="w-4 h-4 rounded-full bg-white opacity-80 mt-auto" />
          </div>
        </div>
        {/* Bottom Left Tagline */}
        <div className="mt-auto pl-4 pb-4 md:mt-0">
          <SparkleIcon />
          <p className="text-xl font-medium leading-tight text-gray-900 max-w-[150px]">
            Cultivating the Future of Cities
          </p>
        </div>
      </aside>

      {/* Center/Right Content */}
      <section className="flex-grow flex flex-col pt-4 md:pt-12 md:h-full md:justify-between">
        {/* Hero Headline */}
        <div className="max-w-4xl mx-auto md:ml-0 mb-16 px-4 md:px-12 text-center md:text-left">
          <h1
            className="text-5xl md:text-7xl font-medium tracking-tight text-gray-900"
            style={{ lineHeight: 1.1 }}
          >
            Reimagining Urban Spaces{" "}
            <span className="inline-block relative">
              <span className="relative z-10 px-8 py-2">Greening</span>
              <span
                className="absolute inset-0 rounded-full -z-0"
                style={{ backgroundColor: "#e2f1e1" }}
              />
            </span>{" "}
            the World
          </h1>
        </div>

        {/* Main Video Feature */}
        <div
          className="w-full video-card shadow-lg mb-10"
          style={{
            backgroundImage: `url(${IMG.heroVideo})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
            backgroundSize: "cover",
          }}
        >
          {/* Overlay Tags */}
          <div className="absolute top-8 left-8 flex gap-3 z-20">
            <span className="tag-glass px-5 py-2 rounded-full text-sm font-medium tracking-wide">
              Smart
            </span>
            <span className="tag-glass px-5 py-2 rounded-full text-sm font-medium tracking-wide">
              Sustainable
            </span>
            <span className="tag-glass px-5 py-2 rounded-full text-sm font-medium tracking-wide">
              Innovative
            </span>
          </div>
          {/* Top Right Icon */}
          <div
            className="absolute top-8 right-8 z-20 w-12 h-12 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
            style={{ border: "1px solid rgba(255,255,255,0.4)" }}
          >
            <GlobeIcon />
          </div>
          {/* Play Button */}
          <div className="video-overlay z-10">
            <button
              type="button"
              className="w-20 h-20 rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
              style={{
                background: "rgba(255,255,255,0.3)",
                backdropFilter: "blur(12px)",
              }}
            >
              <PlayIcon />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 px-4 pr-12 pb-8">
          <a
            className="px-6 py-3 rounded-full border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
            href="#"
          >
            Explore more <DiagonalArrowIcon />
          </a>
          <a
            className="px-6 py-3 rounded-full bg-primary-dark text-white font-medium hover:opacity-90 transition-colors"
            href="#"
          >
            Work with Us
          </a>
        </div>
      </section>
    </main>
  );
}
