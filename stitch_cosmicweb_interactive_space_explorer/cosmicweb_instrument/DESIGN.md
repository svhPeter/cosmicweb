---
name: CosmicWeb Instrument
colors:
  surface: '#11131c'
  surface-dim: '#11131c'
  surface-bright: '#373943'
  surface-container-lowest: '#0c0e17'
  surface-container-low: '#191b24'
  surface-container: '#1d1f29'
  surface-container-high: '#282933'
  surface-container-highest: '#33343e'
  on-surface: '#e2e1ef'
  on-surface-variant: '#c4c5d9'
  inverse-surface: '#e2e1ef'
  inverse-on-surface: '#2e303a'
  outline: '#8e90a2'
  outline-variant: '#434656'
  surface-tint: '#b8c3ff'
  primary: '#b8c3ff'
  on-primary: '#002388'
  primary-container: '#2e5bff'
  on-primary-container: '#efefff'
  inverse-primary: '#124af0'
  secondary: '#c1c7cf'
  on-secondary: '#2b3137'
  secondary-container: '#41474e'
  on-secondary-container: '#afb6bd'
  tertiary: '#4fdbc8'
  on-tertiary: '#003731'
  tertiary-container: '#007b6e'
  on-tertiary-container: '#b1fff1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#0035be'
  secondary-fixed: '#dde3eb'
  secondary-fixed-dim: '#c1c7cf'
  on-secondary-fixed: '#161c22'
  on-secondary-fixed-variant: '#41474e'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#11131c'
  on-background: '#e2e1ef'
  surface-variant: '#33343e'
typography:
  display-xl:
    fontFamily: notoSerif
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  narrative-h1:
    fontFamily: notoSerif
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  body-md:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  data-mono:
    fontFamily: spaceGrotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: spaceGrotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.15em
spacing:
  grid-unit: 8px
  gutter: 24px
  margin: 48px
  hud-padding: 12px
---

## Brand & Style

The design system is engineered to evoke the precision of an advanced astronomical observatory combined with the immersive quality of deep-space exploration. It prioritizes intellectual authority over entertainment, positioning itself as a high-fidelity research instrument for data-heavy environments.

The visual style blends **Minimalism** with sophisticated **Glassmorphism**. It utilizes a "Scientific Blueprint" aesthetic characterized by structural rigor, thin technical lines, and expansive negative space that mimics the vacuum of the cosmos. Every interface element is designed to feel like a functional component of a Head-Up Display (HUD), where clarity is paramount and every pixel serves a diagnostic purpose.

## Colors

This design system utilizes a palette rooted in absolute darkness to maximize contrast and focus. 

*   **Deep Space Black (#050505):** The foundation for all interfaces, providing an infinite canvas that minimizes eye strain and allows data to pop.
*   **Stellar White:** Used sparingly for primary text and high-contrast structural lines.
*   **Nebula Blue:** The primary interactive color, reserved for calls to action and active states.
*   **Oxygen Teal:** Dedicated to data readouts, technical metrics, and successful system states.
*   **Warning Amber:** A functional accent for theoretical data points, alerts, and speculative findings.

Surface colors are generated through opacity layers rather than solid grays, maintaining the "glass" aesthetic across all elevations.

## Typography

The typographic hierarchy distinguishes between narrative storytelling and technical data processing. 

**Noto Serif** is used for high-level headings to provide a sense of history, prestige, and academic rigor. **Inter** serves as the primary engine for body text, ensuring maximum readability in complex paragraphs. **Space Grotesk** is the functional workhorse for data visualizations, labels, and HUD readouts; its geometric construction reinforces the "blueprint" aesthetic. 

Always use uppercase for labels and technical metadata to mimic instrument markings.

## Layout & Spacing

This design system employs a **Fixed Grid** model based on an 8px technical scale. The layout should feel like a coordinated instrument panel rather than a traditional webpage.

*   **Grid:** A 12-column system with visible but subtle grid-line overlays (0.05 opacity).
*   **Margins:** Generous outer margins (48px+) ensure the content feels isolated and focused within the "void" of the screen.
*   **Rhythm:** Components are spaced with mathematical precision, using multiples of 8. Padding within HUD modules should be tighter (12px) to maintain a sense of density and data richness.

## Elevation & Depth

Depth is conveyed through **Glassmorphism** and tonal layering rather than traditional shadows. 

1.  **Floor:** The #050505 background.
2.  **Subsurface:** Subtle grid patterns and vector "blueprint" lines etched into the background.
3.  **Surface:** Semi-transparent containers with a `backdrop-filter: blur(20px)` and a 1px border of `rgba(255, 255, 255, 0.1)`.
4.  **Overlay:** Floating HUD elements with a higher opacity and a subtle "inner glow" of Nebula Blue to suggest active luminescence.

Avoid drop shadows. Instead, use a soft outer bloom (glow) for high-priority interactive elements to simulate light emission in a vacuum.

## Shapes

The shape language is strictly **Sharp (0px)**. This choice reinforces the precision-engineered, scientific nature of the design system. 

The only exception to the sharp-edge rule is for circular data nodes, orbital charts, or specifically designated "soft" UI alerts. All containers, buttons, and input fields must maintain 90-degree corners to align with the technical blueprint philosophy. Use thin 1px lines for all borders to maintain a lightweight, ethereal feel.

## Components

*   **Buttons:** Transparent backgrounds with a 1px border. On hover, the border glows with Nebula Blue and the text gains a slight bloom effect. No solid fills unless it is a critical "System Execute" action.
*   **HUD Cards:** Glass-morphic containers with top-left technical labels. They should include decorative "corner brackets" to emphasize the framing of data.
*   **Data Readouts:** Large numeric values using Space Grotesk, paired with a small uppercase Oxygen Teal label.
*   **Input Fields:** Minimalist design consisting of a single 1px bottom border that extends across the container width when focused.
*   **Gauges & Scopes:** Use thin circular paths and Oxygen Teal strokes to visualize progress or system capacity.
*   **Theoretical Labels:** Small, boxed tags using Warning Amber for hypothetical data points or unverified sources.
*   **Grid Overlays:** A persistent, low-opacity pixel grid should be togglable or subtly visible behind data-heavy views.