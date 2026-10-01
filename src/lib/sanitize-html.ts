/**
 * Allowlist HTML sanitizer for blog content pasted into the admin panel.
 *
 * Why this exists: the blog page renders `post.content` with
 * dangerouslySetInnerHTML. Pasted HTML (from Google Docs, Word, other sites)
 * routinely carries <html>/<body>/<style> wrappers, inline colours and fixed
 * widths that break the site design, and — if the admin account were ever
 * compromised or a pasted snippet were malicious — scripts and inline event
 * handlers. Everything not on the allowlist below is dropped; the result is
 * rebuilt from scratch, so nothing from the source markup is passed through
 * verbatim.
 *
 * Pure string code (no DOM / jsdom), so it runs on Cloudflare Workers.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "div", "span",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark", "small",
  "sub", "sup", "code", "pre", "kbd", "abbr", "cite", "q",
  "ul", "ol", "li",
  "blockquote",
  "a", "img", "figure", "figcaption", "picture", "source",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "iframe",
]);

/** Tags whose entire contents are discarded (not just the tag). */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "noscript", "template", "object", "embed", "applet",
  "head", "title", "svg", "math", "textarea", "select", "option", "button",
  "form", "link", "meta", "base", "frameset", "frame", "xmp", "plaintext",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "source", "col"]);

const GLOBAL_ATTRS = new Set(["id", "title", "lang", "dir"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "name"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  source: new Set(["src", "type", "media"]),
  td: new Set(["colspan", "rowspan", "scope", "headers"]),
  th: new Set(["colspan", "rowspan", "scope", "headers"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  ol: new Set(["start", "type", "reversed"]),
  li: new Set(["value"]),
  blockquote: new Set(["cite"]),
  q: new Set(["cite"]),
  iframe: new Set(["src", "allowfullscreen"]),
};

const SAFE_IFRAME_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "player.vimeo.com",
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  colon: ":", tab: "\t", newline: "\n", lpar: "(", rpar: ")",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    const named = NAMED_ENTITIES[e.toLowerCase()];
    return named !== undefined ? named : m;
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Returns a safe URL string, or null if the scheme/shape isn't allowed. */
function safeUrl(raw: string, kind: "link" | "image" | "iframe"): string | null {
  // Browsers ignore control chars/whitespace inside the scheme ("java\tscript:").
  const url = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]+/g, "");
  if (!url) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
  if (!scheme) {
    // relative, root-relative, protocol-relative, hash, query
    return url.startsWith("//") && kind === "iframe" ? null : url;
  }
  if (kind === "link") return ["http", "https", "mailto", "tel"].includes(scheme) ? url : null;
  if (kind === "image") {
    if (scheme === "http" || scheme === "https") return url;
    return /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(url) ? url : null;
  }
  if (scheme !== "https") return null;
  try {
    return SAFE_IFRAME_HOSTS.includes(new URL(url).hostname) ? url : null;
  } catch {
    return null;
  }
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function cleanText(s: string): string {
  // A "<" that did not form a tag must not be able to start one in the output.
  return s.replace(/</g, "&lt;");
}

function buildAttrs(tag: string, rawAttrs: string): string {
  const allowed = TAG_ATTRS[tag];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  let target = "";
  let hasHref = false;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(rawAttrs))) {
    const name = m[1].toLowerCase();
    if (name.startsWith("on") || name === "style") continue;
    if (!GLOBAL_ATTRS.has(name) && !allowed?.has(name)) continue;
    const value = m[2] ?? m[3] ?? m[4] ?? "";

    if (tag === "a" && name === "href") {
      const u = safeUrl(value, "link");
      if (u === null) continue;
      hasHref = true;
      out.push(`href="${escapeAttr(u)}"`);
    } else if ((tag === "img" || tag === "source") && name === "src") {
      const u = safeUrl(value, "image");
      if (u === null) continue;
      out.push(`src="${escapeAttr(u)}"`);
    } else if (tag === "iframe" && name === "src") {
      const u = safeUrl(value, "iframe");
      if (u === null) continue;
      out.push(`src="${escapeAttr(u)}"`);
    } else if (tag === "a" && name === "target") {
      target = value.toLowerCase() === "_blank" ? "_blank" : "";
    } else if (tag === "a" && name === "rel") {
      continue; // rebuilt below
    } else if (name === "id" || name === "name") {
      out.push(`${name}="${escapeAttr(value.replace(/[^\w:.-]/g, ""))}"`);
    } else if (["width", "height", "colspan", "rowspan", "span", "start", "value"].includes(name)) {
      if (/^\d{1,5}$/.test(value.trim())) out.push(`${name}="${value.trim()}"`);
    } else if (name === "allowfullscreen" || name === "reversed") {
      out.push(name);
    } else if (name === "loading") {
      continue; // set below
    } else {
      out.push(`${name}="${escapeAttr(decodeEntities(value))}"`);
    }
  }
  if (tag === "a" && hasHref && target) out.push('target="_blank"', 'rel="noopener noreferrer"');
  if (tag === "img") out.push('loading="lazy"', 'decoding="async"');
  if (tag === "iframe") out.push('loading="lazy"', 'referrerpolicy="strict-origin-when-cross-origin"');
  return out.length ? " " + out.join(" ") : "";
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export function sanitizeBlogHtml(input: string): string {
  let html = (input || "").replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  html = html.replace(/<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[^>]*>/g, "");
  if (!html.trim()) return "";
  // Content with no tags at all (plain text pasted in) -> paragraphs.
  if (!/<[a-zA-Z][^>]*>/.test(html)) return plainTextToHtml(html);

  const out: string[] = [];
  const openTables: number[] = [0];
  let skipUntil: string | null = null;
  let last = 0;
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;

  while ((m = TAG_RE.exec(html))) {
    const [full, slash, rawName, rawAttrs] = m;
    const tag = rawName.toLowerCase();
    const closing = slash === "/";

    if (skipUntil) {
      if (closing && tag === skipUntil) {
        skipUntil = null;
        last = m.index + full.length;
      }
      continue;
    }

    out.push(cleanText(html.slice(last, m.index)));
    last = m.index + full.length;

    if (DROP_WITH_CONTENT.has(tag)) {
      if (!closing && !VOID_TAGS.has(tag) && !/\/\s*$/.test(rawAttrs)) skipUntil = tag;
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue; // unwrap: html, body, font, o:p, ...

    if (tag === "iframe") {
      if (closing) { out.push("</iframe></div>"); continue; }
      const attrs = buildAttrs("iframe", rawAttrs);
      if (!/\ssrc="/.test(attrs)) { skipUntil = "iframe"; continue; }
      out.push(`<div class="blog-embed"><iframe${attrs}>`);
      continue;
    }

    // Page already has an <h1> (the post title); keep a single h1 for SEO.
    const outTag = tag === "h1" ? "h2" : tag;

    if (closing) {
      if (VOID_TAGS.has(tag)) continue;
      if (tag === "table") {
        if (openTables[0] > 0) { openTables[0]--; out.push("</table></div>"); }
        continue;
      }
      out.push(`</${outTag}>`);
      continue;
    }

    if (tag === "table") {
      openTables[0]++;
      out.push(`<div class="blog-table-wrap"><table${buildAttrs(tag, rawAttrs)}>`);
      continue;
    }
    out.push(`<${outTag}${buildAttrs(tag, rawAttrs)}>`);
  }

  if (!skipUntil) out.push(cleanText(html.slice(last)));
  while (openTables[0]-- > 0) out.push("</table></div>");
  return out.join("");
}
