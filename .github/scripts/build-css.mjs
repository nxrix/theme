import {writeFileSync} from "node:fs";

const src = "https://cdn.jsdelivr.net/npm/@observablehq/notebook-kit/dist/src/";

const global = (await (await fetch(src + "styles/global.css")).text())
  .replace("Source Serif 4 Variable", "Source Serif 4")
  .replace("Inter Variable", "Inter")
  .replace("Spline Sans Mono Variable", "Spline Sans Mono");

const inspector = await (await fetch(src + "styles/inspector.css")).text();

const highlight = await (await fetch(src + "styles/highlight.css")).text();

const plot = await (await fetch(src + "styles/plot.css")).text();

const indexFull = await (await fetch(src + "styles/index.css")).text();
const index = indexFull.slice(indexFull.indexOf(";", indexFull.lastIndexOf("@import")) + 1).trim();

const inputsFull = await (await fetch(src + "runtime/stdlib/inputs.css")).text();
const inputs = inputsFull
  .slice(inputsFull.indexOf(";", inputsFull.lastIndexOf("@import")) + 1)
  .trim()
  .replace(/;(\s*})/g, " !important;$1");

const fixes = `* {
  -webkit-tap-highlight-color: transparent;
}

html {
  font-variation-settings: "opsz" 14;
}

button,
input,
select {
  font-family: var(--sans-serif);
}

.hljs-meta { color: var(--syntax-meta); }
.hljs-tag .hljs-name { color: var(--syntax-keyword); }
.hljs-attr { color: var(--syntax-definition); }
.hljs-string { color: var(--syntax-string); }

.highlight .nt, .highlight .k, .highlight .kd { color: var(--syntax-keyword); }
.highlight .na, .highlight .nx { color: var(--syntax-definition); }
.highlight .s, .highlight .dl, .highlight .s2 { color: var(--syntax-string); }
.highlight .mi { color: var(--syntax-literal); }`;

const fixes2 = `.observablehq {
  position: relative;
  margin: 17px 0;
  min-height: 1.5rem;
}

.observablehq:first-of-type {
  margin-top: 0;
}

.observablehq:empty:not(.observablehq--running) {
  display: none;
}

.observablehq--running:empty::after {
  content: "⋯";
  animation: observablehq--pending 750ms steps(1, end) infinite;
}

/*@media (prefers-reduced-motion: reduce) {
  .observablehq--pending:empty::after {
    animation: none;
  }
}*/

@keyframes observablehq--pending {
  0% {
    content: "⠋";
  }
  10% {
    content: "⠙";
  }
  20% {
    content: "⠹";
  }
  30% {
    content: "⠸";
  }
  40% {
    content: "⠼";
  }
  50% {
    content: "⠴";
  }
  60% {
    content: "⠦";
  }
  70% {
    content: "⠧";
  }
  80% {
    content: "⠇";
  }
  90% {
    content: "⠏";
  }
}`;

const light = ':root[data-theme="light"]';
const dark = ':root, :root[data-theme="dark"]';

const part = async (file, selector) => (await (await fetch(src + "styles/" + file)).text())
  .replace(/@import[^;]*;/g, "")
  .replace(":root {", selector + " {")
  .trim();

const theme = [
  await part("syntax-light.css", light),
  await part("abstract-light.css", light),
  await part("theme-air.css", light),
  await part("syntax-dark.css", dark),
  await part("abstract-dark.css", dark),
  await part("theme-midnight.css", dark)
].join("\n\n");

let css = `/* Copyright 2026 Observable, Inc. See NOTICE.md */
@import url("https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&family=Spline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap");

${global}

${inspector}

${highlight}

${plot}

${index}

${inputs}

${fixes}

${fixes2}

${theme}`;

writeFileSync("assets/styles/notebook.css", css);
