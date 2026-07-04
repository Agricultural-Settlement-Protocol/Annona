---
name: Urban Verve
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#414845'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#717975'
  outline-variant: '#c1c8c4'
  surface-tint: '#43655a'
  primary: '#001b14'
  on-primary: '#ffffff'
  primary-container: '#0d3128'
  on-primary-container: '#769a8e'
  inverse-primary: '#a9cec1'
  secondary: '#546255'
  on-secondary: '#ffffff'
  secondary-container: '#d8e7d7'
  on-secondary-container: '#5a685b'
  tertiary: '#001b0e'
  on-tertiary: '#ffffff'
  tertiary-container: '#06321f'
  on-tertiary-container: '#719c82'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5ebdd'
  primary-fixed-dim: '#a9cec1'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#2b4d43'
  secondary-fixed: '#d8e7d7'
  secondary-fixed-dim: '#bccabb'
  on-secondary-fixed: '#121e15'
  on-secondary-fixed-variant: '#3d4a3e'
  tertiary-fixed: '#c0edd0'
  tertiary-fixed-dim: '#a4d1b4'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#264f39'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 84px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  body-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin: 40px
  container-padding: 64px
---

## Brand & Style

The design system is built on a foundation of **Modern Minimalism** with a strong emphasis on sustainability and technological precision. It targets eco-conscious urban planners, corporate sustainability officers, and tech-forward innovators who value clarity and environmental impact.

The visual narrative is driven by a "Bento-box" structural philosophy, organizing complex data into digestible, high-contrast modules. Key aesthetic pillars include:
- **Organic Geometry:** A fusion of rigid grid structures with hyper-rounded "pill" shapes and circular motifs to mimic the intersection of urban architecture and natural forms.
- **Breathable White Space:** Expansive margins and gutters to evoke a sense of calm and professional focus.
- **Dynamic Motion:** Using horizontal scrolling marquees to represent continuous growth and technical flow.

## Colors

The palette is derived from deep botanical tones and airy, atmospheric greens to create a professional yet refreshing aesthetic.

- **Primary (Forest Deep):** A dense, near-black green used for high-impact text, primary buttons, and navigation anchors. It provides the "weight" required for institutional trust.
- **Secondary (Pale Mint):** The workhorse of the system, used for card backgrounds, highlighting key phrases in headlines, and soft UI containers.
- **Accents:** Tertiary greens are reserved for interactive states (sliders, toggles) and decorative iconography.
- **Neutrals:** Pure white backgrounds are used to maintain high legibility, while off-blacks/dark-greys are used for body copy to reduce eye strain.

## Typography

This design system utilizes **Manrope** for its technical yet approachable character. The typeface strikes a balance between the geometric precision of a grotesque and the warmth of a humanist sans-serif.

- **Display & Headlines:** Use medium weights with tight letter-spacing. The primary headline pattern often includes a "Secondary Color" highlight behind specific keywords to draw the eye to core value propositions.
- **Body Copy:** Standardized at 18px to ensure high readability across all age groups. Line heights are generous (1.6x) to support the minimalist aesthetic.
- **Marquee Text:** Large-scale headlines used in scrolling containers should be set in Medium weight with no more than 48px size to maintain technical elegance during motion.

## Layout & Spacing

The layout follows a **Bento Grid** model, where content is partitioned into distinct rectangular and pill-shaped containers. 

- **Grid System:** A 12-column fluid grid for desktop with 24px gutters. Elements typically span 4, 6, or 12 columns.
- **Responsive Behavior:** On mobile, the grid collapses to a single column, but the "pill" containers maintain their aggressive corner radii.
- **Scrolling Marquee:** A recurring pattern for secondary service discovery. It should span the full width of the viewport, breaking the standard container margins to create an "endless" feel.
- **Padding:** High internal padding (40px+) within cards is required to maintain the minimalist, premium feel.

## Elevation & Depth

This system avoids traditional shadows in favor of **Tonal Layering** and **Crisp Outlines**.

- **Surface Tiers:** Depth is communicated by placing dark-colored elements or high-saturation images on top of the Secondary (Pale Mint) or White surfaces.
- **Low-Contrast Outlines:** Containers often use a 1px solid border in a slightly darker shade of the background color (e.g., #D0E1CF border on #E2F1E1 background) to define boundaries without adding visual "weight."
- **Glassmorphism (Video Only):** Video controls and overlay chips within media containers use a subtle backdrop blur (12px) and white semi-transparency (20%) to remain legible over dynamic backgrounds.

## Shapes

The shape language is the most distinctive feature of the design system. It is defined by **Extreme Radii**.

- **Pill Philosophy:** Every button, navigation item, and many secondary containers use a fully rounded (pill) radius.
- **Card Containers:** Standard content cards use a minimum of 40px (2.5rem) corner radius.
- **Asymmetric Curves:** Large hero media or featured "Our Team" sections use a signature asymmetric radius, where three corners are heavily rounded (e.g., 100px) and one corner is near-sharp or differently curved to create an organic, leaf-like silhouette.

## Components

- **Buttons:** Two primary variants. 
    1. **Primary:** Solid "Forest Deep" (#0D3128) with white text, pill-shaped.
    2. **Secondary/Ghost:** Transparent background with a "Forest Deep" 1px border and an integrated arrow icon (→).
- **Navigation Chips:** Small pill-shaped containers used in the header. Active states use the "Pale Mint" background with a small icon suffix.
- **Video Containers:** Must feature the signature "Asymmetric Curve" and a centered, semi-transparent play button. Tags (e.g., "Smart", "Sustainable") are overlaid in the top-left as ghost pills.
- **Progress Sliders:** Minimalist horizontal lines with a circular "thumb" in accent green, accompanied by a numerical counter (e.g., 01, 02).
- **Bento Cards:** Rectangular containers with 2.5rem corner radii. They should mix imagery and large typography, often featuring a circular icon-button in the bottom right corner for "drill-down" navigation.
- **Marquee:** A continuous horizontal loop of text and small images (leaf icons or tech-parts) used to separate major sections of the page.