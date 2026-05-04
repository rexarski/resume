# Astro Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the LaTeX resume with an Astro-built single-page HTML resume that also renders to a one-page, ATS-parseable PDF, with content authored as YAML + inline Markdown.

**Architecture:** Astro static site reads a single YAML data file via a Zod-validated content collection, renders one page (`/`), and emits a PDF via headless Chromium (Playwright `page.pdf({ tagged: true })`). A `pdf-lib` page-count guard fails the build if content overflows one page. Deployed to GitHub Pages; the regenerated PDF is committed back to repo root by GitHub Actions.

**Tech Stack:** Astro 4, TypeScript, Zod (via `astro:content`), `marked` (inline-only), IBM Plex Sans via Google Fonts, Playwright `chromium`, `pdf-lib`, GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-05-04-astro-resume-design.md` — read this before starting.

**Verification model:** No test framework. Each task is verified by running the relevant build/dev command and confirming expected output. The build itself enforces the strongest invariant: PDF must be exactly one page or build fails.

---

## File Map

**Create:**
- `package.json` — npm scripts, dependencies
- `tsconfig.json` — Astro's strict TS preset
- `astro.config.mjs` — site, base path, static output
- `src/content/config.ts` — Zod schema for resume collection
- `src/content/resume/rui-qiu.yaml` — canonical resume content (ported from `archive/rui_qiu_resume.tex`)
- `src/lib/markdown.ts` — inline-only Markdown helper
- `src/styles/tokens.css` — CSS custom properties (color, type, spacing)
- `src/styles/screen.css` — web view (page card, background)
- `src/styles/print.css` — `@page` rules, page-break controls
- `src/layouts/ResumeLayout.astro` — `<html>`, `<head>`, fonts, stylesheet links
- `src/components/Header.astro` — name + contact strip
- `src/components/Section.astro` — generic section wrapper (heading + slot)
- `src/components/EntryHeading.astro` — two-row company/title/dates grid
- `src/components/BulletList.astro` — `<ul>` with inline-markdown bullets
- `src/components/Skills.astro` — category : items rows
- `src/components/Projects.astro` — project list with description + links
- `src/pages/index.astro` — composes the resume from content
- `scripts/build-pdf.mjs` — Playwright PDF render + page-count guard
- `.github/workflows/deploy.yml` — Pages deploy + PDF auto-commit
- `public/.nojekyll` — disable Jekyll on Pages

**Modify:**
- `.gitignore` — add `node_modules/`, `dist/`, `.astro/`
- `README.md` — full rewrite per spec §"README rewrite"

---

## Task 1: Scaffold Astro project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `astro.config.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "resume",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && node scripts/build-pdf.mjs",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "^4.16.0",
    "marked": "^14.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "pdf-lib": "^1.17.1",
    "playwright": "^1.48.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "archive"]
}
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://rexarski.github.io',
  base: '/resume',
  output: 'static',
  trailingSlash: 'ignore',
});
```

- [ ] **Step 4: Add ignores**

Append to `.gitignore`:

```
# Node / Astro
node_modules/
dist/
.astro/
```

- [ ] **Step 5: Install dependencies**

Run:
```bash
npm install
npx playwright install --with-deps chromium
```

Expected: clean install, no peer-dep warnings beyond Astro's normal output. `node_modules/` populated.

- [ ] **Step 6: Verify Astro recognizes the project**

Run: `npx astro check --help`
Expected: prints help text, exits 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs .gitignore
git commit -m "feat: scaffold Astro project"
```

---

## Task 2: Content collection schema

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Write the Zod schema**

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const link = z.object({
  label: z.string(),
  href: z.string().url(),
});

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
      bullets: z.array(z.string()),
    })),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string(),
      links: z.array(link),
    })),
  }),
});

