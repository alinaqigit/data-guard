import Database from "better-sqlite3-multiple-ciphers";
import { ReportEntity, ReportStatus } from "./reports.types";
import fs from "fs";

export class reportsRepository {
  private db: Database.Database;

  constructor(DB_PATH: string) {
    // Mirror exactly how dbRepository opens the connection
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
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        report_type TEXT NOT NULL CHECK(report_type IN ('quick', 'full', 'deep')),
        format TEXT NOT NULL CHECK(format IN ('pdf', 'xlsx', 'json')),
        date_range TEXT NOT NULL CHECK(date_range IN ('today', 'weekly', 'all')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
        file_path TEXT NOT NULL DEFAULT '',
        file_size_bytes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  public createReport(data: {
    userId: number;
    name: string;
    reportType: string;
    format: string;
    dateRange: string;
  }): ReportEntity {
    const stmt = this.db.prepare(`
      INSERT INTO reports (user_id, name, report_type, format, date_range, status, file_path, file_size_bytes)
      VALUES (?, ?, ?, ?, ?, 'pending', '', 0)
    `);
    const result = stmt.run(data.userId, data.name, data.reportType, data.format, data.dateRange);
    return this.getReportById(result.lastInsertRowid as number)!;
  }

  public updateReport(
    id: number,
    updates: { status: ReportStatus; filePath?: string; fileSizeBytes?: number },
  ): void {
    this.db.prepare(`
      UPDATE reports SET status = ?, file_path = ?, file_size_bytes = ? WHERE id = ?
    `).run(updates.status, updates.filePath || "", updates.fileSizeBytes || 0, id);
  }

  public getReportById(id: number): ReportEntity | null {
    const row = this.db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  public getAllReportsByUserId(userId: number): ReportEntity[] {
    const rows = this.db.prepare(
      "SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(userId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  public deleteReport(id: number, userId: number): void {
    this.db.prepare("DELETE FROM reports WHERE id = ? AND user_id = ?").run(id, userId);
  }

  private mapRow(row: any): ReportEntity {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      reportType: row.report_type,
      format: row.format,
      dateRange: row.date_range,
      status: row.status,
      filePath: row.file_path,
      fileSizeBytes: row.file_size_bytes,
      createdAt: row.created_at,
    };
  }
}