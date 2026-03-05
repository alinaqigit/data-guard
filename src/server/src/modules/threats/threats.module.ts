import { threatsService } from "./threats.service";
import { threatsController } from "./threats.controller";

export class threatsModule {
  public readonly threatsService: threatsService;
  public readonly threatsController: threatsController;

  constructor(DB_PATH: string) {
    this.threatsService = new threatsService(DB_PATH);
    this.threatsController = new threatsController(
      this.threatsService,
    );
  }
}
