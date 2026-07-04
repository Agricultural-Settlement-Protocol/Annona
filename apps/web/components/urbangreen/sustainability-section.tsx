"use client";


import Image from "next/image";
import { IMG } from "./images";

export function SustainabilitySection() {
  return (
    <section className="w-full bg-white py-24 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Sustainability Impact
          </h2>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-green-800"
            style={{ backgroundColor: "#E2F1E1" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontFamily: "'Material Symbols Outlined'" }}
            >
              eco
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Large Visual Card */}
          <div className="lg:col-span-7 relative">
            <div
              className="relative overflow-hidden bg-gray-100 w-full"
              style={{ borderRadius: "2rem", borderBottomLeftRadius: "6rem", aspectRatio: "4/3" }}
            >
              <Image
                alt="Urban vertical forest"
                className="object-cover"
                src={IMG.verticalForest}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              <div
                className="absolute bottom-6 left-8 rounded-2xl p-4 shadow-sm z-10"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Project Highlight
                </p>
                <p className="text-sm font-medium text-gray-900">
                  Milan Vertical Forest Integration
                </p>
              </div>
            </div>
            <div
              className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center overflow-hidden z-0"
              style={{ backgroundColor: "#d8ead0" }}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center -mr-4 -mb-4" />
            </div>
          </div>

          {/* Right Side: Bento Grid */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Carbon Sequestration Card */}
            <div
              className="bg-white border border-gray-200 p-8 md:p-10 flex flex-col justify-between shadow-sm relative"
              style={{ borderRadius: "2rem" }}
            >
              <div>
                <h3 className="text-3xl font-medium text-gray-900 mb-4 leading-tight">
                  Carbon Sequestration
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-primary-dark">12.5k</span>
                  <span className="text-xl text-gray-500">Tons</span>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  CO2 captured annually through our integrated urban greening networks across 15
                  major cities.
                </p>
              </div>
            </div>
            {/* Water Conservation Card */}
            <div
              className="p-8 md:p-10 flex flex-col justify-between relative overflow-hidden"
              style={{ backgroundColor: "#E2F1E1", borderRadius: "2rem" }}
            >
              <div className="relative z-10">
                <h3 className="text-4xl md:text-5xl font-medium text-gray-900 mb-2 leading-tight">
                  40%
                </h3>
                <p className="text-xl font-medium text-gray-800 mb-2">Water Conservation</p>
                <p className="text-gray-700 text-base leading-relaxed">
                  Reduction in urban runoff through smart permeable surfaces and vertical irrigation
                  systems.
                </p>
              </div>
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
              />
            </div>
            {/* Quote Card */}
            <div
              className="bg-primary-dark text-white p-8 flex flex-col justify-center"
              style={{ borderRadius: "2rem" }}
            >
              <p className="text-lg font-medium italic leading-relaxed mb-4">
                &ldquo;We don&apos;t just build technology; we restore the lungs of our cities for
                the next generation.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                />
                <span className="text-sm font-semibold">Sustainability Board</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
