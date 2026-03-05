import path from "path";
import fs from "fs";

// ── Supported extractable extensions ─────────────────────────────────────────
const EXTRACTABLE_EXTENSIONS = new Set([
  ".pdf", ".docx", ".xlsx", ".xls", ".csv",
  ".json", ".xml", ".html", ".htm",
  ".md", ".rtf", ".ipynb",
]);

export function isExtractable(filePath: string): boolean {
  return EXTRACTABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Extract plain text from a file.
 * Returns null if extraction fails or format is unsupported.
 */
export async function extractText(filePath: string): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    switch (ext) {
      case ".pdf":   return await extractPdf(filePath);
      case ".docx":  return await extractDocx(filePath);
      case ".xlsx":
      case ".xls":   return await extractXlsx(filePath);
      case ".csv":
      case ".json":
      case ".md":    return fs.readFileSync(filePath, "utf-8");
      case ".xml":
      case ".html":
      case ".htm":   return extractXml(filePath);
      case ".ipynb": return extractNotebook(filePath);
      default:       return null;
    }
  } catch (err: any) {
    console.warn(`[DocumentExtractor] Failed to extract ${filePath}: ${err.message}`);
    return null;
  }
}

async function extractPdf(filePath: string): Promise<string | null> {
  try {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || null;
  } catch { return null; }
}

async function extractDocx(filePath: string): Promise<string | null> {
  try {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || null;
  } catch { return null; }
}

async function extractXlsx(filePath: string): Promise<string | null> {
  try {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const lines: string[] = [];
    workbook.eachSheet((sheet: any) => {
      sheet.eachRow((row: any) => {
        const values = row.values as any[];
        if (!values) return;
        const cells = values.slice(1)
          .filter((v) => v !== null && v !== undefined)
          .map((v) => String(v).trim())
          .filter((v) => v.length > 0);
        if (cells.length > 0) lines.push(cells.join(" "));
      });
    });
    return lines.length > 0 ? lines.join("\n") : null;
  } catch { return null; }
}

function extractXml(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/\s+/g, " ")
      .trim() || null;
  } catch { return null; }
}

function extractNotebook(filePath: string): string | null {
  try {
    const nb = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const lines: string[] = [];
    for (const cell of nb.cells || []) {
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : String(cell.source || "");
      if (source.trim()) lines.push(source);
    }
    return lines.length > 0 ? lines.join("\n") : null;
  } catch { return null; }
}