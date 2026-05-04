// scripts/build-pdf.mjs
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const indexHtml = path.resolve(root, 'dist/index.html');
const outPdf = path.resolve(root, 'rui_qiu_resume.pdf');
const distPdf = path.resolve(root, 'dist/rui_qiu_resume.pdf');

await fs.access(indexHtml).catch(() => {
  console.error('dist/index.html not found — run `astro build` first.');
  process.exit(1);
});

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`file://${indexHtml}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
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

await fs.copyFile(outPdf, distPdf);

console.log(`Wrote ${path.relative(root, outPdf)} (1 page) and copied to dist/.`);
