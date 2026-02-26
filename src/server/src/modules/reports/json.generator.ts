import { ReportData } from "./reports.types";
import fs from "fs";

export function generateJSON(data: ReportData, outputPath: string): void {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(outputPath, json, "utf-8");
}
