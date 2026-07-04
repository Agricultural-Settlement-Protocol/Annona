"use client";


export function SiteFooter() {
  return (
    <footer
      className="w-full py-16 border-t border-gray-200"
      style={{ backgroundColor: "#fcf9f8" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center relative">
                <div className="w-3 h-3 bg-white rounded-full absolute -right-1 bottom-1" />
              </div>
              <span className="text-xl font-medium tracking-tight">UrbanGreen Tech</span>
            </div>
            <p className="text-gray-700 font-medium max-w-[200px]">
              Cultivating the Future of Cities.
            </p>
          </div>
          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
              Platform
            </h4>
            <ul className="flex flex-col gap-4">
              {["Solutions", "Sustainability", "Tech Stack", "Roadmap", "Our Team"].map((link) => (
                <li key={link}>
                  <a className="text-gray-700 hover:text-primary-dark transition-colors" href="#">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* Company Links */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
              Company
            </h4>
            <ul className="flex flex-col gap-4">
              {["About", "Careers", "Press", "Contact"].map((link) => (
                <li key={link}>
                  <a className="text-gray-700 hover:text-primary-dark transition-colors" href="#">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
              Stay Connected
            </h4>
            <p className="text-gray-700 text-sm mb-6">
              Get the latest updates on urban greening technology.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-grow px-4 py-2 rounded-full border border-gray-300 text-sm focus:outline-none"
                style={{ borderColor: "#d1d5db" }}
                placeholder="Email address"
                type="email"
              />
              <button
                type="button"
                className="w-10 h-10 bg-primary-dark text-white rounded-full flex items-center justify-center hover:opacity-90"
              >
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© 2024 UrbanGreen Tech. All rights reserved.</p>
          <div className="flex gap-8">
            <a className="text-sm text-gray-500 hover:text-gray-900" href="#">
              Privacy Policy
            </a>
            <a className="text-sm text-gray-500 hover:text-gray-900" href="#">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
