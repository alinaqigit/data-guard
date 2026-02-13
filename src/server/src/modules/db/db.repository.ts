import Database from "better-sqlite3-multiple-ciphers";
import { initializeDatabaseQuery } from "./db.queries";
import fs from "fs";
import { UserEntity, PolicyEntity } from "../../entities";

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
}