export const collections = { resume };
```

- [ ] **Step 2: Commit**

```bash
git add src/content/config.ts
git commit -m "feat: add Zod schema for resume content"
```

---

## Task 3: Resume content (YAML)

**Files:**
- Create: `src/content/resume/rui-qiu.yaml`

Ported from `archive/rui_qiu_resume.tex`. Bullets keep inline markdown (`**bold**`, `[text](url)`).

- [ ] **Step 1: Write the YAML**

```yaml
# src/content/resume/rui-qiu.yaml
name: Rui Qiu

contact:
  email: rq47@georgetown.edu
  phone: "(571) 363-5917"
  website:
    label: rexarski.com
    href: https://rexarski.com
  links:
    - label: github/rexarski
      href: https://github.com/rexarski
    - label: linkedin/rqiu
      href: https://www.linkedin.com/in/rqiu

education:
  - school: Georgetown University
    location: Washington D.C., United States
    degree: "Master of Science in Data Science and Analytics. cGPA: 4.0"
    dates: Aug. 2021 – May 2023
  - school: The Australian National University
    location: Canberra, Australia
    degree: Master of Science in Statistics
    dates: Feb. 2017 – Dec. 2018
  - school: University of Toronto
    location: Toronto, Canada
    degree: Honors B.Sc. with Distinction (Maths, Statistics, Computer Science)
    dates: Sept. 2011 – June 2016

skills:
  - category: Programming
    items: Python, R, SQL, JavaScript, HTML, CSS, Java
  - category: Machine Learning
    items: pytorch, langchain, tidyverse, tidymodels, caret, scikit-learn, numpy, pandas
  - category: Visualization
    items: ggplot2, Shiny, d3.js, matplotlib, seaborn, plotly, leaflet, bokeh
  - category: Data Science
    items: A/B testing, ETL pipelines, feature engineering, NLP, time series, PCA, hypothesis testing
  - category: Big Data & Tooling
    items: AWS (EC2, EMR, S3, SageMaker), Azure, Databricks, Spark, Hadoop, MongoDB, Docker, Linux, Hugo, Figma

experience:
  - company: International Finance Corporation (World Bank Group)
    location: Washington, D.C.
    title: Data Scientist
    dates: May 2022 – Present
    bullets:
      - "Leveraged GPT-3.5 and **LangChain** to enable contextual Q&A on IFC's ESG reports, saving ~90% of analyst extraction time."
      - "Fine-tuned **ClimateBERT** on climate-related downstream tasks, improving fact-checking accuracy by 6%."
      - "Integrated the model into MALENA (Machine Learning ESG Analyst), demonstrating real-world utility for NLP tasks."
      - "Designed interactive dashboards with stakeholders for clearer insight communication."

  - company: Georgetown University
    location: Washington, D.C.
    title: Teaching Assistant / Bootcamp Manager
    dates: Aug. 2021 – Aug. 2022
    bullets:
      - "Graduate TA for ANLY-503 (Advanced Data Visualization) and ANLY-560 (Time Series); held weekly office hours and graded for 30+ students."
      - "Facilitated course materials, managed the course Slack channel, and organized the course GitHub organization."

  - company: K2L Canberra
    location: Canberra, Australia
    title: Product Data Analyst
    dates: July 2019 – June 2021
    bullets:
      - "Used Python and SQL to track product data, increasing recommendation accuracy by 15%."
      - "Built MySQL/R visualizations for KPIs, cutting manual reporting time by 3 hours per week."
      - "Improved UX metrics by 20% via increased feedback collection and rapid iteration on customer needs."
      - "Launched 6 client products (websites, mobile and web apps) in 2 years, contributing to a 65% revenue increase."

  - company: K2L
    location: Canberra, Australia
    title: Co-founder / Data Analyst
    dates: Feb. 2019 – June 2019
    bullets:
      - "Led a team of 12 in developing an online Q&A community blending StackOverflow and TikTok concepts; grew to 1,000 users in 3 months."
      - "Conducted market competition analysis using scraped data to inform initial product planning."
      - "Developed functional prototypes that improved client communication efficiency by 30%."

