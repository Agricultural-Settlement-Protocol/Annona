"use client";


import Image from "next/image";

const HomeIcon = () => (
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
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ServiceIcon = () => (
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
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const TechIcon = () => (
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
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export function Header() {
  return (
    <header
      className="w-full px-8 py-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md"
      style={{ backgroundColor: "rgba(252,249,248,0.9)" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center relative">
          <div className="w-3 h-3 bg-white rounded-full absolute -right-1 bottom-1" />
        </div>
        <span className="text-xl font-medium tracking-tight">UrbanGreen Tech</span>
      </div>
      <nav className="hidden md:flex items-center gap-2">
        <a
          className="pill-nav active flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          href="#"
        >
          Home <HomeIcon />
        </a>
        <a
          className="pill-nav flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200"
          href="#"
        >
          Service <ServiceIcon />
        </a>
        <a
          className="pill-nav flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200"
          href="#"
        >
          Technology <TechIcon />
        </a>
      </nav>
      <button
        type="button"
        className="bg-primary-dark text-white px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-colors"
      >
        Contact Us
      </button>
    </header>
  );
}
