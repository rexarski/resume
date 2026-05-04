---
title: Astro Resume — Design
date: 2026-05-04
status: draft
---

# Astro Resume — Design

Replace the existing LaTeX resume with an Astro-built single-page HTML resume that also renders to a print-quality PDF. Content lives in YAML with inline Markdown for bullet text. The site deploys to GitHub Pages at `https://rexarski.github.io/resume/`. The regenerated PDF is committed back to the repo root on every build.

## Goals

- Edit ergonomics first: changing the resume should mean editing one YAML file.
- Visual identity preserved: small-caps section headers with rule line, single-column ATS-friendly layout, dense typography. Refreshed to IBM Plex Sans with a single classic-navy accent on links.
- Print fidelity: PDF must be one page on US Letter, ATS-parseable (selectable text, tagged structure).
- Live web view at a stable URL, with a link to download the PDF.
- One source of truth (YAML), one build command, one stylesheet for the visual system.

## Non-goals

- Multi-page resumes. The design enforces one page; overflow is a build-time error.
- Multi-column or sidebar layouts. Single column for ATS safety.
- Themeing system or per-section variants. There is one resume.
- CMS or any runtime — the site is static.

## Stack

- Astro (static output) — content collections for typed YAML, single-page output.
- IBM Plex Sans (Google Fonts) — body, headings, names.
- Playwright (`chromium`) — `page.pdf({ tagged: true })` for the PDF render.
- `pdf-lib` — page-count check after PDF write (one-page guard).
- GitHub Actions + GitHub Pages — deploy on push to `main`.

## Repository layout

```
resume/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── src/
│   ├── content/
│   │   ├── config.ts              # Zod schema for resume collection
│   │   └── resume/
│   │       └── rui-qiu.yaml       # canonical resume content
│   ├── layouts/
│   │   └── ResumeLayout.astro     # <html>, <head>, fonts, stylesheet links
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Section.astro
│   │   ├── EntryHeading.astro
│   │   ├── BulletList.astro
│   │   ├── Skills.astro
│   │   └── Projects.astro
│   ├── pages/
│   │   └── index.astro            # composes the resume from content
│   └── styles/
│       ├── tokens.css             # CSS custom properties (colors, type, spacing)
│       ├── screen.css             # web view (page card, background)
│       └── print.css              # @page rules, page-break controls
├── scripts/
│   └── build-pdf.mjs              # Playwright + page-count guard
├── archive/
│   ├── rui_qiu_resume.tex
│   ├── glyphtounicode.tex
│   └── Dockerfile
├── rui_qiu_resume.pdf             # regenerated on every build, committed
├── README.md
└── .github/workflows/deploy.yml
```

## Content schema

Single Astro content collection (`type: 'data'`) validated by Zod. A typo in YAML fails the build with a precise error.

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const link = z.object({ label: z.string(), href: z.string().url() });

const resume = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().optional(),
      website: link,
      links: z.array(link),
    }),
    education: z.array(z.object({
      school: z.string(),
      location: z.string(),
      degree: z.string(),
      dates: z.string(),
    })),
    skills: z.array(z.object({
      category: z.string(),
      items: z.string(),
    })),
    experience: z.array(z.object({
      company: z.string(),
      location: z.string(),
      title: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),  // inline markdown allowed
    })),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string(),       // inline markdown allowed
      links: z.array(link),
    })),
  }),
});

export const collections = { resume };
```

`bullets` and `project.description` render through a small `markdown.ts` helper using `marked` configured to allow only inline marks (`**bold**`, `_italic_`, `[link](url)`, inline code) — no block-level elements, so a stray newline can never break the layout.

## Design system

All visual tokens in `src/styles/tokens.css`:

```css
:root {
  --ink:       #111418;
  --ink-soft:  #3a4150;
  --rule:      #d8dde5;
  --paper:     #ffffff;
  --accent:    #002855;            /* classic navy, links only */
  --accent-underline: rgba(0, 40, 85, 0.55);

  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --fs-name:   22pt;
  --fs-section: 11.5pt;
  --fs-body:   9.75pt;
  --fs-meta:   9.25pt;
  --lh-body:   1.32;
  --lh-tight:  1.18;

  --space-section: 10pt;
  --space-entry:   5pt;
  --space-bullet:  2pt;
}
```

Layout rules:

- Single column, US Letter, 0.5in margins.
- Header: name centered, 22pt small-caps. One contact line below, items separated by `·`. Links underlined in `--accent`.
- Each entry uses CSS Grid (`grid-template-columns: 1fr auto`) for the company/location and title/dates rows — print-stable, no float or flex hacks.
- Bullets use `<ul>` with a custom `::before` marker so wrapped lines align with the first character.
- Tabular numerals (`font-variant-numeric: tabular-nums`) so right-aligned date columns stay rigid.
- Accent (navy) appears only on links. All other text is `--ink` or `--ink-soft`.

Web view (`screen.css`) wraps the resume in a card on a `#eceef2` background; print view (`print.css`) collapses the card framing so only the content prints.

## Build pipeline

```jsonc
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && node scripts/build-pdf.mjs",
    "preview": "astro preview"
  }
}
```

`scripts/build-pdf.mjs`:

