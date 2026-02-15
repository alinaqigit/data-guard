import Database from "better-sqlite3-multiple-ciphers";
import { initializeDatabaseQuery } from "./db.queries";
import fs from "fs";
import { UserEntity, PolicyEntity, ScanEntity } from "../../entities";

export class dbRepository {
  private db: Database.Database;

  constructor(DB_PATH: string) {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(DB_PATH, { recursive: true });
    }

    this.db = new Database(DB_PATH + "/data_guard.db", {
      fileMustExist: false,
    });
    this.db.exec(initializeDatabaseQuery);
  }

  public createUser(userData: {
    username: string;
    passwordHash: string;
  }): UserEntity {
    const stmt = this.db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    );
    const info = stmt.run(userData.username, userData.passwordHash);
    return {
      id: info.lastInsertRowid as number,
      username: userData.username,
      passwordHash: userData.passwordHash,
    };
  }

  public getUserByUsername(username: string): UserEntity | null {
    const stmt = this.db.prepare(
      "SELECT id, username, password_hash as passwordHash, created_at as createdAt FROM users WHERE username = ?",
    );
    const user = stmt.get(username) as any;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
    };
  }

  public deleteUserByUsername(username: string): void {
    const stmt = this.db.prepare(
      "DELETE FROM users WHERE username = ?",
    );
    stmt.run(username);
  }

  public updateUserName(
    oldUsername: string,
    newUsername: string,
  ): void {
    const stmt = this.db.prepare(
      "UPDATE users SET username = ? WHERE username = ?",
    );
    stmt.run(newUsername, oldUsername);
  }

  public close(): void {
    this.db.close();
  }

  // Policy CRUD operations

  public createPolicy(policyData: {
    userId: number;
    name: string;
    pattern: string;
    type: "keyword" | "regex";
    description?: string;
  }): PolicyEntity {
    const stmt = this.db.prepare(
      "INSERT INTO policies (user_id, name, pattern, type, description, is_enabled) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const info = stmt.run(
      policyData.userId,
      policyData.name,
      policyData.pattern,
      policyData.type,
      policyData.description || null,
      1, // Default to enabled
    );

    return {
      id: info.lastInsertRowid as number,
      userId: policyData.userId,
      name: policyData.name,
      pattern: policyData.pattern,
      type: policyData.type,
      description: policyData.description,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getPolicyById(id: number): PolicyEntity | null {
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        name, 
        pattern, 
        type, 
        description,
        is_enabled as isEnabled,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM policies 
      WHERE id = ?`,
    );
    const policy = stmt.get(id) as any;

    if (!policy) {
      return null;
    }

    return {
      id: policy.id,
      userId: policy.userId,
      name: policy.name,
      pattern: policy.pattern,
      type: policy.type as "keyword" | "regex",
      description: policy.description,
      isEnabled: policy.isEnabled === 1,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  public getAllPoliciesByUserId(userId: number): PolicyEntity[] {
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        name, 
        pattern, 
        type, 
        description,
        is_enabled as isEnabled,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM policies 
      WHERE user_id = ?
      ORDER BY id DESC`,
    );
    const policies = stmt.all(userId) as any[];

    return policies.map((policy) => ({
      id: policy.id,
      userId: policy.userId,
      name: policy.name,
      pattern: policy.pattern,
      type: policy.type as "keyword" | "regex",
      description: policy.description,
      isEnabled: policy.isEnabled === 1,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));
  }

  public updatePolicy(
    id: number,
    updates: {
      name?: string;
      pattern?: string;
      type?: "keyword" | "regex";
      description?: string;
    },
  ): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined && updates.name !== "") {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.pattern !== undefined && updates.pattern !== "") {
      fields.push("pattern = ?");
      values.push(updates.pattern);
    }
    if (updates.type) {
      fields.push("type = ?");
      values.push(updates.type);
    }
    if (
      updates.description !== undefined &&
      updates.description !== ""
    ) {
      fields.push("description = ?");
      values.push(updates.description);
    }

    // Only update if there are fields to update
    if (fields.length === 0) {
      return;
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE policies SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(...values);
  }

  public togglePolicyStatus(id: number): void {
    const stmt = this.db.prepare(
      `UPDATE policies SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    stmt.run(id);
  }

  public deletePolicyById(id: number): void {
    const stmt = this.db.prepare("DELETE FROM policies WHERE id = ?");
    stmt.run(id);
  }

  // Scan CRUD operations

  public createScan(scanData: {
    userId: number;
    scanType: "full" | "quick" | "custom";
    targetPath: string;
    status: "running" | "completed" | "failed" | "cancelled";
  }): ScanEntity {
    const stmt = this.db.prepare(
      "INSERT INTO scans (user_id, scan_type, target_path, status, started_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
    );
    const info = stmt.run(
      scanData.userId,
      scanData.scanType,
      scanData.targetPath,
      scanData.status,
    );

    return {
      id: info.lastInsertRowid as number,
      userId: scanData.userId,
      scanType: scanData.scanType,
      targetPath: scanData.targetPath,
      status: scanData.status,
      startedAt: new Date().toISOString(),
      filesScanned: 0,
      filesWithThreats: 0,
      totalThreats: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getScanById(id: number): ScanEntity | null {
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        scan_type as scanType, 
        target_path as targetPath, 
        status,
        started_at as startedAt,
        completed_at as completedAt,
        files_scanned as filesScanned,
        files_with_threats as filesWithThreats,
        total_threats as totalThreats,
        error_message as errorMessage,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM scans 
      WHERE id = ?`,
    );
    const scan = stmt.get(id) as any;

    if (!scan) {
      return null;
    }

    return {
      id: scan.id,
      userId: scan.userId,
      scanType: scan.scanType,
      targetPath: scan.targetPath,
      status: scan.status,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt || undefined,
      filesScanned: scan.filesScanned,
      filesWithThreats: scan.filesWithThreats,
      totalThreats: scan.totalThreats,
      errorMessage: scan.errorMessage || undefined,
      createdAt: scan.createdAt,
      updatedAt: scan.updatedAt,
    };
  }

  public getAllScansByUserId(
    userId: number,
    limit?: number,
  ): ScanEntity[] {
    const limitClause = limit ? `LIMIT ${limit}` : "";
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        scan_type as scanType, 
        target_path as targetPath, 
        status,
        started_at as startedAt,
        completed_at as completedAt,
        files_scanned as filesScanned,
        files_with_threats as filesWithThreats,
        total_threats as totalThreats,
        error_message as errorMessage,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM scans 
      WHERE user_id = ?
      ORDER BY id DESC
      ${limitClause}`,
    );
    const scans = stmt.all(userId) as any[];

    return scans.map((scan) => ({
      id: scan.id,
      userId: scan.userId,
      scanType: scan.scanType,
      targetPath: scan.targetPath,
      status: scan.status,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt || undefined,
      filesScanned: scan.filesScanned,
      filesWithThreats: scan.filesWithThreats,
      totalThreats: scan.totalThreats,
      errorMessage: scan.errorMessage || undefined,
      createdAt: scan.createdAt,
      updatedAt: scan.updatedAt,
    }));
  }

  public updateScan(
    id: number,
    updates: {
      status?: "running" | "completed" | "failed" | "cancelled";
      completedAt?: string;
      filesScanned?: number;
      filesWithThreats?: number;
      totalThreats?: number;
      errorMessage?: string;
    },
  ): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.completedAt !== undefined) {
      fields.push("completed_at = ?");
      values.push(updates.completedAt);
    }
    if (updates.filesScanned !== undefined) {
      fields.push("files_scanned = ?");
      values.push(updates.filesScanned);
    }
    if (updates.filesWithThreats !== undefined) {
      fields.push("files_with_threats = ?");
      values.push(updates.filesWithThreats);
    }
    if (updates.totalThreats !== undefined) {
      fields.push("total_threats = ?");
      values.push(updates.totalThreats);
    }
    if (updates.errorMessage !== undefined) {
      fields.push("error_message = ?");
      values.push(updates.errorMessage);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE scans SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(...values);
  }

  public deleteScanById(id: number): void {
    const stmt = this.db.prepare("DELETE FROM scans WHERE id = ?");
    stmt.run(id);
  }
}
