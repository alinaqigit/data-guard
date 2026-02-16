import { User } from "./db.user";
import { Policy } from "./db.policy";
import { Scan } from "./db.scan";
import { LiveScanner } from "./db.liveScanner";

export class dbService {
  public user: User;
  public policy: Policy;
  public scan: Scan;
  public liveScanner: LiveScanner;

  constructor(DB_PATH: string) {
    this.user = new User(DB_PATH);
    this.policy = new Policy(DB_PATH);
    this.scan = new Scan(DB_PATH);
    this.liveScanner = new LiveScanner(DB_PATH);
  }
}