1. Launch `chromium` headless via Playwright.
2. Open `dist/index.html` (file URL), wait for `networkidle` so fonts load.
3. `emulateMedia({ media: 'print' })`.
4. `page.pdf({ format: 'Letter', margin: 0.5in × 4, printBackground: true, tagged: true })` → `rui_qiu_resume.pdf` at repo root.
5. Load the resulting PDF with `pdf-lib`; if `getPageCount() > 1`, exit with a non-zero status and a clear error message.

`tagged: true` produces a structured (accessible) PDF — better for ATS extraction and screen readers.

## Print CSS

```css
@page { size: letter; margin: 0.5in; }

@media print {
  body { background: white; }
  .page-frame, .caption, .no-print { display: none !important; }
  .resume {
    box-shadow: none;
    border: none;
    padding: 0;
    width: auto;
    min-height: 0;
  }
  section, .entry, .project { break-inside: avoid; page-break-inside: avoid; }
  a { color: var(--accent); text-decoration: underline; }
}
```

## Deploy

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://rexarski.github.io',
  base: '/resume',
  output: 'static',
});
```

`.github/workflows/deploy.yml`:

- Triggers: push to `main`, manual dispatch.
- Permissions: `contents: write`, `pages: write`, `id-token: write`.
- Steps: checkout → setup-node 20 → `npm ci` → `npx playwright install --with-deps chromium` → `npm run build`.
- After build: if `git diff --quiet rui_qiu_resume.pdf` reports a change, commit it back as `chore: regenerate PDF [skip ci]` (using `github-actions[bot]` as author).
- Upload `dist/` as a Pages artifact and deploy via `actions/deploy-pages@v4`.

The committed PDF means `https://github.com/rexarski/resume/raw/main/rui_qiu_resume.pdf` keeps working as a stable direct link.

The live page includes a small `.no-print` "Download PDF" link in the top right that points to the committed PDF, plus a "View source" link to the repo.

## Migration

- Move `rui_qiu_resume.tex`, `glyphtounicode.tex`, and `Dockerfile` to `archive/`.
- The existing `rui_qiu_resume.pdf` is overwritten on the first build.
- `.gitignore` additions: `node_modules/`, `dist/`, `.astro/`, `.superpowers/` (already added).
- README rewrite (below) replaces the LaTeX/Overleaf instructions.

## README rewrite

Replace the existing README with:

1. One-line intro: single-page resume, Astro + IBM Plex Sans + classic navy, HTML + PDF.
2. Live link (`https://rexarski.github.io/resume/`) and PDF link (raw `rui_qiu_resume.pdf`).
3. **How to customize** — the substantive section:
   - **Edit content:** open `src/content/resume/rui-qiu.yaml`. Show the schema with a small example. Note inline markdown in `bullets` and project `description`.
   - **Local development:** `npm install && npm run dev` → `localhost:4321`, hot reload.
   - **Build:** `npm run build` writes `dist/` and `rui_qiu_resume.pdf`. Fails if content overflows one page.
   - **Tweak the look:** every visual decision lives in `src/styles/tokens.css`. Change `--accent` to recolor links. Change `--font-sans` to swap typeface. Adjust `--fs-*` and `--space-*` to rebalance density.
   - **Add a section:** extend the Zod schema in `src/content/config.ts`, add the field to YAML, add markup in `src/pages/index.astro`.
   - **If content overflows one page:** trim bullets first; if not enough, lower `--fs-body` to 9.5pt; if still tight, reduce `--space-section` and `--space-entry`.
4. **Deploy:** pushing to `main` triggers GitHub Actions; the regenerated PDF is auto-committed.
5. **Credits & license:** retain the Sourabh Bajaj credit (this began as a port of his LaTeX template). MIT format, content owned by Rui Qiu.

## Testing and verification

Lightweight, no test framework needed:

1. `npm run build` exits 0 and produces `dist/index.html` and `rui_qiu_resume.pdf`.
2. The build script's page-count guard fails the build if PDF > 1 page.
3. PDF text is selectable (one-time manual check: open in Preview, Cmd+A, copy, paste — text matches what's on the page).
4. `npm run dev` renders identically to the approved preview.
5. Optional one-off accessibility check: `npx pa11y http://localhost:4321/resume/`.

## Risk and mitigation

- **Page overflow** — caught at build time by the `pdf-lib` page-count guard. The README documents the order of knobs to turn.
- **Font load timing in headless render** — addressed by `waitUntil: 'networkidle'`. If flaky, fall back to embedding IBM Plex Sans locally as `@font-face` woff2 files served from `public/`.
- **GitHub Actions PDF commit loop** — the `[skip ci]` tag in the auto-commit message prevents the workflow from re-triggering itself.
- **ATS parseability regression** — `tagged: true` plus single-column layout with semantic markup (real `<ul>`, `<section>`, `<h1>`/`<h2>`) keeps extraction reliable. PDF text remains selectable.

## Out of scope

- Themes, dark mode, alternative resume variants.
- Multi-language support.
- Multi-page resumes (and any auto-paginating layout).
- Print-targeted features beyond what `page.pdf()` provides (no Paged.js).
- Tests beyond the build-time page-count guard.
