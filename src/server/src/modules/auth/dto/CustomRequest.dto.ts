import { Request } from "express";
import { ParentDTO } from "./Parent.dto";

export interface CustomRequest extends Request {
  dto?: ParentDTO; // You can specify a more specific type if you have one
}