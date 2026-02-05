import Database from "better-sqlite3";
import { initializeDatabaseQuery } from "./db.queries";
import fs from "fs";

export class dbRepository {
  private db: Database.Database;

  constructor(DB_PATH: string) {

    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(DB_PATH, { recursive: true });
    }

    this.db = new Database(DB_PATH + "/data_guard.db", { fileMustExist: false });
    this.db.exec(initializeDatabaseQuery);
  }

  public createUser(userData: { username: string; passwordHash: string }) {
    const stmt = this.db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    );
    const info = stmt.run(userData.username, userData.passwordHash);
    return info;
  }

  public getUserByUsername(username: string) {
    const stmt = this.db.prepare("SELECT * FROM users WHERE username = ?");
    const user = stmt.get(username);
    return user;
  }

  public deleteUserByUsername(username: string) {
    const stmt = this.db.prepare("DELETE FROM users WHERE username = ?");
    const info = stmt.run(username);
    return info;
  }

  public updateUserName(oldUsername: string, newUsername: string) {
    const stmt = this.db.prepare(
      "UPDATE users SET username = ? WHERE username = ?",
    );
    const info = stmt.run(newUsername, oldUsername);
    return info;
  }
}