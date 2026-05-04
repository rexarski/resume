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
npx playwright install chromium   # one-time
npm run dev                        # http://localhost:4321/resume/ with hot reload
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
2. Lower `--fs-body` (currently `9.25pt`) by 0.25pt at a time.
3. Reduce `--space-section` and `--space-entry`.

## Deploy

Pushing to `main` triggers [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):

- Builds the site and PDF.
- Commits the regenerated PDF back to `main` (with `[skip ci]`) if it changed.
- Publishes `dist/` to GitHub Pages.

## Credits

This started life as a port of [Sourabh Bajaj's LaTeX resume template](https://github.com/sb2nov/resume); the LaTeX sources are preserved in [`archive/`](./archive). The format is MIT-licensed; the content is owned by Rui Qiu.
