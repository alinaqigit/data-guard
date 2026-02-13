import { policyService } from "./policy.service";
import { policyController } from "./policy.controller";

export class policyModule {
  public readonly policyService: policyService;
  public readonly policyController: policyController;

  constructor(DB_PATH: string) {
    this.policyService = new policyService(DB_PATH);
    this.policyController = new policyController(this.policyService);
  }
}
