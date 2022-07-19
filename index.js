import { parse, HtmlGenerator } from "latex.js";
import { createHTMLWindow } from "svgdom";
import * as fs_extra from "fs-extra";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import { execSync } from "child_process";
import { format } from "prettier";

const MAKE_PDF = true;

/**
 * COMPILE PDF
 */

if (MAKE_PDF) {
  await fs_extra.copy("./book", "./tmp", {});

  execSync("cd ./tmp && pdflatex main.tex");

  fs.copyFileSync("./tmp/main.pdf", "./output/main.pdf");
}

/**
 * COMPILE HTML
 */

const latex = fs.readFileSync("./book/main.tex", { encoding: "utf-8" });

global.window = createHTMLWindow();
global.document = window.document;

const includeRegEx = /\\include{(.*?)}/g;
const inputRegEx = /\\\\input{(.*?)}/g;
const expanded = latex
  .replace("\\input{preamble.tex}", "")
  // Replace Include
  .replaceAll(includeRegEx, (match) => {
    const path = match.replace("\\include{", "./book/").replace("}", "");
    return fs.readFileSync(path, { encoding: "utf-8" });
  })
  // Replace Input
  .replaceAll(inputRegEx, (match) => {
    const path = match.replace("\\input{", "./book/").replace("}", "");
    return fs.readFileSync(path, { encoding: "utf-8" });
  })
  // Some simple macro replacement
  .replace("\\Q", "\\mathbb{Q}");

let generator = new HtmlGenerator({
  hyphenate: true,
  CustomMacros: (function () {
    let args = (CustomMacros.args = {});
    let prototype = CustomMacros.prototype;

    function CustomMacros(generator) {
      this.generator = generator;
    }

    args["htmlDiv"] = ["V", "i"];
    prototype["htmlDiv"] = function (className) {
      let divElement = this.generator.create("div");
      divElement.className = className;
      return [divElement];
    };

    // prototype["R"] = function () {
    // return "";
    // };

    return CustomMacros;
  })(),
});

let doc = parse(expanded, { generator: generator }).htmlDocument();

const dom = new JSDOM(doc.documentElement.outerHTML.replace("</meta>", ""));

const pages = dom.window.document.querySelectorAll(".newPage");

pages.forEach((value, index) => {
  fs.writeFileSync(
    `./output/pages/page-${index}.html`,
    `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page ${index}</title>
    <link type="text/css" rel="stylesheet" href="../css/katex.css" />
    <link type="text/css" rel="stylesheet" href="../css/book.css" />
    <script src="../js/base.js"></script>
</head>
<body>
    ${value.innerHTML}
</body>
</html>
`
  );
});

const html = dom.window.document.querySelector("html").outerHTML;

const prettyHtml = format(html, { parser: "html" });

fs.writeFileSync("./output/index.html", prettyHtml);
