import { PolicyEngineService } from "./policyEngine.service";

/**
 * Policy Engine Module - Internal service for evaluating content against policies
 * No HTTP controller - used by Scanner, Monitor, and other modules
 */
export class PolicyEngineModule {
  public readonly policyEngineService: PolicyEngineService;

  constructor() {
    // Policy engine is stateless, no DB_PATH needed
    this.policyEngineService = new PolicyEngineService();
  }
}
