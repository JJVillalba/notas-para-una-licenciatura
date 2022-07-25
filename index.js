import * as fs_extra from "fs-extra";
import * as fs from "fs";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { execSync } from "child_process";
import { JSDOM } from "jsdom";
import { macros } from "./src/custom_macros.js";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { unified } from "unified";
import rehypeStringify from "rehype-stringify/lib/index.js";
import katex from "katex";
import { format } from "prettier";

const MAKE_PDF = false;

/**
 * COMPILE PDF
 */

if (MAKE_PDF) {
  try {
    await fs_extra.copy("./book", "./.tmp", {});

    execSync("cd ./.tmp && pdflatex main.tex");

    fs.copyFileSync("./.tmp/main.pdf", "./output/main.pdf");
  } catch (error) {
    console.log(error.output.toString());
    process.exit(0);
  }
}

/**
 * COMPILE HTML
 */

const _main_file = fs.readFileSync("./book/main.tex", { encoding: "utf-8" });

const latex_doc = _main_file
  // Remove preamble
  .replace("\\input{preamble.tex}", "")
  // Expand include macro
  .replaceAll(/\\include{(.*?)}/g, (match) => {
    const path = match.replace("\\include{", "./book/").replace("}", "");
    return fs.readFileSync(path, { encoding: "utf-8" });
  })
  // Expand input macro
  .replaceAll(/\\\\input{(.*?)}/g, (match) => {
    const path = match.replace("\\input{", "./book/").replace("}", "");
    return fs.readFileSync(path, { encoding: "utf-8" });
  });

const latex_html = unified()
  .use(unifiedLatexFromString, {
    macros: {
      label: { signature: "m" },
      sidenote: { signature: "m" },
      HTMLclassTitle: { signature: "m" },
      newthought: { signature: "m" },
    },
  })
  .use(unifiedLatexToHast)
  .use(rehypeStringify)
  .processSync(latex_doc);

const jsdom = new JSDOM(latex_html.value);
const document = jsdom.window.document;

// Render KaTeX expressions
document
  .querySelectorAll(".display-math, .inline-math")
  .forEach(
    (node) =>
      (node.innerHTML = katex.renderToString(
        node.innerHTML.replace(/amp;|&&/g, "&"),
        node.classList.contains("inline-math")
          ? { macros: macros }
          : { macros: macros, displayMode: true, fleqn: true }
      ))
  );

// Add id to label to be referenced
document
  .querySelectorAll(".macro-label")
  .forEach((node) => (node.id = node.innerHTML.slice(1, -1)));

// Convert ref in anchors tags
document.querySelectorAll(".macro-ref").forEach((node) => {
  const refId = node.innerHTML.slice(1, -1);
  node.outerHTML = `<a href="#${refId}">ref</a>`;
});

// Remove braces from custom macros
document
  .querySelectorAll(
    [
      // ".macro-label",
      ".macro-HTMLclassTitle",
      ".macro-newthought",
      ".macro-sidenote",
    ].join(", ")
  )
  .forEach((node) => (node.innerHTML = node.innerHTML.slice(1, -1)));


const firstKey = (v) => Object.keys(v)[0];
const firstValue = (v) => v[Object.keys(v)[0]];

const part_index = [];
document.querySelectorAll("h1, h2, h3, h4").forEach((node) => {
  if (node.tagName === "H1") {
    const _id = `part:${node.textContent.replaceAll(" ", "-")}`;
    node.id = _id;
    return part_index.push({
      [node.textContent]: {
        nodes: [],
        id: _id,
      },
    });
  }

  const chapter_index = firstValue(part_index.at(-1)).nodes;
  if (node.tagName === "H2") {
    const _id = `chapter:${node.textContent.replaceAll(" ", "-")}`;
    node.id = _id;
    return chapter_index.push({
      [node.textContent]: {
        nodes: [],
        id: _id,
      },
    });
  }

  const section_index = firstValue(chapter_index.at(-1)).nodes;
  if (node.tagName === "H3") {
    const _id = `section:${node.textContent.replaceAll(" ", "-")}`;
    node.id = _id;
    return section_index.push({
      [node.textContent]: {
        nodes: [],
        id: _id,
      },
    });
  }

  const subsection_index = firstValue(section_index.at(-1)).nodes;
  if (node.tagName === "H4") {
    const _id = `subsection:${node.textContent.replaceAll(" ", "-")}`;
    node.id = _id;
    return subsection_index.push({
      [node.textContent]: {
        nodes: [],
        id: _id,
      },
    });
  }
});

const makeIndex = (value, recursionLevel) => `
<ul class="level-${recursionLevel}">
${value.nodes.reduce((prev, curr) => {
  let expanded = "";
  if (firstValue(curr).nodes.length !== 0) {
    expanded = makeIndex(firstValue(curr), recursionLevel + 1);
  }

  return `${prev}
  <li>
    <span>
      <a href="#${firstValue(curr).id}">${firstKey(curr)}</a>
    </span>
    ${expanded}
  </li>`;
}, "")}
</ul>`;

fs.writeFileSync(
  "./webpage/html/content.html",
  format(document.querySelector("body").innerHTML, { parser: "html" })
);


fs.writeFileSync(
  "./webpage/html/menu.html",
  format(makeIndex({ id: "index", nodes: part_index }, 1), { parser: "html" })
);
