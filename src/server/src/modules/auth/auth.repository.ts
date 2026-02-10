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

  public registerUser(user: {
    username: string;
    passwordHash: string;
  }): UserEntity {
    return this.db.dbService.user.createUser(user);
  }
}
