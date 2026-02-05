import { authRepository } from "./auth.repository";

export class authService {
  private readonly authRepository: authRepository;

  constructor(DB_PATH: string) {
    this.authRepository = new authRepository(DB_PATH);
  }
}