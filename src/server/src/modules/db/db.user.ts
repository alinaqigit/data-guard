import { UserEntity } from "../../entities";
import { dbRepository } from "./db.repository";

export class User {
  private dbRepository: dbRepository;
  constructor(DB_PATH: string) {
    this.dbRepository = new dbRepository(DB_PATH);
  }

  public createUser(userData: {
    username: string;
    passwordHash: string;
  }): UserEntity {
    const user = this.dbRepository.getUserByUsername(
      userData.username,
    );

    if (user) {
      throw new Error("User already exists");
    }

    return this.dbRepository.createUser(userData);
  }

  public getUserByUsername(username: string): UserEntity | null {
    const user = this.dbRepository.getUserByUsername(username);
    return user;
  }

  public updateUserName(
    oldUsername: string,
    newUsername: string,
  ): void {
    const user = this.dbRepository.getUserByUsername(oldUsername);

    if (!user) {
      throw new Error("User not found");
    }

    return this.dbRepository.updateUserName(oldUsername, newUsername);
  }

  public getUserById(id: number): UserEntity | null {
    return this.dbRepository.getUserById(id);
  }

  public updateUserProfile(
    id: number,
    data: { email?: string; bio?: string; username?: string },
  ): UserEntity | null {
    const user = this.dbRepository.getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    this.dbRepository.updateUserProfile(id, data);
    return this.dbRepository.getUserById(id);
  }

  public deleteUserByUsername(username: string): void {
    const user = this.dbRepository.getUserByUsername(username);

    if (!user) {
      throw new Error("User not found");
    }

    return this.dbRepository.deleteUserByUsername(username);
  }
}