projects:
  - name: What Ingredients Are You Tasting In Authentic Japanese Flavors?
    description: Comprehensive interactive visualization on Japanese cuisine with D3, plotly and leaflet.
    links:
      - label: Website
        href: https://celeritasml.github.io/project-japanese-cuisine/
  - name: Basketball Analytics and Beyond
    description: A project on various basketball-related topics, both on-court and off-court.
    links:
      - label: Website
        href: https://rexarski.github.io/bba
  - name: tarantino
    description: An R package generating color palettes inspired by Quentin Tarantino's films for visualization.
    links:
      - label: R-Weekly
        href: https://rweekly.org/2021-W14.html
      - label: repository
        href: https://github.com/rexarski/tarantino
  - name: "@canberramapbot"
    description: A Twitter bot that uses Mapbox and Twitter APIs to post bird's-eye views over Canberra.
    links:
      - label: Repository
        href: https://github.com/rexarski/canberramapbot
```

- [ ] **Step 2: Verify schema validates the data**

Run: `npx astro sync`
Expected: exits 0, no Zod errors. Generates `.astro/types.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/content/resume/rui-qiu.yaml
git commit -m "feat: add resume content as YAML"
```

---

## Task 4: Inline-only Markdown helper

**Files:**
- Create: `src/lib/markdown.ts`

Resumes need only inline marks. Block elements (headings, lists inside bullets) would break layout. We configure `marked` to parse and then strip the wrapping `<p>` so we can drop the result inside our own `<li>` / `<span>`.

- [ ] **Step 1: Write the helper**

```ts
// src/lib/markdown.ts
import { marked } from 'marked';

const renderer = new marked.Renderer();

// Disable block elements — return the raw text so block constructs degrade
// to plain text rather than producing unexpected markup inside bullets.
renderer.heading = ({ text }) => text;
renderer.list = ({ raw }) => raw;
renderer.listitem = ({ text }) => text;
renderer.blockquote = ({ text }) => text;
renderer.code = ({ text }) => text;
renderer.hr = () => '';
renderer.paragraph = ({ tokens }) => marked.parser(tokens, { renderer }).trim();

marked.setOptions({ renderer, gfm: true, breaks: false });

/** Render a string of inline-only markdown to HTML. */
export function inline(md: string): string {
  // marked.parse wraps in <p>; we render via the paragraph renderer above
  // which returns just the inline content. Trim whitespace to be safe.
  return marked.parse(md, { async: false }).toString().trim();
}
```

- [ ] **Step 2: Smoke-test it interactively**

Run:
```bash
node --input-type=module -e "import('./src/lib/markdown.ts').catch(()=>{}); console.log('ok')"
```

(TypeScript can't run directly under node, so a real verification happens during the first Astro build in Task 11. Skip this step if it errors — it's optional.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/markdown.ts
git commit -m "feat: add inline-only markdown helper"
```

---

## Task 5: Design tokens

**Files:**
- Create: `src/styles/tokens.css`

These are the only knobs to tune the visual system later. Every other stylesheet references them.

- [ ] **Step 1: Write tokens**

```css
/* src/styles/tokens.css */
:root {
  /* Color */
  --ink:       #111418;
  --ink-soft:  #3a4150;
  --rule:      #d8dde5;
  --paper:     #ffffff;
  --accent:    #002855;
  --accent-underline: rgba(0, 40, 85, 0.55);
  --page-bg:   #eceef2;

  /* Typography */
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --fs-name:    22pt;
  --fs-section: 11.5pt;
  --fs-body:    9.75pt;
  --fs-meta:    9.25pt;
  --lh-body:    1.32;
  --lh-tight:   1.18;

  /* Rhythm */
  --space-section: 10pt;
  --space-entry:   5pt;
  --space-bullet:  2pt;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add design tokens"
```

---

## Task 6: Screen and print CSS

**Files:**
- Create: `src/styles/screen.css`
- Create: `src/styles/print.css`

