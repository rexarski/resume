// src/lib/markdown.ts
import { marked } from 'marked';

marked.setOptions({ gfm: true });

/**
 * Render inline-only Markdown to HTML.
 *
 * Supports: **bold**, _italic_ / *italic*, [link](url), `code`.
 * Block syntax (headings, lists, blockquotes) is intentionally not supported —
 * `parseInline` only matches inline tokens, so block markers pass through as text.
 */
export function inline(md: string): string {
  return marked.parseInline(md, { async: false }).toString();
}
