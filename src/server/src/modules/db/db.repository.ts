import Database from "better-sqlite3-multiple-ciphers";
import { initializeDatabaseQuery } from "./db.queries";
import fs from "fs";
import {
  UserEntity,
  PolicyEntity,
  ScanEntity,
  LiveScannerEntity,
} from "../../entities";

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

  // Live Scanner CRUD operations

  public createLiveScanner(liveScannerData: {
    userId: number;
    name: string;
    targetPath: string;
    watchMode: "file-changes" | "directory-changes" | "both";
    isRecursive: boolean;
    status: "active" | "paused" | "stopped";
  }): LiveScannerEntity {
    const stmt = this.db.prepare(
      "INSERT INTO live_scanners (user_id, name, target_path, watch_mode, is_recursive, status, started_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    );
    const info = stmt.run(
      liveScannerData.userId,
      liveScannerData.name,
      liveScannerData.targetPath,
      liveScannerData.watchMode,
      liveScannerData.isRecursive ? 1 : 0,
      liveScannerData.status,
    );

    return {
      id: info.lastInsertRowid as number,
      userId: liveScannerData.userId,
      name: liveScannerData.name,
      targetPath: liveScannerData.targetPath,
      watchMode: liveScannerData.watchMode,
      isRecursive: liveScannerData.isRecursive,
      status: liveScannerData.status,
      startedAt: new Date().toISOString(),
      filesMonitored: 0,
      filesScanned: 0,
      threatsDetected: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getLiveScannerById(id: number): LiveScannerEntity | null {
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        name, 
        target_path as targetPath, 
        watch_mode as watchMode,
        is_recursive as isRecursive,
        status,
        started_at as startedAt,
        stopped_at as stoppedAt,
        files_monitored as filesMonitored,
        files_scanned as filesScanned,
        threats_detected as threatsDetected,
        last_activity_at as lastActivityAt,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM live_scanners 
      WHERE id = ?`,
    );
    const liveScanner = stmt.get(id) as any;

    if (!liveScanner) {
      return null;
    }

    return {
      id: liveScanner.id,
      userId: liveScanner.userId,
      name: liveScanner.name,
      targetPath: liveScanner.targetPath,
      watchMode: liveScanner.watchMode,
      isRecursive: liveScanner.isRecursive === 1,
      status: liveScanner.status,
      startedAt: liveScanner.startedAt,
      stoppedAt: liveScanner.stoppedAt || undefined,
      filesMonitored: liveScanner.filesMonitored,
      filesScanned: liveScanner.filesScanned,
      threatsDetected: liveScanner.threatsDetected,
      lastActivityAt: liveScanner.lastActivityAt || undefined,
      createdAt: liveScanner.createdAt,
      updatedAt: liveScanner.updatedAt,
    };
  }

  public getAllLiveScannersByUserId(
    userId: number,
  ): LiveScannerEntity[] {
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        name, 
        target_path as targetPath, 
        watch_mode as watchMode,
        is_recursive as isRecursive,
        status,
        started_at as startedAt,
        stopped_at as stoppedAt,
        files_monitored as filesMonitored,
        files_scanned as filesScanned,
        threats_detected as threatsDetected,
        last_activity_at as lastActivityAt,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM live_scanners 
      WHERE user_id = ?
      ORDER BY id DESC`,
    );
    const liveScanners = stmt.all(userId) as any[];

    return liveScanners.map((liveScanner) => ({
      id: liveScanner.id,
      userId: liveScanner.userId,
      name: liveScanner.name,
      targetPath: liveScanner.targetPath,
      watchMode: liveScanner.watchMode,
      isRecursive: liveScanner.isRecursive === 1,
      status: liveScanner.status,
      startedAt: liveScanner.startedAt,
      stoppedAt: liveScanner.stoppedAt || undefined,
      filesMonitored: liveScanner.filesMonitored,
      filesScanned: liveScanner.filesScanned,
      threatsDetected: liveScanner.threatsDetected,
      lastActivityAt: liveScanner.lastActivityAt || undefined,
      createdAt: liveScanner.createdAt,
      updatedAt: liveScanner.updatedAt,
    }));
  }

  public getActiveLiveScannersByUserId(
    userId: number,
  ): LiveScannerEntity[] {
    const stmt = this.db.prepare(
      `SELECT 
        id, 
        user_id as userId, 
        name, 
        target_path as targetPath, 
        watch_mode as watchMode,
        is_recursive as isRecursive,
        status,
        started_at as startedAt,
        stopped_at as stoppedAt,
        files_monitored as filesMonitored,
        files_scanned as filesScanned,
        threats_detected as threatsDetected,
        last_activity_at as lastActivityAt,
        created_at as createdAt,
        updated_at as updatedAt 
      FROM live_scanners 
      WHERE user_id = ? AND status = 'active'
      ORDER BY id DESC`,
    );
    const liveScanners = stmt.all(userId) as any[];

    return liveScanners.map((liveScanner) => ({
      id: liveScanner.id,
      userId: liveScanner.userId,
      name: liveScanner.name,
      targetPath: liveScanner.targetPath,
      watchMode: liveScanner.watchMode,
      isRecursive: liveScanner.isRecursive === 1,
      status: liveScanner.status,
      startedAt: liveScanner.startedAt,
      stoppedAt: liveScanner.stoppedAt || undefined,
      filesMonitored: liveScanner.filesMonitored,
      filesScanned: liveScanner.filesScanned,
      threatsDetected: liveScanner.threatsDetected,
      lastActivityAt: liveScanner.lastActivityAt || undefined,
      createdAt: liveScanner.createdAt,
      updatedAt: liveScanner.updatedAt,
    }));
  }

  public updateLiveScanner(
    id: number,
    updates: {
      name?: string;
      status?: "active" | "paused" | "stopped";
      stoppedAt?: string;
      filesMonitored?: number;
      filesScanned?: number;
      threatsDetected?: number;
      lastActivityAt?: string;
    },
  ): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.status) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.stoppedAt !== undefined) {
      fields.push("stopped_at = ?");
      values.push(updates.stoppedAt);
    }
    if (updates.filesMonitored !== undefined) {
      fields.push("files_monitored = ?");
      values.push(updates.filesMonitored);
    }
    if (updates.filesScanned !== undefined) {
      fields.push("files_scanned = ?");
      values.push(updates.filesScanned);
    }
    if (updates.threatsDetected !== undefined) {
      fields.push("threats_detected = ?");
      values.push(updates.threatsDetected);
    }
    if (updates.lastActivityAt !== undefined) {
      fields.push("last_activity_at = ?");
      values.push(updates.lastActivityAt);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE live_scanners SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(...values);
  }

  public deleteLiveScannerById(id: number): void {
    const stmt = this.db.prepare(
      "DELETE FROM live_scanners WHERE id = ?",
    );
    stmt.run(id);
  }
}
