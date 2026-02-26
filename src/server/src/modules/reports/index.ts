import { reportsService } from "./reports.service";
import { reportsController } from "./reports.controller";

export class reportsModule {
  public readonly reportsService: reportsService;
  public readonly reportsController: reportsController;

  constructor(DB_PATH: string) {
    this.reportsService = new reportsService(DB_PATH);
    this.reportsController = new reportsController(this.reportsService);
  }
}

export { reportsService } from "./reports.service";
export { reportsController } from "./reports.controller";
export * from "./reports.types";
