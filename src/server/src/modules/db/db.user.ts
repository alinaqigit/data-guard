import { dbRepository } from "./db.repository";

export class User {
  private dbRepository: dbRepository;
  constructor(DB_PATH: string) {
    this.dbRepository = new dbRepository(DB_PATH);
  }

  public createUser(userData: { username: string; passwordHash: string }) {
    const user = this.dbRepository.getUserByUsername(userData.username);

    if (user) {
      throw new Error("User already exists");
    }

    return this.dbRepository.createUser(userData);
  }

  public getUserByUsername(username: string) {
    const user = this.dbRepository.getUserByUsername(username);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  public updateUserName(oldUsername: string, newUsername: string) {
    const user = this.dbRepository.getUserByUsername(oldUsername);

    if (!user) {
      throw new Error("User not found");
    }

    return this.dbRepository.updateUserName(oldUsername, newUsername);
  }

  public deleteUserByUsername(username: string) {
    const user = this.dbRepository.getUserByUsername(username);

    if (!user) {
      throw new Error("User not found");
    }

    return this.dbRepository.deleteUserByUsername(username);
  }
}
