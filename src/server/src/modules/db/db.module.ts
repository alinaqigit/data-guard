import { dbService } from "./db.service";

export class dbModule {
  private dbService: dbService;

  constructor() {
    this.dbService = new dbService();
  }
}