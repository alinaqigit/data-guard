/**
 * Document Extractor Service
 * Extracts plain text from binary document formats so they can be
 * scanned by the policy engine just like regular text files.
 *
 * Supported formats:
 *   .pdf   — via pdf-parse
 *   .docx  — via mammoth
 *   .xlsx  — via xlsx (SheetJS)
 *   .pptx  — via unzip + XML parsing (native, no extra dep)
 *   .doc   — via mammoth (partial support for legacy Word)
 *   .odt   — via unzip + XML parsing (native)
 *   .csv   — plain text, read directly
 *   .rtf   — strip RTF control words, read as text
 */

import fs from "fs";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import { Readable } from "stream";

// Lazy-loaded to avoid crashing if a package isn't installed
let pdfParse: any = null;
let mammoth: any = null;
let XLSX: any = null;

function loadPdfParse() {
  if (!pdfParse) {
    try { pdfParse = require("pdf-parse"); }
    catch { pdfParse = null; }
  }
  return pdfParse;
}

function loadMammoth() {
  if (!mammoth) {
    try { mammoth = require("mammoth"); }
    catch { mammoth = null; }
  }
  return mammoth;
}

function loadXLSX() {
  if (!XLSX) {
    try { XLSX = require("xlsx"); }
    catch { XLSX = null; }
  }
  return XLSX;
}

// File extensions this extractor handles
export const EXTRACTABLE_EXTENSIONS = new Set([
  ".pdf",
  ".docx", ".doc",
  ".xlsx", ".xls",
  ".pptx",
  ".odt", ".ods",
  ".rtf",
  ".csv",
]);

export function isExtractable(filePath: string): boolean {
  return EXTRACTABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Extract plain text from a document file.
 * Returns null if extraction fails or format is unsupported.
 */
export async function extractText(filePath: string): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase();
  try {
    switch (ext) {
      case ".pdf":   return await extractPdf(filePath);
      case ".docx":  return await extractDocx(filePath);
      case ".doc":   return await extractDoc(filePath);
      case ".xlsx":  return await extractXlsx(filePath);
      case ".xls":   return await extractXls(filePath);
      case ".pptx":  return await extractPptx(filePath);
      case ".odt":
      case ".ods":   return await extractOdt(filePath);
      case ".rtf":   return extractRtf(filePath);
      case ".csv":   return fs.readFileSync(filePath, "utf-8");
      default:       return null;
    }
  } catch (err: any) {
    console.warn(`[DocExtractor] Failed to extract ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function extractPdf(filePath: string): Promise<string | null> {
  const parse = loadPdfParse();
  if (!parse) {
    console.warn("[DocExtractor] pdf-parse not installed — skipping PDF files");
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const data = await parse(buffer);
  return data.text || null;
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
async function extractDocx(filePath: string): Promise<string | null> {
  const m = loadMammoth();
  if (!m) {
    console.warn("[DocExtractor] mammoth not installed — skipping DOCX files");
    return null;
  }
  const result = await m.extractRawText({ path: filePath });
  return result.value || null;
}

// ── DOC (legacy) ──────────────────────────────────────────────────────────────
async function extractDoc(filePath: string): Promise<string | null> {
  // mammoth has partial support for .doc via OLE parsing
  const m = loadMammoth();
  if (!m) return null;
  try {
    const result = await m.extractRawText({ path: filePath });
    return result.value || null;
  } catch {
    // Legacy .doc can fail — return null silently
    return null;
  }
}

// ── XLSX (modern) ─────────────────────────────────────────────────────────────
async function extractXlsx(filePath: string): Promise<string | null> {
  const xl = loadXLSX();
  if (!xl) {
    console.warn("[DocExtractor] xlsx not installed — skipping Excel files");
    return null;
  }
  const workbook = xl.readFile(filePath);
  const textParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Get sheet as CSV text — preserves cell values cleanly
    const csv = xl.utils.sheet_to_csv(sheet);
    if (csv.trim()) textParts.push(`[Sheet: ${sheetName}]\n${csv}`);
  }

  return textParts.length > 0 ? textParts.join("\n\n") : null;
}

// ── XLS (legacy) ──────────────────────────────────────────────────────────────
async function extractXls(filePath: string): Promise<string | null> {
  // SheetJS handles .xls too
  return extractXlsx(filePath);
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
// PPTX is a ZIP containing XML slides — no extra dep needed
async function extractPptx(filePath: string): Promise<string | null> {
  const AdmZip = requireAdmZip();
  if (!AdmZip) return extractOfficeXml(filePath, /ppt\/slides\/slide\d+\.xml$/);
  return extractOfficeXml(filePath, /ppt\/slides\/slide\d+\.xml$/);
}

// ── ODT / ODS ─────────────────────────────────────────────────────────────────
async function extractOdt(filePath: string): Promise<string | null> {
  return extractOfficeXml(filePath, /^content\.xml$/);
}

// ── Generic ZIP+XML extractor for Office Open XML formats ────────────────────
async function extractOfficeXml(filePath: string, entryPattern: RegExp): Promise<string | null> {
  try {
    // Use Node's built-in zlib + a minimal ZIP reader approach
    // We'll use the 'adm-zip' package if available, otherwise fall back
    const AdmZip = requireAdmZip();
    if (AdmZip) {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries().filter((e: any) => entryPattern.test(e.entryName));
      const texts: string[] = [];
      for (const entry of entries) {
        const xml = entry.getData().toString("utf-8");
        texts.push(stripXmlTags(xml));
      }
      return texts.join("\n").replace(/\s+/g, " ").trim() || null;
    }

    // Fallback: use unzipper via buffer if adm-zip not available
    return await extractXmlViaUnzip(filePath, entryPattern);
  } catch (err: any) {
    console.warn(`[DocExtractor] XML extraction failed: ${err.message}`);
    return null;
  }
}

function requireAdmZip(): any {
  try { return require("adm-zip"); } catch { return null; }
}

// Fallback XML extractor using Node's built-in zlib (no adm-zip)
async function extractXmlViaUnzip(filePath: string, entryPattern: RegExp): Promise<string | null> {
  try {
    const unzipper = require("unzipper");
    const texts: string[] = [];
    const directory = await unzipper.Open.file(filePath);
    for (const file of directory.files) {
      if (entryPattern.test(file.path)) {
        const content = await file.buffer();
        texts.push(stripXmlTags(content.toString("utf-8")));
      }
    }
    return texts.join("\n").replace(/\s+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

// Strip XML/HTML tags, decode common entities
function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")       // remove all tags
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x[0-9A-Fa-f]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── RTF ───────────────────────────────────────────────────────────────────────
function extractRtf(filePath: string): string | null {
  const raw = fs.readFileSync(filePath, "latin1");
  // Strip RTF control words and groups, keep plain text
  const text = raw
    .replace(/\{[^{}]*\}/g, " ")       // remove grouped blocks
    .replace(/\\[a-z]+\d*\s?/gi, " ")  // remove control words
    .replace(/\\\*/g, " ")             // remove destinations
    .replace(/[{}\\]/g, " ")           // remove remaining braces/backslashes
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}