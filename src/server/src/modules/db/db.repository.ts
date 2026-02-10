import Database from "better-sqlite3-multiple-ciphers";
import { initializeDatabaseQuery } from "./db.queries";
import fs from "fs";
import { UserEntity } from "../../entities";

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
}
