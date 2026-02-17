// Live Scanner API Service

import { api } from "./client";
import {
  CreateLiveScannerRequest,
  LiveScanner,
  LiveScannerStats,
} from "./types";

export const liveScannerService = {
  /**
   * Start a new live scanner
   */
  async startLiveScanner(
    data: CreateLiveScannerRequest,
  ): Promise<{ scannerId: number; message: string }> {
    return api.post<{ scannerId: number; message: string }>(
      "/api/live-scanners",
      data,
      true,
    );
  },

  /**
   * Get all live scanners for the current user
   */
  async getAllLiveScanners(): Promise<LiveScanner[]> {
    return api.get<LiveScanner[]>("/api/live-scanners", true);
  },

  /**
   * Get a single live scanner by ID
   */
  async getLiveScannerById(id: number): Promise<LiveScanner> {
    return api.get<LiveScanner>(`/api/live-scanners/${id}`, true);
  },

  /**
   * Get live scanner stats and recent activity
   */
  async getLiveScannerStats(id: number): Promise<LiveScannerStats> {
    return api.get<LiveScannerStats>(
      `/api/live-scanners/${id}/stats`,
      true,
    );
  },

  /**
   * Stop a live scanner
   */
  async stopLiveScanner(id: number): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/api/live-scanners/${id}/stop`,
      undefined,
      true,
    );
  },

  /**
   * Pause a live scanner
   */
  async pauseLiveScanner(id: number): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/api/live-scanners/${id}/pause`,
      undefined,
      true,
    );
  },

  /**
   * Resume a paused live scanner
   */
  async resumeLiveScanner(id: number): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/api/live-scanners/${id}/resume`,
      undefined,
      true,
    );
  },

  /**
   * Delete a live scanner
   */
  async deleteLiveScanner(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/api/live-scanners/${id}`,
      true,
    );
  },
};