- [ ] **Step 1: Write `screen.css`**

```css
/* src/styles/screen.css */
@import "./tokens.css";

html, body {
  margin: 0;
  padding: 0;
  background: var(--page-bg);
  font-family: var(--font-sans);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.page-frame {
  padding: 32px 16px 64px;
  display: flex;
  justify-content: center;
}

.resume {
  width: 8.5in;
  min-height: 11in;
  padding: 0.5in;
  background: var(--paper);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08);
  border: 1px solid #e3e6ec;
  box-sizing: border-box;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.name {
  font-size: var(--fs-name);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
  margin: 0 0 4px;
  font-variant: small-caps;
}

.contact {
  text-align: center;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
  margin-bottom: 14pt;
}
.contact .sep { color: #b8becb; margin: 0 0.5em; }

section { margin-top: var(--space-section); }
section > h2 {
  font-size: var(--fs-section);
  font-weight: 600;
  font-variant: small-caps;
  letter-spacing: 0.06em;
  margin: 0 0 4pt;
  padding-bottom: 2pt;
  border-bottom: 1px solid var(--rule);
  color: var(--ink);
}

.row {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: 12pt;
  align-items: baseline;
  margin-top: var(--space-entry);
}
.row .right {
  text-align: right;
  color: var(--ink-soft);
  font-size: var(--fs-meta);
  white-space: nowrap;
}
.primary  { font-weight: 600; }
.secondary { font-style: italic; color: var(--ink-soft); font-size: var(--fs-meta); }
.entry .row + .row { margin-top: 1pt; }

ul.bullets { margin: 3pt 0 0; padding-left: 14pt; list-style: none; }
ul.bullets li { position: relative; margin-bottom: var(--space-bullet); }
ul.bullets li::before {
  content: "•";
  position: absolute;
  left: -10pt;
  color: var(--ink-soft);
}

.skills .row { grid-template-columns: max-content 1fr; column-gap: 8pt; margin-top: 2pt; }
.skills .cat { font-weight: 600; }

.project { margin-top: var(--space-entry); }
.project .pname { font-weight: 600; }

a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-color: var(--accent-underline);
  text-underline-offset: 2px;
}

.utility-bar {
  position: fixed;
  top: 12px;
  right: 16px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-soft);
}
.utility-bar a { color: var(--ink-soft); }

.footer {
  margin-top: 18pt;
  text-align: right;
  font-size: 7.5pt;
  color: #8a91a0;
}
```

- [ ] **Step 2: Write `print.css`**

```css
/* src/styles/print.css */
@page { size: letter; margin: 0.5in; }

@media print {
  html, body { background: white; }
  .page-frame, .utility-bar, .no-print { display: none !important; }
  .resume {
    box-shadow: none;
    border: none;
    padding: 0;
    width: auto;
    min-height: 0;
  }
  section, .entry, .project { break-inside: avoid; page-break-inside: avoid; }
  a {
    color: var(--accent);
    text-decoration: underline;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/screen.css src/styles/print.css
git commit -m "feat: add screen and print stylesheets"
```

---

## Task 7: ResumeLayout component

**Files:**
- Create: `src/layouts/ResumeLayout.astro`

- [ ] **Step 1: Write the layout**

```astro
---
// src/layouts/ResumeLayout.astro
interface Props { name: string }
const { name } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{name} — Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <link rel="stylesheet" href={`${import.meta.env.BASE_URL}/styles.css`} />
</head>
<body>
  <slot />
</body>
</html>
```

