"use client";


import Image from "next/image";
import { ArrowForwardIcon, BarChartIcon, CodeIcon } from "./icons";
import { IMG } from "./images";

export function TechStackSection() {
  return (
    <section
      className="w-full py-24 border-t border-gray-200"
      style={{ backgroundColor: "#fcf9f8" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Tech Stack
          </h2>
          <CodeIcon />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Bento Grid */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* AI Optimization Card */}
            <div
              className="bg-white border border-gray-200 p-8 md:p-10 flex flex-col justify-between flex-grow shadow-sm relative"
              style={{ borderRadius: "2rem" }}
            >
              <div>
                <h3 className="text-3xl font-medium text-gray-900 mb-4 leading-tight">
                  AI-Powered Optimization
                </h3>
                <p className="text-gray-700 text-lg leading-relaxed max-w-sm mb-8">
                  Leveraging advanced machine learning algorithms to analyze urban data streams and
                  optimize resource allocation in real-time.
                </p>
              </div>
              <a
                className="w-fit px-6 py-3 rounded-full border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                href="#"
              >
                View Tech Specs <ArrowForwardIcon />
              </a>
            </div>
            {/* 95% Accuracy Card */}
            <div
              className="p-8 md:p-10 flex flex-col justify-between flex-grow relative overflow-hidden"
              style={{ backgroundColor: "#d8ead0", borderRadius: "2rem" }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              />
              <div
                className="absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-8 -mb-8 blur-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
              />
              <div className="relative z-10">
                <h3 className="text-4xl md:text-5xl font-medium text-gray-900 mb-2 leading-tight">
                  95%
                </h3>
                <p className="text-xl font-medium text-gray-800 mb-2">
                  Accuracy in predictive modeling
                </p>
                <p className="text-gray-700 text-base leading-relaxed">
                  Our sensor networks provide highly accurate environmental data for smarter city
                  planning.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Main Visual */}
          <div className="lg:col-span-7 relative">
            <div
              className="relative overflow-hidden bg-gray-100 w-full"
              style={{ borderRadius: "2rem", borderTopLeftRadius: "6rem", aspectRatio: "4/3" }}
            >
              <Image
                alt="Data visualization dashboard"
                className="object-cover"
                src={IMG.dashboard}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              {/* Overlay UI Element */}
              <div
                className="absolute top-6 left-6 rounded-2xl p-4 shadow-sm flex items-center gap-4 z-10"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-green-800"
                  style={{ backgroundColor: "#E2F1E1" }}
                >
                  <BarChartIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Live Metrics
                  </p>
                  <p className="text-sm font-medium text-gray-900">System Monitoring Active</p>
                </div>
              </div>
            </div>
            {/* Decorative element top right */}
            <div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center overflow-hidden z-0"
              style={{ backgroundColor: "#E2F1E1" }}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center -mr-4 -mt-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
