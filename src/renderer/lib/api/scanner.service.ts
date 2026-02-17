// Scanner API Service

import { api } from "./client";
import {
  StartScanRequest,
  StartScanResponse,
  Scan,
  ScanProgress,
} from "./types";

export const scannerService = {
  /**
   * Start a new scan
   */
  async startScan(
    data: StartScanRequest,
  ): Promise<StartScanResponse> {
    return api.post<StartScanResponse>("/api/scans", data, true);
  },

  /**
   * Get all scans for the current user
   */
  async getAllScans(limit?: number): Promise<{ scans: Scan[] }> {
    const endpoint = limit
      ? `/api/scans?limit=${limit}`
      : "/api/scans";
    return api.get<{ scans: Scan[] }>(endpoint, true);
  },

  /**
   * Get a single scan by ID
   */
  async getScanById(id: number): Promise<Scan> {
    return api.get<Scan>(`/api/scans/${id}`, true);
  },

  /**
   * Get scan progress (for running scans)
   */
  async getScanProgress(id: number): Promise<ScanProgress> {
    return api.get<ScanProgress>(`/api/scans/${id}/progress`, true);
  },

  /**
   * Cancel a running scan
   */
  async cancelScan(id: number): Promise<{ message: string }> {
    return api.patch<{ message: string }>(
      `/api/scans/${id}/cancel`,
      undefined,
      true,
    );
  },

  /**
   * Delete a scan
   */
  async deleteScan(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/api/scans/${id}`, true);
  },
};