Note: `styles.css` is bundled by Astro automatically when imported from a page; we don't actually need this `<link>` — Astro injects style tags. Remove the `<link rel="stylesheet" href=...>` line; we'll import the CSS in `index.astro` instead. (Documenting the false start here so the engineer doesn't repeat it.)

- [ ] **Step 2: Apply the correction (remove the stylesheet `<link>`)**

Final layout content:

```astro
---
// src/layouts/ResumeLayout.astro
interface Props { name: string }
const { name } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{name} — Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</head>
<body>
  <slot />
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/layouts/ResumeLayout.astro
git commit -m "feat: add ResumeLayout"
```

---

## Task 8: Header component

**Files:**
- Create: `src/components/Header.astro`

- [ ] **Step 1: Write Header**

```astro
---
// src/components/Header.astro
interface Link { label: string; href: string }
interface Props {
  name: string;
  email: string;
  phone?: string;
  website: Link;
  links: Link[];
}
const { name, email, phone, website, links } = Astro.props;
---
<h1 class="name">{name}</h1>
<div class="contact">
  <a href={`mailto:${email}`}>{email}</a>
  {phone && (<><span class="sep">·</span>{phone}</>)}
  <span class="sep">·</span>
  <a href={website.href}>{website.label}</a>
  {links.map((l) => (
    <>
      <span class="sep">·</span>
      <a href={l.href}>{l.label}</a>
    </>
  ))}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat: add Header component"
```

---

## Task 9: Section, EntryHeading, BulletList components

**Files:**
- Create: `src/components/Section.astro`
- Create: `src/components/EntryHeading.astro`
- Create: `src/components/BulletList.astro`

- [ ] **Step 1: Write Section**

```astro
---
// src/components/Section.astro
interface Props { title: string; class?: string }
const { title, class: className } = Astro.props;
---
<section class={className}>
  <h2>{title}</h2>
  <slot />
</section>
```

- [ ] **Step 2: Write EntryHeading**

```astro
---
// src/components/EntryHeading.astro
interface Props {
  primary: string;
  primaryRight: string;
  secondary: string;
  secondaryRight: string;
}
const { primary, primaryRight, secondary, secondaryRight } = Astro.props;
---
<div class="entry">
  <div class="row">
    <div class="primary">{primary}</div>
    <div class="right">{primaryRight}</div>
  </div>
  <div class="row">
    <div class="secondary">{secondary}</div>
    <div class="right secondary">{secondaryRight}</div>
  </div>
  <slot />
</div>
```

- [ ] **Step 3: Write BulletList**

```astro
---
// src/components/BulletList.astro
import { inline } from '../lib/markdown';
interface Props { items: string[] }
const { items } = Astro.props;
---
<ul class="bullets">
  {items.map((item) => <li set:html={inline(item)} />)}
</ul>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Section.astro src/components/EntryHeading.astro src/components/BulletList.astro
git commit -m "feat: add Section, EntryHeading, BulletList components"
```

---

## Task 10: Skills and Projects components

**Files:**
- Create: `src/components/Skills.astro`
- Create: `src/components/Projects.astro`

- [ ] **Step 1: Write Skills**

```astro
---
// src/components/Skills.astro
interface SkillRow { category: string; items: string }
interface Props { rows: SkillRow[] }
const { rows } = Astro.props;
---
<div class="skills">
  {rows.map((r) => (
    <div class="row">
      <span class="cat">{r.category}</span>
      <span class="items">{r.items}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Write Projects**

```astro
---
// src/components/Projects.astro
import { inline } from '../lib/markdown';
interface Link { label: string; href: string }
interface Project { name: string; description: string; links: Link[] }
interface Props { items: Project[] }
const { items } = Astro.props;
---
{items.map((p) => (
  <div class="project">
    <span class="pname">{p.name}</span>
    {' — '}
    <span class="pdesc" set:html={inline(p.description)} />
    {' '}
    <span class="plinks">
      {p.links.map((l, i) => (
        <>
          {i === 0 ? '[' : ' ['}<a href={l.href}>{l.label}</a>]
        </>
      ))}
    </span>
  </div>
))}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Skills.astro src/components/Projects.astro
git commit -m "feat: add Skills and Projects components"
```

---

## Task 11: Compose the page

**Files:**
- Create: `src/pages/index.astro`

This is where everything comes together. The CSS imports here cause Astro to bundle styles into the build.

- [ ] **Step 1: Write `index.astro`**

```astro
---
// src/pages/index.astro
import { getEntry } from 'astro:content';
import ResumeLayout from '../layouts/ResumeLayout.astro';
import Header from '../components/Header.astro';
import Section from '../components/Section.astro';
import EntryHeading from '../components/EntryHeading.astro';
import BulletList from '../components/BulletList.astro';
import Skills from '../components/Skills.astro';
import Projects from '../components/Projects.astro';

