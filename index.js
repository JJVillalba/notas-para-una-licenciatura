import { parse, HtmlGenerator } from "latex.js";
import { createHTMLWindow } from "svgdom";
import * as fs_extra from "fs-extra";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import { execSync } from "child_process";
import { format } from "prettier";

global.window = createHTMLWindow();
global.document = window.document;

let latex = fs.readFileSync("./book/main.tex", { encoding: "utf-8" });

await fs_extra.copy("./book", "./tmp", {});

// execSync("cd ./tmp && pdflatex main.tex")

// fs.copyFileSync("./tmp/main.pdf", "./output/main.pdf")

let generator = new HtmlGenerator({ hyphenate: true });

let doc = parse(latex, { generator: generator }).htmlDocument();

const dom = new JSDOM(doc.documentElement.outerHTML.replace("</meta>", ""));

const html = dom.window.document.querySelector("html").outerHTML;

const prettyHtml = format(html, { parser: "html" });

fs.writeFileSync("./output/index.html", prettyHtml);
