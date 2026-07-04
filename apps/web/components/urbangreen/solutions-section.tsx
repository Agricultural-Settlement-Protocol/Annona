"use client";


import Image from "next/image";
import { ArrowRightIcon, SectionArrowIcon } from "./icons";
import { IMG } from "./images";

export function SolutionsSection() {
  return (
    <section className="w-full bg-white pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Explore our solutions
          </h2>
          <SectionArrowIcon />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Main Visual */}
          <div className="lg:col-span-7 relative">
            <div
              className="relative overflow-hidden bg-gray-100 w-full"
              style={{ borderRadius: "2rem", borderTopRightRadius: "6rem", aspectRatio: "4/3" }}
            >
              <Image
                alt="Indoor hanging terrariums"
                className="object-cover"
                src={IMG.solutionsMain}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
            </div>
            {/* Decorative element bottom left */}
            <div
              className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "#e2f1e1" }}
            >
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center -ml-6">
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: "#e2f1e1" }} />
              </div>
            </div>
          </div>

          {/* Right Side: Bento Grid */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Progress slider row */}
            <div className="flex items-center justify-between border border-gray-200 rounded-full p-2 pl-6 bg-white shadow-sm">
              <div className="flex items-center gap-4 flex-grow">
                <span className="text-lg font-medium text-gray-900">02</span>
                <div className="h-1 bg-gray-200 flex-grow rounded-full relative mr-6">
                  <div
                    className="absolute left-0 top-0 h-full w-1/3 rounded-full"
                    style={{ backgroundColor: "#769a8e" }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ left: "33%", backgroundColor: "#5a8072" }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Image
                  alt="Leaf detail"
                  className="object-cover"
                  style={{ borderRadius: "1rem", borderTopRightRadius: "0.125rem" }}
                  src={IMG.leafDetail}
                  width={80}
                  height={64}
                />
                <Image
                  alt="Wet leaf"
                  className="object-cover"
                  style={{
                    borderRadius: "1rem",
                    borderTopLeftRadius: "0.125rem",
                    borderBottomRightRadius: "1.5rem",
                  }}
                  src={IMG.wetLeaf}
                  width={80}
                  height={64}
                />
              </div>
            </div>

            {/* 80% Energy Efficiency Card */}
            <div
              className="p-8 md:p-10 flex flex-col justify-between flex-grow relative"
              style={{ backgroundColor: "#E2F1E1", borderRadius: "2rem" }}
            >
              <div>
                <h3 className="text-4xl md:text-5xl font-medium text-gray-900 mb-6 leading-tight">
                  80% Energy Efficiency
                </h3>
                <p className="text-gray-800 text-lg md:text-xl leading-relaxed max-w-md">
                  UrbanGreen Tech&apos;s LED lighting solutions have demonstrated energy efficiency
                  gains of up to 80% compared to traditional lighting systems.
                </p>
              </div>
              <button
                type="button"
                className="absolute bottom-8 right-8 w-14 h-14 rounded-full border border-gray-900 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-colors"
              >
                <ArrowRightIcon />
              </button>
            </div>

            {/* Testimonial */}
            <div className="flex items-end mt-4 relative pt-6 pl-6">
              <div
                className="absolute left-0 bottom-0 w-28 h-28 rounded-full -z-10"
                style={{ backgroundColor: "#d8ead0" }}
              />
              <Image
                alt="Camilla Hoff"
                className="rounded-full object-cover border-4 border-white ml-2 z-10"
                src={IMG.camilla}
                width={96}
                height={96}
              />
              <div
                className="bg-white border border-gray-200 p-6 flex-grow shadow-sm z-0 pl-10"
                style={{
                  borderRadius: "2rem",
                  borderBottomLeftRadius: "0.125rem",
                  marginLeft: "-1rem",
                }}
              >
                <p className="text-gray-900 text-lg font-medium leading-relaxed mb-4">
                  &ldquo;Our mission is to empower communities, inspire innovation, and create an
                  eco-friendly world.&rdquo;
                </p>
                <p className="text-gray-900 font-semibold">Camilla Hoff, co-founder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
