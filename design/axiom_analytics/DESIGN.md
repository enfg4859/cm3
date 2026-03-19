# Design System Specification: Technical Analysis & Precision Data

## 1. Overview & Creative North Star: "The Quant’s Atelier"
Most technical dashboards suffer from "Industrial Clutter"—a relic of legacy terminals that prioritize density over clarity. This design system departs from that chaos to embrace **The Quant’s Atelier**. 

The North Star of this system is **Data Editorialism**. We treat financial data with the same reverence a high-end magazine treats photography. By utilizing intentional asymmetry, tonal depth, and high-contrast typography, we create an environment that feels less like a "tool" and more like a "curated workspace." We move away from the rigid, boxed-in "TradingView" look by removing borders entirely and allowing the data to breathe within a layered, 3D environment.

---

## 2. Colors & Atmospheric Depth
Our palette is anchored in a deep, midnight obsidian, using a sophisticated range of indigo and emerald accents to drive action and sentiment.

### Tonal Hierarchy
- **Background (`#0b1326`):** The canvas. This is the deepest layer.
- **Surface Tiers:** We define hierarchy through the `surface-container` scale. 
    - Use `surface_container_low` for the main dashboard body.
    - Use `surface_container_high` for interactive widgets or cards.
    - Use `surface_bright` exclusively for floating overlays or tooltips.

### The "No-Line" Rule
**Standard 1px solid borders are strictly prohibited for sectioning.** To separate a sidebar from a chart, or a card from the background, you must use a background shift. For example, a `surface_container_highest` widget should sit directly on a `surface_container_low` background. The change in luminance is the boundary.

### The "Glass & Gradient" Rule
To elevate the "premium" feel, use Glassmorphism for floating elements (like price-point callouts). 
- **Recipe:** `surface_bright` at 60% opacity with a `20px` backdrop blur.
- **Signature Textures:** For primary actions, do not use flat Indigo. Apply a subtle linear gradient from `primary` (`#c0c1ff`) to `primary_container` (`#8083ff`) at a 135-degree angle. This adds "soul" and a tactile quality to the digital interface.

---

## 3. Typography: The Language of Precision
We use **Inter** for its neutral, highly legible character, but we apply it with editorial intent.

- **Display & Headlines:** Use `display-sm` for large price movements or key metrics. These should feel authoritative.
- **Data Labels:** Use `label-md` or `label-sm` for axis labels and metadata.
- **Monospacing:** While Inter is sans-serif, ensure "tabular num" OpenType features are enabled for all price data. This prevents "jitter" during rapid price updates.
- **Hierarchy:** Use `on_surface_variant` (`#c7c4d7`) for secondary information like timestamps or volume labels to keep the visual focus on the `primary` price action.

---

## 4. Elevation & Depth: Tonal Layering
In this system, depth is a function of light, not lines.

- **The Layering Principle:** Treat the UI as stacked sheets of glass. 
    - Level 0: `surface` (The void)
    - Level 1: `surface_container_low` (Main UI areas)
    - Level 2: `surface_container_highest` (Active Widgets)
- **Ambient Shadows:** When a widget must "float" (e.g., a settings modal), use a shadow with a `24px` blur and `6%` opacity. The shadow color must be a tinted version of the background (`#060e20`), never pure black.
- **Ghost Borders:** If an element requires more definition (e.g., a search input), use a "Ghost Border": the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Interaction Patterns

### Buttons (The Action Centers)
- **Primary:** Gradient-filled (Indigo scale), `lg` (0.5rem) roundedness. No border.
- **Secondary:** `surface_container_highest` background with `primary` text.
- **Tertiary:** Ghost style. No background, `primary` text, becomes `surface_variant` on hover.

### The Charting Environment
- **Grid Lines:** Use `outline_variant` at 10% opacity. They should be a suggestion, not a cage.
- **Price Candles:** 
    - **Up:** `secondary` (`#4edea3`). Use a soft outer glow (2px blur) to signify "Emerald" radiance.
    - **Down:** `tertiary_container` (`#ff516a`). 
- **Axis Labels:** Stick to `label-sm`. Always pinned to the right/bottom using `on_surface_variant`.

### Cards & Lists
- **No Dividers:** Never use a line to separate list items. Use `1.5` (0.3rem) spacing and subtle `surface` color shifts on hover to indicate row selection.
- **Nesting:** A card (`surface_container_high`) inside a section (`surface_container_low`) provides all the visual separation required.

### Signature Component: The "Live Status" Chip
A custom component for market status (Open/Closed). Use a `secondary` (Emerald) background at 10% opacity with a solid `secondary` dot and `secondary` text. This "tinted" look is more sophisticated than a solid color block.

---

## 6. Do's and Don'ts

### Do
- **DO** use asymmetry. Let the chart take up 72% of the screen while the sidebar takes 28%. Perfectly equal columns feel generic.
- **DO** use whitespace as a separator. If two elements feel cluttered, increase the spacing to `8` or `10` before considering a line.
- **DO** use `surface_bright` for hover states to create a "lighting up" effect.

### Don't
- **DON'T** use pure white (`#FFFFFF`) for text. It creates "halo" eye strain in dark mode. Always use `on_surface` (`#dae2fd`).
- **DON'T** use 100% opaque borders. They "trap" the data and make the dashboard feel heavy.
- **DON'T** use standard Material shadows. They are too aggressive for a technical analysis context.