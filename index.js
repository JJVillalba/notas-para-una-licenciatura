import { parse, HtmlGenerator } from "latex.js";
import { createHTMLWindow } from "svgdom";
import * as fs_extra from "fs-extra";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import { execSync } from "child_process";
import { format } from "prettier";

const MAKE_PDF = false;

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
  // Replace Include
  .replaceAll(includeRegEx, (match) => {
    const path = match.replace("\\include{", "./book/").replace("}", "");
    console.log(path);

    return fs.readFileSync(path, { encoding: "utf-8" });
  })
  // Replace Input
  .replaceAll(inputRegEx, (match) => {
    const path = match.replace("\\input{", "./book/").replace("}", "");
    console.log(path);

    return fs.readFileSync(path, { encoding: "utf-8" });
  });

let generator = new HtmlGenerator({
  hyphenate: true,
  CustomMacros: (function () {
    let args = (CustomMacros.args = {});
    let prototype = CustomMacros.prototype;

    function CustomMacros(generator) {
      this.generator = generator;
    }

    args["htmlDiv"] = ["V", "i", "h"];
    prototype["htmlDiv"] = function (className) {
      let das = this.generator.create("div");
      das.className = className
      return [das]
    };

    return CustomMacros;
  })(),
});

let doc = parse(expanded, { generator: generator }).htmlDocument();

const dom = new JSDOM(doc.documentElement.outerHTML.replace("</meta>", ""));

const html = dom.window.document.querySelector("html").outerHTML;

const prettyHtml = format(html, { parser: "html" });

fs.writeFileSync("./output/index.html", prettyHtml);
