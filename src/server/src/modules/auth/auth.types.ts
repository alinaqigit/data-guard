import { Response } from "express";

export class authResponse {
  status: number;
  error?: string;
  body?: any;
}