import '../styles/screen.css';
import '../styles/print.css';

const r = await getEntry('resume', 'rui-qiu');
if (!r) throw new Error('Resume content not found at src/content/resume/rui-qiu.yaml');
const data = r.data;

const today = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  .format(new Date());

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
const pdfHref = `${baseUrl}/rui_qiu_resume.pdf`;
const repoHref = 'https://github.com/rexarski/resume';
---
<ResumeLayout name={data.name}>
  <div class="utility-bar no-print">
    <a href={pdfHref}>Download PDF</a>
    <a href={repoHref}>Source</a>
  </div>

  <div class="page-frame">
    <div class="resume">
      <Header
        name={data.name}
        email={data.contact.email}
        phone={data.contact.phone}
        website={data.contact.website}
        links={data.contact.links}
      />

      <Section title="Education">
        {data.education.map((e) => (
          <EntryHeading
            primary={e.school}
            primaryRight={e.location}
            secondary={e.degree}
            secondaryRight={e.dates}
          />
        ))}
      </Section>

      <Section title="Skills" class="skills-section">
        <Skills rows={data.skills} />
      </Section>

      <Section title="Experience">
        {data.experience.map((x) => (
          <EntryHeading
            primary={x.company}
            primaryRight={x.location}
            secondary={x.title}
            secondaryRight={x.dates}
          >
            <BulletList items={x.bullets} />
          </EntryHeading>
        ))}
      </Section>

      <Section title="Projects">
        <Projects items={data.projects} />
      </Section>

      <div class="footer">Last updated on {today}</div>
    </div>
  </div>
</ResumeLayout>
```

- [ ] **Step 2: Run dev server and visually inspect**

Run: `npm run dev`
Open: `http://localhost:4321/resume/`
Expected: page renders with name, contacts, all sections populated from YAML. Visual matches the brainstorm preview at `.superpowers/brainstorm/<session>/content/resume-preview.html`.

