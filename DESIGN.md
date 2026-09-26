# ARTHMITRA — DESIGN SYSTEM ("EDITORIAL FINANCIAL INTELLIGENCE × INTERACTIVE SECURITY INSTRUMENT")

## 1. DESIGN DIRECTION
ArthMitra Scam Shield is a precision **financial security instrument** combining the visual authority of an interactive editorial publication with the precision of a high-end financial command console.

- **Editorial Financial Intelligence × Interactive Security Instrument**
- **Precision Over Noise**: Sophistication achieved through typography, color discipline, spatial composition, motion hierarchy, and information design.
- **No Generic AI Patterns**: No black + gold, no neon cyberpunk, no heavy gradients, no card-grid hell.

---

## 2. COLOR SYSTEM TOKENS

```css
:root {
  --canvas: #080D1A;
  --canvas-elevated: #0D1426;

  --surface: #111A30;
  --surface-elevated: #17223D;

  --border: #263453;
  --border-subtle: rgba(120, 145, 210, 0.14);

  --text-primary: #F4F7FF;
  --text-secondary: #A8B4CC;
  --text-muted: #687793;
  --text-technical: #7F8DA8;
  --text-disabled: #46536B;

  --primary: #5B7CFF;
  --primary-hover: #7691FF;

  --secondary-accent: #8B7CFF;

  --safe: #35D0BA;
  --warning: #F4B860;
  --danger: #FF6B6B;
}
```

### Color Semantics
- **SAFE / LOW RISK**: Risk score = Mint (`#35D0BA`), risk ring = Mint, status marker = Mint.
- **REVIEW / SUSPICIOUS**: Risk score = Amber (`#F4B860`), risk ring = Amber, status marker = Amber.
- **HIGH RISK / DANGER**: Risk score = Coral (`#FF6B6B`), risk ring = Coral, status marker = Coral.
- Surrounding interface remains neutral indigo (`#080D1A`, `#111A30`).

---

## 3. TYPOGRAPHY SYSTEM

- **Fraunces** (`font-serif`, `font-display`): Editorial headlines, hero statements, major verdict typography. (**HUMAN / EDITORIAL**)
- **Inter** (`font-sans`): Navigation, controls, descriptions, forms, interface text. (**PRODUCT / INTERFACE**)
- **IBM Plex Mono** (`font-mono`): Risk values, timestamps, diagnostic information, technical labels, signal metadata. (**MACHINE / SYSTEM**)

### Text Color Hierarchy
- Primary: `#F4F7FF`
- Secondary: `#A8B4CC`
- Muted: `#687793`
- Technical: `#7F8DA8`
- Disabled: `#46536B`

---

## 4. RADIUS & BORDER SYSTEM

### Radius Hierarchy
- Major Containers: `18px` (`rounded-[18px]`)
- Panels: `14px` (`rounded-[14px]`)
- Inputs: `10px` (`rounded-[10px]`)
- Buttons: `9px` (`rounded-[9px]`)
- Status Pills: `999px` (`rounded-full`)

### Border Hierarchy
- Default: `rgba(120, 145, 210, 0.14)`
- Active: `rgba(91, 124, 255, 0.45)`
- Safe: `rgba(53, 208, 186, 0.30)`
- Warning: `rgba(244, 184, 96, 0.30)`
- Danger: `rgba(255, 107, 107, 0.30)`

---

## 5. MOTION HIERARCHY
- Micro-interactions: `150ms – 250ms` (Buttons, hover, focus, pills)
- UI Transitions: `300ms – 500ms` (Tabs, mode switches, input expanders)
- Major Transitions: `500ms – 900ms` (Hero entrance, result reveal)
- Hero Sequences: `800ms – 1400ms`
- Ambient Motion: `4s – 12s` (Slow orbital signal drift)
