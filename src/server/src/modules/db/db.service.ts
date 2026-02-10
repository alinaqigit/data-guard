import {User} from "./db.user";

export class dbService {
  public user: User;

  constructor(DB_PATH: string) {
    this.user = new User(DB_PATH);
  }
}