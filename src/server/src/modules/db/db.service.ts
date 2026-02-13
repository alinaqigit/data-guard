import { User } from "./db.user";
import { Policy } from "./db.policy";

export class dbService {
  public user: User;
  public policy: Policy;

  constructor(DB_PATH: string) {
    this.user = new User(DB_PATH);
    this.policy = new Policy(DB_PATH);
  }
}
