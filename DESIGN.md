# ARTHMITRA — DESIGN SYSTEM ("THE FINANCIAL SIGNAL")

## 1. VISUAL CONCEPT: THE FINANCIAL SIGNAL
ArthMitra Scam Shield is an intelligent **decision instrument** where financial information moves through a living safety network.
Instead of a dark dashboard filled with repetitive card grids, the interface is built around **signals, layers, trajectories, nodes, editorial typography, and spatial depth**.

- **Editorial + Futuristic + Intelligent + Kinetic + Financial + Human**
- **No generic black + gold**
- **No cyan/purple AI gradient defaults**
- **No card-grid hell**
- **No equal-weight centered layouts**

---

## 2. COLOR PALETTE & TOKENS

### Background & Surfaces
- `base`: `#0B1020` (Deep Indigo canvas)
- `surface`: `#111936` (Secondary Ink panel)
- `surface-elevated`: `#182246` (Elevated interactive surface)
- `border-hairline`: `rgba(245, 247, 255, 0.08)`
- `border-active`: `rgba(79, 107, 255, 0.35)`

### Accents & Semantic Indicators
- `cobalt` (Primary Accent): `#4F6BFF` (Electric Cobalt)
- `violet` (Secondary Depth): `#8B5CF6` (Atmospheric Violet)
- `mint` (Safe Signal): `#2DD4BF` (Clean Mint)
- `coral` (Warning / Suspicious): `#FB7185` (Tangerine Coral)
- `vermilion` (High Risk Danger): `#FF4D5A` (Deep Vermilion)

### Typography Colors
- `text-primary`: `#F5F7FF` (Warm off-white)
- `text-secondary`: `#AAB4D0` (Soft indigo slate)
- `text-muted`: `#6C7A9C` (Muted technical slate)

---

## 3. TYPOGRAPHY SYSTEM

- **Display Headline**: `Fraunces` / `Instrument Serif` (Editorial Serif, italic flourishes, high-contrast serif for narrative weight)
- **UI & Controls**: `Inter` / `Geist` (Precision sans-serif for interactive elements)
- **Technical & Data**: `IBM Plex Mono` (Tabular numerals, execution logs, diagnostics)

### Typographic Hierarchy
- **Hero Title**: 3.5rem - 4.5rem Editorial Serif, asymmetric alignment
- **Section Label**: 0.75rem Monospace uppercase tracking `0.25em`
- **Section Heading**: 1.75rem - 2.25rem Serif / Sans bold
- **Body & Controls**: 0.875rem Sans-serif leading `1.6`
- **Technical Readouts**: 0.75rem Monospace tabular numbers

---

## 4. SHAPE & COMPOSITION LANGUAGE

- **Asymmetric Layouts**: 60/40 split screens, offset columns, left-heavy editorial statements paired with right-hand interactive instruments.
- **Mixed Corner Geometry**: Sharp rectangular module bounds, subtle 8px corners (`rounded-lg`), pill indicators for status.
- **Signal Trajectories**: Thin 1px SVG paths, orbital nodes, pulsing signal streams connecting inputs to decisions.
- **No Uniform Card Grids**: Replace 3x3 grids with sequential signal stacks, investigation logs, and directional flow timelines.

---

## 5. MOTION & CHOREOGRAPHY

- **Micro-Interactions**: 150ms – 250ms cubic-bezier(0.2, 0, 0, 1) (Buttons, focus, mode switches)
- **UI Transitions**: 300ms – 500ms (Mode switching, expanders, input activation)
- **Scene Reveals**: 500ms – 900ms (Hero entrance, result reveal, signal stream activation)
- **Ambient Motion**: 4s – 12s slow orbital particle drift & signal pulse
- **Accessibility**: Full `prefers-reduced-motion` compliance — disables continuous particle animations and parallax, simplifying transitions to instant opacity fades.
