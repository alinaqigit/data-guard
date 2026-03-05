import {
  fileActionsService,
  monitoringApiService,
} from "@/lib/api/fileActions.service";
import { api } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("fileActionsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("quarantine calls POST /api/files/quarantine with filePath", async () => {
    const response = {
      newPath: "C:\\quarantine\\file.txt",
      message: "Quarantined",
    };
    mockApi.post.mockResolvedValueOnce(response);

    const result = await fileActionsService.quarantine(
      "C:\\data\\file.txt",
    );

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/files/quarantine",
      { filePath: "C:\\data\\file.txt" },
      true,
    );
    expect(result).toEqual(response);
  });

  it("encrypt calls POST /api/files/encrypt with filePath", async () => {
    const response = {
      newPath: "C:\\data\\file.txt.enc",
      message: "Encrypted",
    };
    mockApi.post.mockResolvedValueOnce(response);

    const result = await fileActionsService.encrypt(
      "C:\\data\\file.txt",
    );

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/files/encrypt",
      { filePath: "C:\\data\\file.txt" },
      true,
    );
    expect(result).toEqual(response);
  });

  it("decrypt calls POST /api/files/decrypt with filePath", async () => {
    const response = {
      newPath: "C:\\data\\file.txt",
      message: "Decrypted",
    };
    mockApi.post.mockResolvedValueOnce(response);

    const result = await fileActionsService.decrypt(
      "C:\\data\\file.txt.enc",
    );

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/files/decrypt",
      { filePath: "C:\\data\\file.txt.enc" },
      true,
    );
    expect(result).toEqual(response);
  });

  it("deleteFile calls POST /api/files/delete with filePath", async () => {
    mockApi.post.mockResolvedValueOnce({ message: "Deleted" });

    const result = await fileActionsService.deleteFile(
      "C:\\data\\file.txt",
    );

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/files/delete",
      { filePath: "C:\\data\\file.txt" },
      true,
    );
    expect(result).toEqual({ message: "Deleted" });
  });
});

describe("monitoringApiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("startMonitoring calls POST with autoResponse", async () => {
    const response = { scannerId: 1, monitoredPaths: ["C:\\data"] };
    mockApi.post.mockResolvedValueOnce(response);

    const result = await monitoringApiService.startMonitoring(true);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/live-scanners/monitor/start",
      { autoResponse: true },
      true,
    );
    expect(result).toEqual(response);
  });

  it("stopMonitoring calls POST to stop endpoint", async () => {
    mockApi.post.mockResolvedValueOnce(undefined);

    await monitoringApiService.stopMonitoring();

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/live-scanners/monitor/stop",
      {},
      true,
    );
  });

  it("updateAutoResponse calls PATCH with autoResponse flag", async () => {
    mockApi.patch.mockResolvedValueOnce(undefined);

    await monitoringApiService.updateAutoResponse(false);

    expect(mockApi.patch).toHaveBeenCalledWith(
      "/api/live-scanners/monitor/auto-response",
      { autoResponse: false },
      true,
    );
  });

  it("getStatus calls GET on status endpoint", async () => {
    const status = { isActive: true, monitoredPaths: ["C:\\Users"] };
    mockApi.get.mockResolvedValueOnce(status);

    const result = await monitoringApiService.getStatus();

    expect(mockApi.get).toHaveBeenCalledWith(
      "/api/live-scanners/monitor/status",
      true,
    );
    expect(result).toEqual(status);
  });
});
