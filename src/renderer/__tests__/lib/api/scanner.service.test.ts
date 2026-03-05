import { scannerService } from "@/lib/api/scanner.service";
import { api } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("scannerService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("startScan calls POST /api/scans with data and auth", async () => {
    const request = {
      scanType: "quick" as const,
      targetPath: "C:\\Users",
    };
    const response = { scanId: 42, message: "Scan started" };
    mockApi.post.mockResolvedValueOnce(response);

    const result = await scannerService.startScan(request);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/scans",
      request,
      true,
    );
    expect(result).toEqual(response);
  });

  it("getAllScans calls GET /api/scans with auth", async () => {
    const scans = { scans: [{ id: 1, status: "completed" }] };
    mockApi.get.mockResolvedValueOnce(scans);

    const result = await scannerService.getAllScans();

    expect(mockApi.get).toHaveBeenCalledWith("/api/scans", true);
    expect(result).toEqual(scans);
  });

  it("getAllScans with limit appends query param", async () => {
    mockApi.get.mockResolvedValueOnce({ scans: [] });

    await scannerService.getAllScans(10);

    expect(mockApi.get).toHaveBeenCalledWith(
      "/api/scans?limit=10",
      true,
    );
  });

  it("getScanById calls GET /api/scans/:id with auth", async () => {
    const scan = { id: 5, status: "running" };
    mockApi.get.mockResolvedValueOnce(scan);

    const result = await scannerService.getScanById(5);

    expect(mockApi.get).toHaveBeenCalledWith("/api/scans/5", true);
    expect(result).toEqual(scan);
  });

  it("getScanProgress calls GET /api/scans/:id/progress with auth", async () => {
    const progress = {
      scanId: 3,
      filesScanned: 100,
      totalThreats: 2,
    };
    mockApi.get.mockResolvedValueOnce(progress);

    const result = await scannerService.getScanProgress(3);

    expect(mockApi.get).toHaveBeenCalledWith(
      "/api/scans/3/progress",
      true,
    );
    expect(result).toEqual(progress);
  });

  it("cancelScan calls PATCH /api/scans/:id/cancel with auth", async () => {
    mockApi.patch.mockResolvedValueOnce({ message: "Cancelled" });

    const result = await scannerService.cancelScan(8);

    expect(mockApi.patch).toHaveBeenCalledWith(
      "/api/scans/8/cancel",
      {},
      true,
    );
    expect(result).toEqual({ message: "Cancelled" });
  });

  it("deleteScan calls DELETE /api/scans/:id with auth", async () => {
    mockApi.delete.mockResolvedValueOnce({ message: "Deleted" });

    const result = await scannerService.deleteScan(4);

    expect(mockApi.delete).toHaveBeenCalledWith("/api/scans/4", true);
    expect(result).toEqual({ message: "Deleted" });
  });

  it("deleteAllScans calls DELETE /api/scans with auth", async () => {
    mockApi.delete.mockResolvedValueOnce(undefined);

    await scannerService.deleteAllScans();

    expect(mockApi.delete).toHaveBeenCalledWith("/api/scans", true);
  });
});
