import { readFileSync, mkdirSync, writeFileSync, watchFile } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "_site");

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- \[x\] (.+)$/gm, '<input type="checkbox" checked disabled> $1')
    .replace(/^- \[ \] (.+)$/gm, '<input type="checkbox" disabled> $1');
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,6} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${renderInline(line.slice(level + 1))}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push("<hr>");
      i += 1;
      continue;
    }

    if (/^> /.test(line)) {
      const quote = [];
      while (i < lines.length && /^> /.test(lines[i])) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      out.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((cell) => cell.trim()));
        i += 1;
      }
      const [head, ...body] = rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));
      out.push("<table><thead><tr>" + head.map((cell) => `<th>${renderInline(cell)}</th>`).join("") + "</tr></thead><tbody>");
      for (const row of body) {
        out.push("<tr>" + row.map((cell) => `<td>${renderInline(cell)}</td>`).join("") + "</tr>");
      }
      out.push("</tbody></table>");
      continue;
    }

    if (/^```/.test(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      out.push("<ol>");
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const item = lines[i].replace(/^\d+\. /, "");
        i += 1;
        const sub = [];
        while (i < lines.length && /^\s+\d+\. /.test(lines[i])) {
          sub.push(lines[i].trim().replace(/^\d+\. /, ""));
          i += 1;
        }
        if (sub.length) {
          out.push(`<li>${renderInline(item)}<ol>${sub.map((s) => `<li>${renderInline(s)}</li>`).join("")}</ol></li>`);
        } else {
          out.push(`<li>${renderInline(item)}</li>`);
        }
      }
      out.push("</ol>");
      continue;
    }

    if (/^- /.test(line)) {
      out.push("<ul>");
      while (i < lines.length && /^- /.test(lines[i])) {
        const item = lines[i].slice(2);
        i += 1;
        const sub = [];
        while (i < lines.length && /^  - /.test(lines[i])) {
          sub.push(lines[i].trim().slice(2));
          i += 1;
        }
        if (sub.length) {
          out.push(`<li>${renderInline(item)}<ul>${sub.map((s) => `<li>${renderInline(s)}</li>`).join("")}</ul></li>`);
        } else {
          out.push(`<li>${renderInline(item)}</li>`);
        }
      }
      out.push("</ul>");
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    out.push(`<p>${renderInline(line)}</p>`);
    i += 1;
  }

  return out.join("\n");
}

function build() {
  const layout = readFileSync(join(root, "_layouts/default.html"), "utf8");
  const md = readFileSync(join(root, "test.md"), "utf8").replace(/^---[\s\S]*?---\n?/, "");
  const content = renderMarkdown(md);
  const year = new Date().getFullYear();
  const html = layout
    .replace("{{ content }}", content)
    .replace(/\{\% if page\.title \%\}\{\{ page\.title \}\}\{\% elsif site\.title \%\}\{\{ site\.title \}\}\{\% else \%\}\{\{ site\.github\.repository_name \}\}\{\% endif \%\}/g, "Theme")
    .replace(/\{\{ "\/assets\/css\/theme\.css" \| relative_url \}\}\?\{\{ site\.time \| date: "%s%N" \}\}/g, "/assets/css/theme.css")
    .replace(/\{\{ site\.github\.owner_name \}\}/g, "nxrix")
    .replace(/\{\{ site\.github\.repository_name \}\}/g, "theme")
    .replace(/\{\{ site\.time \| date: "%Y" \}\}/g, String(year));

  mkdirSync(join(outDir, "assets/css"), { recursive: true });
  mkdirSync(join(outDir, "assets/font"), { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  writeFileSync(join(outDir, "test.html"), html);
  for (const rel of ["assets/css/theme.css", "assets/font/estedad.woff2"]) {
    writeFileSync(join(outDir, rel), readFileSync(join(root, rel)));
  }
}

function serve() {
  build();
  createServer((req, res) => {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = join(outDir, path.replace(/^\//, ""));
    try {
      const data = readFileSync(file);
      const type = file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".woff2")
          ? "font/woff2"
          : "text/html; charset=utf-8";
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  }).listen(4000, () => {
    console.log("Preview: http://127.0.0.1:4000/");
    console.log("Watching test.md, theme.css, and default.html");
  });

  for (const file of ["test.md", "assets/css/theme.css", "_layouts/default.html"]) {
    watchFile(join(root, file), { interval: 500 }, build);
  }
}

serve();
