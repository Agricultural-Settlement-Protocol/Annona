"use client";

import { Button, Logo } from "@annona/ui";
import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";

/**
 * Floating navbar: a centered pill that detaches from the top, gains a blurred
 * surface + shadow on scroll. Links scroll to sections. Mobile keeps logo + CTA.
 */
export function FloatingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      <nav
        className={[
          "flex w-full max-w-3xl items-center justify-between gap-4 rounded-full px-3 py-2 transition-all duration-300",
          scrolled
            ? "border border-border bg-surface/80 shadow-[var(--shadow-md)] backdrop-blur-md"
            : "border border-transparent bg-surface/40 backdrop-blur-sm",
        ].join(" ")}
      >
        <Link href="/" className="pl-2">
          <Logo size={22} />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#cara" className="transition-colors hover:text-foreground">
            Cara kerja
          </a>
          <a href="#angka" className="transition-colors hover:text-foreground">
            Dampak
          </a>
          <a href="#alur" className="transition-colors hover:text-foreground">
            Roadmap
          </a>
          <Link href="/design" className="transition-colors hover:text-foreground">
            Design
          </Link>
        </div>
        <Button variant="gradient" size="sm" rightIcon={<ArrowRight size={15} />}>
          Masuk
        </Button>
      </nav>
    </motion.header>
  );
}