- [ ] **Step 3: Run a static build (without PDF — that's Task 12)**

Stop the dev server. Run: `npx astro build`
Expected: `dist/` directory created, `dist/index.html` exists and contains the resume markup.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: compose resume page from content"
```

---

## Task 12: PDF build script with one-page guard

**Files:**
- Create: `scripts/build-pdf.mjs`

- [ ] **Step 1: Write the script**

```js
// scripts/build-pdf.mjs
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const indexHtml = path.resolve(root, 'dist/index.html');
const outPdf = path.resolve(root, 'rui_qiu_resume.pdf');

await fs.access(indexHtml).catch(() => {
  console.error('dist/index.html not found — run `astro build` first.');
  process.exit(1);
});

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`file://${indexHtml}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  // Wait for fonts to fully settle so glyph metrics are stable
  await page.evaluate(() => document.fonts.ready);

  await page.pdf({
    path: outPdf,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    tagged: true,
  });
} finally {
  await browser.close();
}

const bytes = await fs.readFile(outPdf);
const pages = (await PDFDocument.load(bytes)).getPageCount();
if (pages !== 1) {
  console.error(`PDF is ${pages} pages — resume must fit on exactly 1.`);
  console.error('Trim bullets, lower --fs-body in tokens.css, or reduce --space-* tokens.');
  process.exit(1);
}

console.log(`Wrote ${path.relative(root, outPdf)} (1 page).`);
```

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected:
- Astro build runs first (`Completed in ...ms`).
- Script logs `Wrote rui_qiu_resume.pdf (1 page).`
- Exit code 0.

- [ ] **Step 3: Manually verify the PDF**

Open `rui_qiu_resume.pdf`:
- Visually matches the dev server view (no on-screen page card framing).
- Text is selectable: `⌘A`, `⌘C`, paste somewhere — the resume text appears.
- One page only.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-pdf.mjs rui_qiu_resume.pdf
git commit -m "feat: render resume to PDF with one-page guard"
```

---

## Task 13: GitHub Pages config & disable Jekyll

**Files:**
- Create: `public/.nojekyll`

GitHub Pages defaults to Jekyll, which would try to interpret/skip files starting with underscore. Astro emits some `_astro/` chunks. The `.nojekyll` file disables Jekyll processing.

- [ ] **Step 1: Create the file**

```bash
mkdir -p public
touch public/.nojekyll
```

- [ ] **Step 2: Verify it ends up in `dist/` after build**

Run: `npm run build`
Expected: `dist/.nojekyll` exists.

- [ ] **Step 3: Commit**

```bash
git add public/.nojekyll
git commit -m "chore: disable Jekyll on GitHub Pages"
```

---

## Task 14: Deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy resume

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npx playwright install --with-deps chromium

      - run: npm run build

      - name: Commit regenerated PDF if changed
        run: |
          if ! git diff --quiet rui_qiu_resume.pdf; then
            git config user.name  "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add rui_qiu_resume.pdf
            git commit -m "chore: regenerate PDF [skip ci]"
            git push
          fi

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit (do NOT push yet — that's after Task 16)**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deploy workflow"
```

---

## Task 15: Enable Pages on the repo

This is a one-time GitHub UI / `gh` action; not code. Doing it before pushing the workflow avoids the first run failing on a missing Pages environment.

- [ ] **Step 1: Enable Pages**

Run:
```bash
gh api -X POST repos/rexarski/resume/pages \
  -f "build_type=workflow" \
  -H "Accept: application/vnd.github+json"
```

Expected: returns JSON with `"html_url": "https://rexarski.github.io/resume/"`.

If it errors with `"Pages already enabled"`, that's fine — skip.

- [ ] **Step 2: Note the URL**

The site will be available at `https://rexarski.github.io/resume/` after the first successful workflow run.

---

## Task 16: README rewrite

**Files:**
- Modify: `README.md` (full overwrite)

- [ ] **Step 1: Replace contents of `README.md`**

```markdown
# Resume

Single-page resume for Rui Qiu, built with [Astro](https://astro.build), styled with IBM Plex Sans and a classic-navy accent. Renders to both a live web page and a one-page, ATS-parseable PDF.

- **Live:** <https://rexarski.github.io/resume/>
- **PDF:** [`rui_qiu_resume.pdf`](./rui_qiu_resume.pdf)

## How to customize

### Edit your content

Open [`src/content/resume/rui-qiu.yaml`](./src/content/resume/rui-qiu.yaml). The whole resume lives there — header, education, skills, experience, projects.

```yaml
experience:
  - company: World Bank Group
    location: Washington, D.C.
    title: Data Scientist
    dates: May 2022 – Present
    bullets:
      - "Leveraged **GPT-3.5** and [LangChain](https://www.langchain.com/) for ESG report Q&A."
```

`bullets` and project `description` accept inline Markdown: `**bold**`, `_italic_`, `[link](url)`, `` `code` ``. Block-level Markdown (headings, sub-lists, etc.) is intentionally not supported so layout never breaks.

The schema is enforced by Zod ([`src/content/config.ts`](./src/content/config.ts)) — typos and missing fields fail the build with a precise error.

### Local development

```bash
npm install
npx playwright install --with-deps chromium  # one-time
npm run dev   # http://localhost:4321/resume/ with hot reload
```

### Build

```bash
npm run build
```

This runs `astro build` and then `scripts/build-pdf.mjs`, producing:
- `dist/` — static site
- `rui_qiu_resume.pdf` — one-page PDF (build fails if it overflows)

### Tweak the look

Every visual decision lives in [`src/styles/tokens.css`](./src/styles/tokens.css):

| Token | Purpose |
| --- | --- |
| `--accent` | Link color (everything else is neutral). |
| `--font-sans` | Body typeface. |
| `--fs-name`, `--fs-section`, `--fs-body`, `--fs-meta` | Type scale (in points). |
| `--space-section`, `--space-entry`, `--space-bullet` | Vertical rhythm. |
| `--ink`, `--ink-soft`, `--rule` | Greyscale palette. |

Layout rules and component-level styles live in [`src/styles/screen.css`](./src/styles/screen.css); print-only rules in [`src/styles/print.css`](./src/styles/print.css).

### Add a new section

1. Extend the Zod schema in `src/content/config.ts`.
2. Add the field to `src/content/resume/rui-qiu.yaml`.
3. Add markup to `src/pages/index.astro` (and a component under `src/components/` if needed).

### If content overflows one page

The build fails with a one-page guard. Knobs to turn, in order:

1. Trim bullets.
2. Lower `--fs-body` from `9.75pt` to `9.5pt`.
3. Reduce `--space-section` and `--space-entry`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`:
- Builds the site and PDF.
- Commits the regenerated PDF back to `main` (with `[skip ci]`) if it changed.
- Publishes `dist/` to GitHub Pages.

## Credits

This started life as a port of [Sourabh Bajaj's LaTeX resume template](https://github.com/sb2nov/resume); the LaTeX sources are preserved in [`archive/`](./archive). The format is MIT-licensed; the content is owned by Rui Qiu.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for Astro setup"
```

---

## Task 17: Final verification

- [ ] **Step 1: Clean rebuild from scratch**

```bash
rm -rf node_modules dist .astro rui_qiu_resume.pdf
npm install
npm run build
```

Expected: exits 0, produces `dist/index.html` and a 1-page `rui_qiu_resume.pdf`.

- [ ] **Step 2: Spot-check selectable PDF text**

Open `rui_qiu_resume.pdf` in Preview, select all, copy, paste into a scratch buffer. The text should match what's on the page (name, sections, bullets, links).

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Watch the workflow**

Run: `gh run watch`
Expected: build completes, deploy completes, the live URL `https://rexarski.github.io/resume/` is reachable within ~1 minute after the deploy step finishes.

- [ ] **Step 5: Verify live page and committed PDF**

- Open `https://rexarski.github.io/resume/` in a browser → matches local view.
- `https://github.com/rexarski/resume/raw/main/rui_qiu_resume.pdf` downloads the latest PDF.

- [ ] **Step 6: Optional — accessibility smoke**

```bash
npx pa11y http://localhost:4321/resume/  # while dev server is running
```

Skip on failure; ATS parseability is the harder requirement and is met by `tagged: true` in the PDF render.

---

## Self-review notes

- **Spec coverage:** every spec section is mapped to a task. Stack → Task 1; schema → Task 2; content → Task 3; markdown helper → Task 4; tokens/screen/print CSS → Tasks 5–6; layout & components → Tasks 7–10; page composition → Task 11; PDF + page-count guard → Task 12; Pages config (`.nojekyll`) → Task 13; deploy workflow → Tasks 14–15; README rewrite → Task 16; testing/verification → Task 17.
- **Placeholders:** none. Every step contains code or exact commands.
- **Type consistency:** schema field names (`name`, `contact`, `education`, `skills`, `experience`, `projects`) are used identically in YAML, components, and `index.astro`. The `BulletList` `items` and `Skills` `rows` props match their consumer call sites.
- **`marked` API note:** the renderer overrides above target marked v14's object-arg renderer signature (`{ text }`, `{ tokens }`, etc.). If using marked v12 or earlier, the renderer signatures use positional arguments — pin to `^14.1.0` per Task 1's `package.json`.
