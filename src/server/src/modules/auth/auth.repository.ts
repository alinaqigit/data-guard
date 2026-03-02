import { UserEntity } from "../../entities";
import { dbModule } from "../db";

export class authRepository {
  private db: dbModule;

  constructor(DB_PATH: string) {
    this.db = new dbModule(DB_PATH);
  }

  public retreiveUserFromDB({ username }: { username: string }) {
    return this.db.dbService.user.getUserByUsername(username);
  }

  public getUserById(id: number): UserEntity | null {
    return this.db.dbService.user.getUserById(id);
  }

  public registerUser(user: {
    username: string;
    passwordHash: string;
  }): UserEntity {
    return this.db.dbService.user.createUser(user);
  }

  public updateUserProfile(
    id: number,
    data: { email?: string; bio?: string; username?: string },
  ): UserEntity | null {
    return this.db.dbService.user.updateUserProfile(id, data);
  }

  public getUserByEmail(email: string): UserEntity | null {
    return this.db.dbService.user.getUserByEmail(email);
  }

  public updateUserPassword(id: number, passwordHash: string): void {
    this.db.dbService.user.updateUserPassword(id, passwordHash);
  }

  // Remember Token operations

  public createRememberToken(token: string, userId: number, expiresAt: string): void {
    this.db.dbService.user.createRememberToken(token, userId, expiresAt);
  }

  public getRememberToken(token: string): { token: string; userId: number; expiresAt: string } | null {
    return this.db.dbService.user.getRememberToken(token);
  }

  public deleteRememberToken(token: string): void {
    this.db.dbService.user.deleteRememberToken(token);
  }

  public deleteRememberTokensByUserId(userId: number): void {
    this.db.dbService.user.deleteRememberTokensByUserId(userId);
  }
}
