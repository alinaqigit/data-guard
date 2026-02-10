import { dbModule } from "../db";

export class authRepository {
  private db: dbModule;

  constructor(
    DB_PATH: string,
  ) {
    this.db = new dbModule(DB_PATH);
  }
}