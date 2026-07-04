"use client";


export function CoreFeaturesSection() {
  return (
    <section
      className="w-full py-24 border-t border-gray-200"
      style={{ backgroundColor: "#fcf9f8" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Core Features
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
          {/* Left: Large feature card */}
          <div
            className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden"
            style={{ backgroundColor: "#E2F1E1", borderRadius: "2rem" }}
          >
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-medium text-gray-900 mb-6 leading-tight">
                Smart Micro-Climate Control
              </h3>
              <p className="text-gray-800 text-lg md:text-xl leading-relaxed max-w-xl">
                Our advanced sensor arrays continuously monitor and adjust humidity and temperature
                levels, creating the perfect environment for urban flora to thrive regardless of
                external conditions.
              </p>
            </div>
            <div className="mt-12 flex gap-4">
              <span
                className="px-5 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: "rgba(255,255,255,0.4)", backdropFilter: "blur(4px)" }}
              >
                Real-time Adjustment
              </span>
              <span
                className="px-5 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: "rgba(255,255,255,0.4)", backdropFilter: "blur(4px)" }}
              >
                Precision Sensors
              </span>
            </div>
            <div
              className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full blur-3xl"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            />
          </div>

          {/* Right: Two smaller cards */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div
              className="bg-white border border-gray-200 p-8 flex flex-col justify-between shadow-sm"
              style={{ borderRadius: "2rem" }}
            >
              <div>
                <h3 className="text-2xl font-medium text-gray-900 mb-4">Autonomous Irrigation</h3>
                <p className="text-gray-700 leading-relaxed">
                  Self-regulating systems that deliver the exact amount of water needed, reducing
                  waste by up to 60% through intelligent scheduling.
                </p>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-6 py-2 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Learn More
                </button>
              </div>
            </div>
            <div
              className="bg-white border border-gray-200 p-8 flex flex-col justify-between shadow-sm"
              style={{ borderRadius: "2rem" }}
            >
              <div>
                <h3 className="text-2xl font-medium text-gray-900 mb-4">
                  Predictive Health Monitoring
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  AI-driven diagnostics identify potential plant diseases before they spread,
                  ensuring the long-term vitality of urban green spaces.
                </p>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-6 py-2 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
