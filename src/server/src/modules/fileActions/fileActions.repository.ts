import Database from "better-sqlite3-multiple-ciphers";
import fs from "fs";
import { EncryptedFileRecord } from "./fileActions.types";

export class fileActionsRepository {
  private db: Database.Database;

  constructor(DB_PATH: string) {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(DB_PATH, { recursive: true });
    }
    this.db = new Database(DB_PATH + "/data_guard.db", {
      fileMustExist: false,
    });
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS encrypted_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_path TEXT NOT NULL,
        encrypted_path TEXT NOT NULL,
        encryption_key TEXT NOT NULL,
        iv TEXT NOT NULL,
        encrypted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  public storeEncryptedFile(data: {
    userId: number;
    originalPath: string;
    encryptedPath: string;
    encryptionKey: string;
    iv: string;
  }): EncryptedFileRecord {
    const result = this.db
      .prepare(
        `
      INSERT INTO encrypted_files (user_id, original_path, encrypted_path, encryption_key, iv)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.userId,
        data.originalPath,
        data.encryptedPath,
        data.encryptionKey,
        data.iv,
      );

    return this.getById(result.lastInsertRowid as number)!;
  }

  public getByEncryptedPath(
    encryptedPath: string,
    userId: number,
  ): EncryptedFileRecord | null {
    const row = this.db
      .prepare(
        "SELECT * FROM encrypted_files WHERE encrypted_path = ? AND user_id = ?",
      )
      .get(encryptedPath, userId) as any;
    return row ? this.mapRow(row) : null;
  }

  public getByUserId(userId: number): EncryptedFileRecord[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM encrypted_files WHERE user_id = ? ORDER BY encrypted_at DESC",
      )
      .all(userId) as any[];
    return rows.map(this.mapRow);
  }

  public deleteByEncryptedPath(
    encryptedPath: string,
    userId: number,
  ): void {
    this.db
      .prepare(
        "DELETE FROM encrypted_files WHERE encrypted_path = ? AND user_id = ?",
      )
      .run(encryptedPath, userId);
  }

  public deleteAllByUserId(userId: number): number {
    const result = this.db
      .prepare("DELETE FROM encrypted_files WHERE user_id = ?")
      .run(userId);
    return result.changes;
  }

  private getById(id: number): EncryptedFileRecord | null {
    const row = this.db
      .prepare("SELECT * FROM encrypted_files WHERE id = ?")
      .get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: any): EncryptedFileRecord {
    return {
      id: row.id,
      userId: row.user_id,
      originalPath: row.original_path,
      encryptedPath: row.encrypted_path,
      encryptionKey: row.encryption_key,
      iv: row.iv,
      encryptedAt: row.encrypted_at,
    };
  }
}
