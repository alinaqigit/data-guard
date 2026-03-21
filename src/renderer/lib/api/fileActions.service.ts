import { api } from "./client";

export const fileActionsService = {
  async quarantine(
    filePath: string,
  ): Promise<{ newPath: string; message: string }> {
    return api.post("/api/files/quarantine", { filePath }, true);
  },

  async encrypt(
    filePath: string,
  ): Promise<{ newPath: string; message: string }> {
    return api.post("/api/files/encrypt", { filePath }, true);
  },

  async decrypt(
    filePath: string,
  ): Promise<{ newPath: string; message: string }> {
    return api.post("/api/files/decrypt", { filePath }, true);
  },

  async deleteFile(filePath: string): Promise<{ message: string }> {
    return api.post("/api/files/delete", { filePath }, true);
  },

  async openFile(filePath: string): Promise<{ message: string }> {
    return api.post("/api/files/open", { filePath }, true);
  },

  async showInFolder(filePath: string): Promise<{ message: string }> {
    return api.post("/api/files/show-in-folder", { filePath }, true);
  },

  async getEncryptedFiles(): Promise<{
    files: {
      id: number;
      userId: number;
      originalPath: string;
      encryptedPath: string;
      encryptedAt: string;
    }[];
  }> {
    return api.get("/api/files/encrypted", true);
  },

  async deleteAllEncryptedRecords(): Promise<{
    deletedCount: number;
    message: string;
  }> {
    return api.delete("/api/files/encrypted", true);
  },
};

export const monitoringApiService = {
  async startMonitoring(
    autoResponse: boolean,
  ): Promise<{ scannerId: number; monitoredPaths: string[] }> {
    return api.post(
      "/api/live-scanners/monitor/start",
      { autoResponse },
      true,
    );
  },

  async stopMonitoring(): Promise<void> {
    await api.post("/api/live-scanners/monitor/stop", {}, true);
  },

  async updateAutoResponse(autoResponse: boolean): Promise<void> {
    await api.patch(
      "/api/live-scanners/monitor/auto-response",
      { autoResponse },
      true,
    );
  },

  async getStatus(): Promise<{
    isActive: boolean;
    monitoredPaths: string[];
  }> {
    return api.get("/api/live-scanners/monitor/status", true);
  },
};
