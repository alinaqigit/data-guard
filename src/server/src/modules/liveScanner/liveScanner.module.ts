import { liveScannerService } from "./liveScanner.service";
import { liveScannerController } from "./liveScanner.controller";

export class liveScannerModule {
  public readonly liveScannerService: liveScannerService;
  public readonly liveScannerController: liveScannerController;

  constructor(DB_PATH: string) {
    this.liveScannerService = new liveScannerService(DB_PATH);
    this.liveScannerController = new liveScannerController(
      this.liveScannerService,
    );
  }
}
