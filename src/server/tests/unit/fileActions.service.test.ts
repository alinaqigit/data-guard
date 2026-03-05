import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { fileActionsService } from "../../src/modules/fileActions/fileActions.service";
import { dbModule } from "../../src/modules/db";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("fileActionsService", () => {
  let service: fileActionsService;
  let testDbPath: string;
  let testDir: string;
  const testUserId = 1;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    // Initialize full schema first (creates users table needed by FK constraint)
    const db = new dbModule(testDbPath);
    db.dbService.user.createUser({ username: "testuser", passwordHash: "hash" });
    db.dbService.user.createUser({ username: "testuser2", passwordHash: "hash" });
    service = new fileActionsService(testDbPath);
    testDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "fileactions-test-"),
    );
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
    try {
      const files = fs.readdirSync(testDir);
      files.forEach((f) => {
        try {
          fs.unlinkSync(path.join(testDir, f));
        } catch {
          /* best effort */
        }
      });
      fs.rmdirSync(testDir);
    } catch {
      /* best effort */
    }
  });

  // Helper to create a test file
  function createTestFile(
    name: string,
    content: string = "test content",
  ): string {
    const filePath = path.join(testDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  describe("validatePath (via public methods)", () => {
    it("should reject empty file path", () => {
      expect(() => service.quarantineFile(testUserId, "")).toThrow(
        "Invalid file path",
      );
    });

    it("should reject null-like file path", () => {
      expect(() =>
        service.quarantineFile(testUserId, null as any),
      ).toThrow("Invalid file path");
    });

    it("should reject system paths (C:\\Windows)", () => {
      expect(() =>
        service.deleteFile(
          testUserId,
          "C:\\Windows\\system32\\config.sys",
        ),
      ).toThrow("Cannot perform actions on system paths");
    });

    it("should reject system paths (C:\\Program Files)", () => {
      expect(() =>
        service.deleteFile(
          testUserId,
          "C:\\Program Files\\app\\file.txt",
        ),
      ).toThrow("Cannot perform actions on system paths");
    });

    // Linux system paths are only blocked on non-Windows platforms
    // (path.normalize on Windows changes /usr to \usr which doesn't match /usr prefix)
    (process.platform !== "win32" ? it : it.skip)(
      "should reject Linux system paths (/usr)",
      () => {
        expect(() =>
          service.deleteFile(testUserId, "/usr/bin/bash"),
        ).toThrow("Cannot perform actions on system paths");
      },
    );

    (process.platform !== "win32" ? it : it.skip)(
      "should reject /etc path",
      () => {
        expect(() =>
          service.deleteFile(testUserId, "/etc/passwd"),
        ).toThrow("Cannot perform actions on system paths");
      },
    );
  });

  describe("quarantineFile", () => {
    it("should quarantine a file successfully", () => {
      const filePath = createTestFile(
        "sensitive.txt",
        "API_KEY=secret123",
      );

      const result = service.quarantineFile(testUserId, filePath);

      expect(result.success).toBe(true);
      expect(result.action).toBe("quarantine");
      expect(result.originalPath).toBe(filePath);
      expect(result.newPath).toBeDefined();
      expect(result.message).toContain("quarantined successfully");

      // Original file should be deleted
      expect(fs.existsSync(filePath)).toBe(false);

      // Quarantined file should exist at new path
      expect(fs.existsSync(result.newPath!)).toBe(true);

      // Cleanup quarantined file
      try {
        fs.unlinkSync(result.newPath!);
      } catch {
        /* ok */
      }
    });

    it("should throw NotFoundError for non-existent file", () => {
      const fakePath = path.join(testDir, "nonexistent.txt");
      expect(() =>
        service.quarantineFile(testUserId, fakePath),
      ).toThrow("File not found");
    });

    it("should preserve file content in quarantine", () => {
      const content = "SUPER SECRET DATA";
      const filePath = createTestFile("secret.dat", content);

      const result = service.quarantineFile(testUserId, filePath);

      const quarantinedContent = fs.readFileSync(
        result.newPath!,
        "utf-8",
      );
      expect(quarantinedContent).toBe(content);

      // Cleanup
      try {
        fs.unlinkSync(result.newPath!);
      } catch {
        /* ok */
      }
    });
  });

  describe("encryptFile", () => {
    it("should encrypt a file successfully", () => {
      const content = "Password: admin123";
      const filePath = createTestFile("config.txt", content);

      const result = service.encryptFile(testUserId, filePath);

      expect(result.success).toBe(true);
      expect(result.action).toBe("encrypt");
      expect(result.originalPath).toBe(filePath);
      expect(result.newPath).toBe(filePath + ".enc");
      expect(result.message).toContain("encrypted successfully");

      // Original replaced by .enc
      expect(fs.existsSync(filePath)).toBe(false);
      expect(fs.existsSync(filePath + ".enc")).toBe(true);

      // Encrypted content should not be readable as plaintext
      const encrypted = fs.readFileSync(filePath + ".enc");
      expect(encrypted.toString("utf-8")).not.toBe(content);
    });

    it("should throw NotFoundError for non-existent file", () => {
      const fakePath = path.join(testDir, "ghost.txt");
      expect(() => service.encryptFile(testUserId, fakePath)).toThrow(
        "File not found",
      );
    });

    it("should store encryption key in database", () => {
      const filePath = createTestFile("to_encrypt.txt", "data");

      service.encryptFile(testUserId, filePath);

      const records = service.getEncryptedFiles(testUserId);
      expect(records.length).toBeGreaterThanOrEqual(1);

      const record = records.find((r) => r.originalPath === filePath);
      expect(record).toBeDefined();
      expect(record!.encryptionKey).toBeDefined();
      expect(record!.iv).toBeDefined();
      expect(record!.encryptedPath).toBe(filePath + ".enc");
    });
  });

  describe("decryptFile", () => {
    it("should decrypt a previously encrypted file", () => {
      const originalContent = "Top secret document content 12345";
      const filePath = createTestFile(
        "decrypt_test.txt",
        originalContent,
      );

      // Encrypt first
      const encResult = service.encryptFile(testUserId, filePath);
      expect(fs.existsSync(encResult.newPath!)).toBe(true);

      // Decrypt
      const decResult = service.decryptFile(
        testUserId,
        encResult.newPath!,
      );

      expect(decResult.success).toBe(true);
      expect(decResult.action).toBe("decrypt");
      expect(decResult.newPath).toBe(filePath);
      expect(decResult.message).toContain("decrypted and restored");

      // Original content restored
      const restored = fs.readFileSync(filePath, "utf-8");
      expect(restored).toBe(originalContent);

      // .enc file removed
      expect(fs.existsSync(encResult.newPath!)).toBe(false);
    });

    it("should throw NotFoundError when encrypted file doesn't exist", () => {
      expect(() =>
        service.decryptFile(
          testUserId,
          path.join(testDir, "missing.enc"),
        ),
      ).toThrow("Encrypted file not found");
    });

    it("should throw NotFoundError when no key record exists", () => {
      const fakePath = path.join(testDir, "unknown.enc");
      fs.writeFileSync(fakePath, "fake encrypted data");

      expect(() => service.decryptFile(testUserId, fakePath)).toThrow(
        "No decryption key found",
      );
    });

    it("should not allow user to decrypt another user's file", () => {
      const filePath = createTestFile(
        "user1_file.txt",
        "user1 secret",
      );

      const encResult = service.encryptFile(1, filePath);

      // User 2 tries to decrypt
      expect(() =>
        service.decryptFile(999, encResult.newPath!),
      ).toThrow("No decryption key found");
    });

    it("should remove key record after successful decryption", () => {
      const filePath = createTestFile("key_cleanup.txt", "data");

      const encResult = service.encryptFile(testUserId, filePath);
      service.decryptFile(testUserId, encResult.newPath!);

      const records = service.getEncryptedFiles(testUserId);
      const record = records.find(
        (r) => r.encryptedPath === encResult.newPath,
      );
      expect(record).toBeUndefined();
    });
  });

  describe("deleteFile", () => {
    it("should delete a file successfully", () => {
      const filePath = createTestFile("to_delete.txt", "delete me");

      const result = service.deleteFile(testUserId, filePath);

      expect(result.success).toBe(true);
      expect(result.action).toBe("delete");
      expect(result.originalPath).toBe(filePath);
      expect(result.message).toContain("permanently deleted");

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("should throw NotFoundError for non-existent file", () => {
      const fakePath = path.join(testDir, "already_gone.txt");
      expect(() => service.deleteFile(testUserId, fakePath)).toThrow(
        "File not found",
      );
    });
  });

  describe("getEncryptedFiles", () => {
    it("should return empty array when no files encrypted", () => {
      const result = service.getEncryptedFiles(testUserId);
      expect(result).toEqual([]);
    });

    it("should return encrypted files for correct user only", () => {
      const f1 = createTestFile("user1_a.txt", "a");
      const f2 = createTestFile("user1_b.txt", "b");
      const f3 = createTestFile("user2_c.txt", "c");

      service.encryptFile(1, f1);
      service.encryptFile(1, f2);
      service.encryptFile(2, f3);

      const user1Files = service.getEncryptedFiles(1);
      const user2Files = service.getEncryptedFiles(2);

      expect(user1Files).toHaveLength(2);
      expect(user2Files).toHaveLength(1);
    });
  });

  describe("encrypt → decrypt round-trip integrity", () => {
    it("should preserve binary-like content through encrypt/decrypt cycle", () => {
      // Content with special characters and line breaks
      const content = "Line1\r\nLine2\tTab\0NullByte\x00End";
      const filePath = createTestFile("binary_test.txt");
      fs.writeFileSync(filePath, content, "binary");

      const encResult = service.encryptFile(testUserId, filePath);
      const decResult = service.decryptFile(
        testUserId,
        encResult.newPath!,
      );

      const restored = fs.readFileSync(decResult.newPath!, "binary");
      expect(restored).toBe(content);
    });

    it("should handle large files", () => {
      const largeContent = "A".repeat(1024 * 1024); // 1MB
      const filePath = createTestFile("large.txt", largeContent);

      const encResult = service.encryptFile(testUserId, filePath);
      const decResult = service.decryptFile(
        testUserId,
        encResult.newPath!,
      );

      const restored = fs.readFileSync(decResult.newPath!, "utf-8");
      expect(restored).toBe(largeContent);
    });
  });
});
