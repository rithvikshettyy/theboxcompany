import { inflateRawSync } from "node:zlib";
import { COPILOT } from "../assumptions";
import type { DocKind, Page } from "./types";

/** A problem with the file itself, written for the person who uploaded it. */
export class ExtractError extends Error {}

const ROWS_PER_PAGE = 40;

const KINDS: Record<string, DocKind> = { pdf: "pdf", docx: "docx", txt: "txt", csv: "csv" };

export function kindOf(name: string): DocKind | null {
  return KINDS[name.toLowerCase().split(".").pop() ?? ""] ?? null;
}

/** A file name that is safe to show and store: no path, no control characters, bounded length. */
export function cleanName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001f<>:"|?*]/g, "").trim();
  return (base || "document").slice(0, 120);
}

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((x, i) => b[i] === x);

function decodeText(bytes: Uint8Array): string {
  if (bytes.includes(0)) throw new ExtractError("This file looks binary, not text.");
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^﻿/, "");
  if ((text.match(/�/g)?.length ?? 0) > text.length / 50 + 3) throw new ExtractError("This file is not valid UTF-8 text.");
  return text;
}

/** Split text on form feeds into pages, so a plain text export can keep its page numbers. */
function textPages(text: string): Page[] {
  return text.split("\f").map((t, i) => ({ page: i + 1, text: t.trim() })).filter((p) => p.text);
}

/** Minimal CSV parser: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

/** Each CSV row becomes a line of "Column: value" pairs, so a row stays readable once it is a chunk. */
function csvPages(text: string): Page[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new ExtractError("The CSV needs a header row and at least one data row.");
  const [head, ...data] = rows;
  const lines = data.map((r, i) => `Row ${i + 1}. ${head.map((h, k) => `${h.trim() || `Column ${k + 1}`}: ${(r[k] ?? "").trim()}`).join("; ")}.`);
  const pages: Page[] = [];
  for (let i = 0; i < lines.length; i += ROWS_PER_PAGE) pages.push({ page: pages.length + 1, text: lines.slice(i, i + ROWS_PER_PAGE).join("\n") });
  return pages;
}

/** Read one entry out of a ZIP (a .docx is one). Only stored and deflated entries, with a size cap against zip bombs. */
export function readZipEntry(zip: Uint8Array, wanted: string): Uint8Array | null {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new ExtractError("This is not a valid DOCX file.");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  for (let n = 0; n < count && p + 46 <= zip.length; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const csize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const lh = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const data = zip.subarray(lh, lh + csize);
      if (method === 0) return data;
      if (method === 8) {
        try {
          return inflateRawSync(data, { maxOutputLength: COPILOT.maxZipInflateBytes });
        } catch {
          throw new ExtractError("The DOCX is damaged or unpacks to an unreasonable size.");
        }
      }
      throw new ExtractError("This DOCX uses an unsupported compression method.");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescapeXml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()],
  );

/** Text of a Word document, in order, with a page break wherever Word marks one. */
export function docxPages(xml: string): Page[] {
  const pages: string[][] = [[]];
  for (const para of xml.split(/<\/w:p>/)) {
    let line = "";
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<w:br [^>]*w:type="page"[^>]*\/>|<w:lastRenderedPageBreak\/>/g;
    for (const m of para.matchAll(re)) {
      if (m[1] !== undefined) line += unescapeXml(m[1]);
      else if (m[0].startsWith("<w:tab")) line += " ";
      else if (m[0].startsWith("<w:br/>")) line += "\n";
      else {
        if (line.trim()) pages[pages.length - 1].push(line.trim());
        line = "";
        pages.push([]);
      }
    }
    if (line.trim()) pages[pages.length - 1].push(line.trim());
  }
  return pages.map((l, i) => ({ page: i + 1, text: l.join("\n") })).filter((p) => p.text);
}

/** Turn an uploaded file into pages of text. Throws ExtractError with a plain message for anything unusable. */
export async function extractFile(rawName: string, bytes: Uint8Array): Promise<{ name: string; kind: DocKind; pages: Page[] }> {
  const name = cleanName(rawName);
  const kind = kindOf(name);
  if (!kind) throw new ExtractError("Upload a PDF, DOCX, TXT or CSV file.");
  if (bytes.length === 0) throw new ExtractError("The file is empty.");
  if (bytes.length > COPILOT.maxFileBytes) throw new ExtractError(`The file is over ${COPILOT.maxFileBytes / 1024 / 1024} MB.`);

  let pages: Page[];
  if (kind === "pdf") {
    if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new ExtractError("This is not a valid PDF.");
    try {
      const { getDocumentProxy, extractText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      if (pdf.numPages > COPILOT.maxPages) throw new ExtractError(`The PDF has more than ${COPILOT.maxPages} pages.`);
      const { text } = await extractText(pdf, { mergePages: false });
      pages = (text as string[]).map((t, i) => ({ page: i + 1, text: t.replace(/[ \t]+\n/g, "\n").trim() })).filter((p) => p.text);
    } catch (e) {
      if (e instanceof ExtractError) throw e;
      throw new ExtractError("The PDF could not be read. It may be damaged or password protected.");
    }
  } else if (kind === "docx") {
    if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new ExtractError("This is not a valid DOCX file.");
    const xml = readZipEntry(bytes, "word/document.xml");
    if (!xml) throw new ExtractError("This DOCX has no document text.");
    pages = docxPages(new TextDecoder().decode(xml));
  } else if (kind === "csv") {
    pages = csvPages(decodeText(bytes));
  } else {
    pages = textPages(decodeText(bytes));
  }
  if (pages.length === 0) throw new ExtractError("No text could be extracted. A scanned document needs OCR first.");
  return { name, kind, pages };
}
