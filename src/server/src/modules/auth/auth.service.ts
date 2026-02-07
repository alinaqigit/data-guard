import { authRepository } from "./auth.repository";
import { authResponse } from "./auth.types";
import { loginDTO, registerDTO } from "./dto";

export class authService {
  private readonly authRepository: authRepository;

  constructor(DB_PATH: string) {
    this.authRepository = new authRepository(DB_PATH);
  }

  public login(dto: loginDTO): authResponse {
    // Implement login logic here
    return {} as authResponse;
  }

  public register(dto: registerDTO): authResponse {
    // Implement registration logic here
    return {} as authResponse;
  }
}