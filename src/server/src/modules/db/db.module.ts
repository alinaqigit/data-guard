import { dbService } from "./db.service";

export class dbModule {
  public readonly dbService: dbService;

  constructor(DB_PATH: string) {
    this.dbService = new dbService(DB_PATH);
  }
}