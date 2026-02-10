import { Response } from "express";

export class authResponse {
  status: number;
  message?: string;
  body?: any;
}