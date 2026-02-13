import { Request } from "express";
import { ParentDTO } from "./Parent.dto";

export interface CustomRequest extends Request {
  dto?: ParentDTO | boolean | null;
}
