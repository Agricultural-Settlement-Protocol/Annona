"use client";


export function CtaSection() {
  return (
    <section className="w-full bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="bg-primary-dark text-center relative overflow-hidden p-12 md:p-24"
          style={{ borderRadius: "3rem" }}
        >
          {/* Decorative Background */}
          <div
            className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          />
          <div
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(118,154,142,0.2)" }}
          />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-medium text-white mb-8 tracking-tight leading-tight">
              Ready to cultivate the cities of tomorrow?
            </h2>
            <p className="text-xl mb-12 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
              Join UrbanGreen Tech in building a smarter, greener future today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                type="button"
                className="px-8 py-4 rounded-full font-semibold text-lg hover:bg-white transition-colors text-primary-dark"
                style={{ backgroundColor: "#d8ead0" }}
              >
                Start Your Project
              </button>
              <button
                type="button"
                className="px-8 py-4 rounded-full font-semibold text-lg text-white transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.4)" }}
              >
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
