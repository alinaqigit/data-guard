import { User } from "./db.user";
import { Policy } from "./db.policy";
import { Scan } from "./db.scan";
import { LiveScanner } from "./db.liveScanner";
import { Threat } from "./db.threat";

export class dbService {
  public user: User;
  public policy: Policy;
  public scan: Scan;
  public liveScanner: LiveScanner;
  public threat: Threat;

  constructor(DB_PATH: string) {
    this.user = new User(DB_PATH);
    this.policy = new Policy(DB_PATH);
    this.scan = new Scan(DB_PATH);
    this.liveScanner = new LiveScanner(DB_PATH);
    this.threat = new Threat(DB_PATH);
  }
}
