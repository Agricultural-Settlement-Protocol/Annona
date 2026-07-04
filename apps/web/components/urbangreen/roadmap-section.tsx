"use client";


import { BoltIcon } from "./icons";

const roadmapItems = [
  {
    quarter: "Q1 2024",
    title: "Global Expansion",
    body: "Expansion to 10 new global megacities, bringing green infrastructure to high-density urban hubs.",
    style: "white" as const,
    position: "left" as const,
    offset: false,
  },
  {
    quarter: "Q3 2024",
    title: "Strategic Partnership",
    body: "Strategic partnership with Global Green Cities Initiative to standardize urban greening metrics.",
    style: "white-muted" as const,
    position: "left" as const,
    offset: true,
  },
  {
    quarter: "Q2 2024",
    title: "Bio-Link Launch",
    body: "Launch of AI-driven 'Bio-Link' sensor network for real-time ecosystem health monitoring.",
    style: "green" as const,
    position: "right" as const,
    offset: false,
  },
  {
    quarter: "Q4 2024",
    title: "Next-Gen Deployment",
    body: "Next-gen Carbon-Capture infrastructure deployment across our existing urban network.",
    style: "white-muted" as const,
    position: "right" as const,
    offset: true,
  },
];

export function RoadmapSection() {
  return (
    <section className="w-full bg-white py-24 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Decorative Background */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl -z-0"
          style={{ backgroundColor: "rgba(226,241,225,0.4)" }}
        />
        <div
          className="absolute top-1/2 right-0 w-64 h-64 rounded-full blur-2xl -z-0"
          style={{ backgroundColor: "rgba(216,234,208,0.3)" }}
        />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-20">
            <h2
              className="text-5xl md:text-7xl font-medium tracking-tight text-gray-900"
              style={{ lineHeight: 1.1 }}
            >
              Our{" "}
              <span className="inline-block relative">
                <span className="relative z-10 px-8 py-2">Roadmap</span>
                <span
                  className="absolute inset-0 rounded-full -z-0"
                  style={{ backgroundColor: "#e2f1e1" }}
                />
              </span>
            </h2>
            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center text-green-800 shadow-sm mb-2">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontFamily: "'Material Symbols Outlined'" }}
              >
                timeline
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
            {/* Left column */}
            <div className="flex flex-col gap-6">
              <RoadmapCard item={roadmapItems[0]!} />
              <div className="md:mt-12">
                <RoadmapCard item={roadmapItems[1]!} />
              </div>
            </div>
            {/* Right column (offset) */}
            <div className="flex flex-col gap-6 md:pt-24">
              <RoadmapCard item={roadmapItems[2]!} />
              <div className="md:mt-12 relative">
                <RoadmapCard item={roadmapItems[3]!} />
                <div className="absolute bottom-8 right-8">
                  <BoltIcon />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoadmapCard({ item }: { item: (typeof roadmapItems)[number] }) {
  const isGreen = item.style === "green";
  const isMuted = item.style === "white-muted";

  const badgeClass = isGreen
    ? "bg-white text-green-800"
    : isMuted
      ? "bg-gray-100 text-gray-500"
      : "bg-gray-900 text-white";

  const cardStyle: React.CSSProperties = {
    borderRadius: "3rem",
    ...(isGreen ? { backgroundColor: "#E2F1E1" } : {}),
  };

  return (
    <div
      className={`p-10 md:p-12 shadow-sm relative overflow-hidden group ${isGreen ? "" : "bg-white border border-gray-200 hover:shadow-md"} transition-shadow`}
      style={cardStyle}
    >
      {!isGreen && (
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"
          style={{ backgroundColor: "#fcf9f8" }}
        />
      )}
      {isGreen && (
        <div
          className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
        />
      )}
      <div className="relative z-10">
        <span
          className={`inline-block px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8 ${badgeClass}`}
        >
          {item.quarter}
        </span>
        <h3 className="text-3xl font-medium text-gray-900 mb-4">{item.title}</h3>
        <p className={`text-lg leading-relaxed ${isGreen ? "text-gray-800" : "text-gray-700"}`}>
          {item.body}
        </p>
      </div>
    </div>
  );
}
