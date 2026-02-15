import { scannerService } from "./scanner.service";
import { scannerController } from "./scanner.controller";

export class scannerModule {
  public readonly scannerService: scannerService;
  public readonly scannerController: scannerController;

  constructor(DB_PATH: string) {
    this.scannerService = new scannerService(DB_PATH);
    this.scannerController = new scannerController(
      this.scannerService,
    );
  }
}
