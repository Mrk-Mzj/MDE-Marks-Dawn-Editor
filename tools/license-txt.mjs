// Writes release/LICENSE.txt for the release ZIP: the GPL text from LICENSE
// with each paragraph on one line, so Notepad wraps it to the window width
// (the original is hard-wrapped at about 72 characters). Only line breaks
// inside paragraphs change; the words stay exactly the same.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("LICENSE", "utf8").replace(/\r\n/g, "\n");
const appendix = source.indexOf("END OF TERMS AND CONDITIONS");

let offset = 0;
const blocks = source.split(/\n{2,}/).map((block) => {
  const start = source.indexOf(block, offset);
  offset = start + block.length;
  const lines = block.split("\n");
  const indent = lines[0].match(/^ */)[0];
  const keep =
    lines.length === 1 ||
    // The copyright notice at the top.
    lines[0].startsWith(" Copyright") ||
    // Centred headings (the title and its version line).
    indent.length >= 8 ||
    // In "How to Apply These Terms" the indented blocks are notices to copy line by line.
    (start > appendix && indent.length >= 4);
  return keep ? block : indent + lines.map((line) => line.trim()).join(" ");
});

mkdirSync("release", { recursive: true });
writeFileSync("release/LICENSE.txt", blocks.join("\n\n").replace(/\n/g, "\r\n"));
