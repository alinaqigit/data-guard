import { fileActionsService } from "./fileActions.service";
import { fileActionsController } from "./fileActions.controller";

export class fileActionsModule {
  public readonly service: fileActionsService;
  public readonly controller: fileActionsController;

  constructor(DB_PATH: string) {
    this.service = new fileActionsService(DB_PATH);
    this.controller = new fileActionsController(this.service);
  }
}

export { fileActionsService } from "./fileActions.service";
export { fileActionsController } from "./fileActions.controller";
export * from "./fileActions.types";