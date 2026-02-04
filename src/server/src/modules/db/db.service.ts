import {User} from "./db.user";
export class dbService {
  public user: User;

  constructor() {
    this.user = new User();
  }
}