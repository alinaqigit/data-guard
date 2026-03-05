import { liveScannerService } from "@/lib/api/liveScanner.service";
import { api } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("liveScannerService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("startLiveScanner calls POST /api/live-scanners with data", async () => {
    const request = {
      name: "My Scanner",
      targetPath: "C:\\Documents",
      watchMode: "both" as const,
      isRecursive: true,
    };
    const response = { scannerId: 5, message: "Started" };
    mockApi.post.mockResolvedValueOnce(response);

    const result = await liveScannerService.startLiveScanner(request);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/live-scanners",
      request,
      true,
    );
    expect(result).toEqual(response);
  });

  it("getAllLiveScanners calls GET /api/live-scanners", async () => {
    const scanners = [{ id: 1, name: "Scanner 1" }];
    mockApi.get.mockResolvedValueOnce(scanners);

    const result = await liveScannerService.getAllLiveScanners();

    expect(mockApi.get).toHaveBeenCalledWith(
      "/api/live-scanners",
      true,
    );
    expect(result).toEqual(scanners);
  });

  it("getLiveScannerById calls GET /api/live-scanners/:id", async () => {
    const scanner = { id: 3, name: "Scanner 3" };
    mockApi.get.mockResolvedValueOnce(scanner);

    const result = await liveScannerService.getLiveScannerById(3);

    expect(mockApi.get).toHaveBeenCalledWith(
      "/api/live-scanners/3",
      true,
    );
    expect(result).toEqual(scanner);
  });

  it("getLiveScannerStats calls GET /api/live-scanners/:id/stats", async () => {
    const stats = {
      scanner: { id: 2 },
      recentActivity: [],
      uptime: 3600,
    };
    mockApi.get.mockResolvedValueOnce(stats);

    const result = await liveScannerService.getLiveScannerStats(2);

    expect(mockApi.get).toHaveBeenCalledWith(
      "/api/live-scanners/2/stats",
      true,
    );
    expect(result).toEqual(stats);
  });

  it("stopLiveScanner calls POST /api/live-scanners/:id/stop", async () => {
    mockApi.post.mockResolvedValueOnce({ message: "Stopped" });

    const result = await liveScannerService.stopLiveScanner(4);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/live-scanners/4/stop",
      undefined,
      true,
    );
    expect(result).toEqual({ message: "Stopped" });
  });

  it("pauseLiveScanner calls POST /api/live-scanners/:id/pause", async () => {
    mockApi.post.mockResolvedValueOnce({ message: "Paused" });

    const result = await liveScannerService.pauseLiveScanner(6);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/live-scanners/6/pause",
      undefined,
      true,
    );
    expect(result).toEqual({ message: "Paused" });
  });

  it("resumeLiveScanner calls POST /api/live-scanners/:id/resume", async () => {
    mockApi.post.mockResolvedValueOnce({ message: "Resumed" });

    const result = await liveScannerService.resumeLiveScanner(6);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/live-scanners/6/resume",
      undefined,
      true,
    );
    expect(result).toEqual({ message: "Resumed" });
  });

  it("deleteLiveScanner calls DELETE /api/live-scanners/:id", async () => {
    mockApi.delete.mockResolvedValueOnce({ message: "Deleted" });

    const result = await liveScannerService.deleteLiveScanner(9);

    expect(mockApi.delete).toHaveBeenCalledWith(
      "/api/live-scanners/9",
      true,
    );
    expect(result).toEqual({ message: "Deleted" });
  });
});
