# Project Rules

## Responsive Design (always follow)
Any web page, component, or UI change must be fully usable on both mobile and desktop at all times:
- Use fluid/responsive layouts (flexbox/grid, relative units) rather than fixed-width designs.
- Add appropriate breakpoints for common viewport widths (small phones, tablets, desktop, wide desktop).
- Touch targets (buttons, links, inputs) must be large enough and spaced for touch use on mobile.
- Avoid horizontal scrolling except for intentionally scrollable containers (e.g. wide tables/code blocks).
- Test/verify changes at both a mobile width (~375px) and a desktop width (~1440px) before considering the work done.
- Images and media must scale (`max-width: 100%`) and not overflow their containers.
