import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { exec } from "child_process";
import { fileActionsRepository } from "./fileActions.repository";
import {
  FileActionResult,
  DecryptRequest,
} from "./fileActions.types";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "../../utils/errors";

// Safe quarantine location: %APPDATA%/DataGuard/quarantine on Windows, ~/.dataguard/quarantine elsewhere
function getQuarantineDir(): string {
  const base = process.env.APPDATA
    ? path.join(process.env.APPDATA, "DataGuard", "quarantine")
    : path.join(os.homedir(), ".dataguard", "quarantine");
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

// System paths that must never be touched
const SYSTEM_PATH_PREFIXES = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "/usr",
  "/etc",
  "/bin",
  "/sbin",
  "/sys",
  "/proc",
  "/dev",
  "/boot",
  "/lib",
  "/lib64",
];

function isSafeToActOn(filePath: string): boolean {
  const normalized = path.normalize(filePath).toLowerCase();
  return !SYSTEM_PATH_PREFIXES.some((p) =>
    normalized.startsWith(p.toLowerCase()),
  );
}

export class fileActionsService {
  private repo: fileActionsRepository;

  constructor(DB_PATH: string) {
    this.repo = new fileActionsRepository(DB_PATH);
  }

  // ── Quarantine ──────────────────────────────────────────
  public quarantineFile(
    userId: number,
    filePath: string,
  ): FileActionResult {
    this.validatePath(filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }

    const quarantineDir = getQuarantineDir();
    const timestamp = Date.now();
    const safeName = path
      .basename(filePath)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const destPath = path.join(
      quarantineDir,
      `${timestamp}_${safeName}`,
    );

    try {
      fs.copyFileSync(filePath, destPath);
      fs.unlinkSync(filePath);
    } catch (err: any) {
      throw new Error(`Failed to quarantine file: ${err.message}`);
    }

    return {
      success: true,
      action: "quarantine",
      originalPath: filePath,
      newPath: destPath,
      message: `File quarantined successfully to ${destPath}`,
    };
  }

  // ── Encrypt ─────────────────────────────────────────────
  public encryptFile(
    userId: number,
    filePath: string,
  ): FileActionResult {
    this.validatePath(filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }

    const key = crypto.randomBytes(32); // AES-256 key
    const iv = crypto.randomBytes(16); // AES block size

    const fileData = fs.readFileSync(filePath);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(fileData),
      cipher.final(),
    ]);

    const encryptedPath = filePath + ".enc";

    try {
      fs.writeFileSync(encryptedPath, encrypted);
      fs.unlinkSync(filePath); // Remove original
    } catch (err: any) {
      throw new Error(`Failed to encrypt file: ${err.message}`);
    }

    // Store key in DB
    this.repo.storeEncryptedFile({
      userId,
      originalPath: filePath,
      encryptedPath,
      encryptionKey: key.toString("hex"),
      iv: iv.toString("hex"),
    });

    return {
      success: true,
      action: "encrypt",
      originalPath: filePath,
      newPath: encryptedPath,
      message: `File encrypted successfully. Original replaced with ${encryptedPath}`,
    };
  }

  // ── Decrypt ─────────────────────────────────────────────
  public decryptFile(
    userId: number,
    encryptedPath: string,
  ): FileActionResult {
    if (!fs.existsSync(encryptedPath)) {
      throw new NotFoundError(
        `Encrypted file not found: ${encryptedPath}`,
      );
    }

    const record = this.repo.getByEncryptedPath(
      encryptedPath,
      userId,
    );
    if (!record) {
      throw new NotFoundError(
        "No decryption key found for this file. It may not have been encrypted by DataGuard.",
      );
    }

    const key = Buffer.from(record.encryptionKey, "hex");
    const iv = Buffer.from(record.iv, "hex");

    const encryptedData = fs.readFileSync(encryptedPath);

    let decrypted: Buffer;
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        key,
        iv,
      );
      decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);
    } catch (err: any) {
      throw new Error(
        `Decryption failed — file may be corrupted: ${err.message}`,
      );
    }

    try {
      fs.writeFileSync(record.originalPath, decrypted);
      fs.unlinkSync(encryptedPath);
    } catch (err: any) {
      throw new Error(
        `Failed to restore decrypted file: ${err.message}`,
      );
    }

    // Remove key record from DB
    this.repo.deleteByEncryptedPath(encryptedPath, userId);

    return {
      success: true,
      action: "decrypt",
      originalPath: encryptedPath,
      newPath: record.originalPath,
      message: `File decrypted and restored to ${record.originalPath}`,
    };
  }

  // ── Delete ──────────────────────────────────────────────
  public deleteFile(
    userId: number,
    filePath: string,
  ): FileActionResult {
    this.validatePath(filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }

    try {
      fs.unlinkSync(filePath);
    } catch (err: any) {
      throw new Error(`Failed to delete file: ${err.message}`);
    }

    return {
      success: true,
      action: "delete",
      originalPath: filePath,
      message: `File permanently deleted: ${filePath}`,
    };
  }

  // ── Encrypted files for user ─────────────────────────────
  public getEncryptedFiles(userId: number) {
    return this.repo.getByUserId(userId);
  }

  public deleteAllEncryptedFileRecords(userId: number): {
    deletedCount: number;
    message: string;
  } {
    const deletedCount = this.repo.deleteAllByUserId(userId);
    return {
      deletedCount,
      message: `Deleted ${deletedCount} encrypted vault record(s).`,
    };
  }

  // ── Open file with default system application ──────────
  public async openFile(filePath: string): Promise<FileActionResult> {
    this.validatePath(filePath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }

    const platform = process.platform;
    const cmd =
      platform === "win32"
        ? `start "" "${filePath}"`
        : platform === "darwin"
          ? `open "${filePath}"`
          : `xdg-open "${filePath}"`;

    return new Promise((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) {
          reject(new Error(`Failed to open file: ${err.message}`));
        } else {
          resolve({
            success: true,
            action: "open",
            originalPath: filePath,
            message: `File opened successfully`,
          });
        }
      });
    });
  }

  // ── Show file in system file explorer ──────────────────
  public async showInFolder(
    filePath: string,
  ): Promise<FileActionResult> {
    this.validatePath(filePath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }

    const platform = process.platform;
    const cmd =
      platform === "win32"
        ? `explorer /select,"${filePath}"`
        : platform === "darwin"
          ? `open -R "${filePath}"`
          : `xdg-open "${path.dirname(filePath)}"`;

    return new Promise((resolve) => {
      exec(cmd, () => {
        // explorer /select can return exit code 1 even on success
        resolve({
          success: true,
          action: "show-in-folder",
          originalPath: filePath,
          message: `File location opened in file explorer`,
        });
      });
    });
  }

  private validatePath(filePath: string): void {
    if (!filePath || typeof filePath !== "string") {
      throw new ValidationError("Invalid file path");
    }
    if (!isSafeToActOn(filePath)) {
      throw new ForbiddenError(
        "Cannot perform actions on system paths",
      );
    }
  }
}
