# Frontend & React Design Workflow

When building or redesigning React pages and UI components, always follow this pipeline:

1. **Plan First (`Superpowers`):** Before writing code, briefly outline the page structure, component hierarchy, and user flow.
2. **Design System & Anti-Slop (`ui-ux-pro-max` + `taste-skill`):** 
   - Generate a cohesive design system (color tokens, font pairing, spacing scale) tailored to the brand before creating components.
   - Strictly follow `taste-skill` rules: avoid generic purple-blue AI gradients, cookie-cutter centered cards, and default boilerplate layouts.
3. **Clean React Architecture (`Vercel` + `Skills For Real React Engineers`):**
   - Build modular, reusable React components with clean TypeScript props and Tailwind CSS.
   - Run `code-simplifier` after building to remove redundant wrappers or messy state.
4. **Browser Verification:**
   - Start the local dev server and inspect the rendered desktop and mobile views (via Playwright/browser tools if available) to catch layout overflow, alignment, or contrast issues before finishing.
