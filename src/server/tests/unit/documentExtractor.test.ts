import fs from "fs";
import path from "path";
import os from "os";
import {
  isExtractable,
  extractText,
} from "../../src/modules/documentExtractor/documentExtractor.service";

describe("DocumentExtractor Service", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "docextractor-test-"),
    );
  });

  afterEach(() => {
    try {
      const files = fs.readdirSync(testDir);
      files.forEach((f) => fs.unlinkSync(path.join(testDir, f)));
      fs.rmdirSync(testDir);
    } catch {
      /* cleanup best-effort */
    }
  });

  describe("isExtractable", () => {
    it("should return true for PDF files", () => {
      expect(isExtractable("document.pdf")).toBe(true);
      expect(isExtractable("/path/to/file.PDF")).toBe(true);
    });

    it("should return true for DOCX files", () => {
      expect(isExtractable("report.docx")).toBe(true);
    });

    it("should return true for Excel files", () => {
      expect(isExtractable("data.xlsx")).toBe(true);
      expect(isExtractable("legacy.xls")).toBe(true);
    });

    it("should return true for CSV files", () => {
      expect(isExtractable("data.csv")).toBe(true);
    });

    it("should return true for JSON files", () => {
      expect(isExtractable("config.json")).toBe(true);
    });

    it("should return true for XML/HTML files", () => {
      expect(isExtractable("page.html")).toBe(true);
      expect(isExtractable("page.htm")).toBe(true);
      expect(isExtractable("data.xml")).toBe(true);
    });

    it("should return true for Markdown files", () => {
      expect(isExtractable("README.md")).toBe(true);
    });

    it("should return true for Jupyter notebooks", () => {
      expect(isExtractable("analysis.ipynb")).toBe(true);
    });

    it("should return false for unsupported extensions", () => {
      expect(isExtractable("image.png")).toBe(false);
      expect(isExtractable("video.mp4")).toBe(false);
      expect(isExtractable("archive.zip")).toBe(false);
      expect(isExtractable("program.exe")).toBe(false);
      expect(isExtractable("binary.bin")).toBe(false);
    });

    it("should return false for files with no extension", () => {
      expect(isExtractable("Makefile")).toBe(false);
      expect(isExtractable("LICENSE")).toBe(false);
    });

    it("should handle case-insensitive extensions", () => {
      expect(isExtractable("FILE.CSV")).toBe(true);
      expect(isExtractable("DATA.Json")).toBe(true);
    });
  });

  describe("extractText", () => {
    it("should extract text from CSV files", async () => {
      const csvPath = path.join(testDir, "test.csv");
      fs.writeFileSync(
        csvPath,
        "name,email\nJohn,john@test.com\nJane,jane@test.com",
      );

      const result = await extractText(csvPath);

      expect(result).toBeDefined();
      expect(result).toContain("name,email");
      expect(result).toContain("john@test.com");
    });

    it("should extract text from JSON files", async () => {
      const jsonPath = path.join(testDir, "test.json");
      fs.writeFileSync(
        jsonPath,
        '{"password": "secret123", "user": "admin"}',
      );

      const result = await extractText(jsonPath);

      expect(result).toBeDefined();
      expect(result).toContain("password");
      expect(result).toContain("secret123");
    });

    it("should extract text from Markdown files", async () => {
      const mdPath = path.join(testDir, "test.md");
      fs.writeFileSync(
        mdPath,
        "# Heading\n\nSensitive data: api_key=abc123",
      );

      const result = await extractText(mdPath);

      expect(result).toBeDefined();
      expect(result).toContain("api_key=abc123");
    });

    it("should extract text from HTML files", async () => {
      const htmlPath = path.join(testDir, "test.html");
      fs.writeFileSync(
        htmlPath,
        "<html><body><p>password=secret</p></body></html>",
      );

      const result = await extractText(htmlPath);

      expect(result).toBeDefined();
      expect(result).toContain("password=secret");
    });

    it("should strip HTML tags from HTML content", async () => {
      const htmlPath = path.join(testDir, "test.html");
      fs.writeFileSync(
        htmlPath,
        "<div><b>Secret:</b> <span>password123</span></div>",
      );

      const result = await extractText(htmlPath);

      expect(result).toBeDefined();
      expect(result).not.toContain("<div>");
      expect(result).not.toContain("<b>");
      expect(result).toContain("Secret:");
      expect(result).toContain("password123");
    });

    it("should extract text from XML files", async () => {
      const xmlPath = path.join(testDir, "test.xml");
      fs.writeFileSync(
        xmlPath,
        '<?xml version="1.0"?><config><db_password>mysecret</db_password></config>',
      );

      const result = await extractText(xmlPath);

      expect(result).toBeDefined();
      expect(result).toContain("mysecret");
    });

    it("should decode HTML entities in XML/HTML", async () => {
      const htmlPath = path.join(testDir, "test.html");
      fs.writeFileSync(
        htmlPath,
        "<p>&amp; &lt; &gt; &quot; &apos;</p>",
      );

      const result = await extractText(htmlPath);

      expect(result).toBeDefined();
      expect(result).toContain("&");
      expect(result).toContain("<");
      expect(result).toContain(">");
    });

    it("should extract text from Jupyter notebooks", async () => {
      const nbPath = path.join(testDir, "test.ipynb");
      const notebook = {
        cells: [
          {
            cell_type: "code",
            source: ["import os\n", "api_key = 'secret_key_123'"],
          },
          {
            cell_type: "markdown",
            source: ["# Analysis\n", "This is **important**."],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };
      fs.writeFileSync(nbPath, JSON.stringify(notebook));

      const result = await extractText(nbPath);

      expect(result).toBeDefined();
      expect(result).toContain("api_key = 'secret_key_123'");
      expect(result).toContain("# Analysis");
    });

    it("should return null for unsupported file types", async () => {
      const binPath = path.join(testDir, "test.png");
      fs.writeFileSync(
        binPath,
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      ); // PNG magic bytes

      const result = await extractText(binPath);

      expect(result).toBeNull();
    });

    it("should return null for non-existent files", async () => {
      const result = await extractText(
        path.join(testDir, "nonexistent.csv"),
      );

      expect(result).toBeNull();
    });

    it("should handle empty files gracefully", async () => {
      const emptyPath = path.join(testDir, "empty.csv");
      fs.writeFileSync(emptyPath, "");

      const result = await extractText(emptyPath);

      // Empty string is falsy — should return the empty string (read successfully)
      expect(result).toBeDefined();
    });

    it("should handle malformed JSON files gracefully", async () => {
      const jsonPath = path.join(testDir, "bad.json");
      fs.writeFileSync(jsonPath, "{this is not json!@#$");

      // JSON is read as plain text (fs.readFileSync), so it returns string
      const result = await extractText(jsonPath);
      expect(result).toBeDefined();
      expect(result).toContain("{this is not json");
    });

    it("should handle malformed notebook files gracefully", async () => {
      const nbPath = path.join(testDir, "bad.ipynb");
      fs.writeFileSync(nbPath, "NOT A JSON NOTEBOOK");

      const result = await extractText(nbPath);

      expect(result).toBeNull(); // JSON.parse will fail
    });

    it("should handle empty HTML returning null", async () => {
      const htmlPath = path.join(testDir, "empty.html");
      fs.writeFileSync(htmlPath, "   ");

      const result = await extractText(htmlPath);

      // After stripping tags and trimming, empty content → null
      expect(result).toBeNull();
    });

    it("should handle notebook with empty cells", async () => {
      const nbPath = path.join(testDir, "empty_cells.ipynb");
      const notebook = {
        cells: [
          { cell_type: "code", source: "" },
          { cell_type: "code", source: [] },
        ],
        metadata: {},
        nbformat: 4,
      };
      fs.writeFileSync(nbPath, JSON.stringify(notebook));

      const result = await extractText(nbPath);

      // All cells are empty → returns null
      expect(result).toBeNull();
    });

    it("should handle notebook with array source vs string source", async () => {
      const nbPath = path.join(testDir, "mixed.ipynb");
      const notebook = {
        cells: [
          { cell_type: "code", source: ["line1\n", "line2"] },
          { cell_type: "code", source: "single string source" },
        ],
      };
      fs.writeFileSync(nbPath, JSON.stringify(notebook));

      const result = await extractText(nbPath);

      expect(result).toContain("line1");
      expect(result).toContain("line2");
      expect(result).toContain("single string source");
    });
  });
});
