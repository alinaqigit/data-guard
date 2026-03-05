import {
  reportsService,
  GenerateReportPayload,
} from "@/lib/api/reports.service";
import { api, getSessionId } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  getSessionId: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockGetSessionId = getSessionId as jest.MockedFunction<
  typeof getSessionId
>;

// Mock fetch for downloadReport
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock DOM APIs for downloadReport
const mockCreateElement = jest.spyOn(document, "createElement");
const mockCreateObjectURL = jest
  .fn()
  .mockReturnValue("blob:mock-url");
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(URL, "createObjectURL", {
  value: mockCreateObjectURL,
});
Object.defineProperty(URL, "revokeObjectURL", {
  value: mockRevokeObjectURL,
});

describe("reportsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateReport", () => {
    it("calls POST /api/reports with payload and auth", async () => {
      const payload: GenerateReportPayload = {
        reportType: "quick",
        format: "pdf",
        dateRange: "today",
        reportName: "Test Report",
      };
      mockApi.post.mockResolvedValueOnce({ reportId: 42 });

      const result = await reportsService.generateReport(payload);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/reports",
        payload,
        true,
      );
      expect(result).toEqual({ reportId: 42 });
    });
  });

  describe("getReports", () => {
    it("calls GET /api/reports and returns reports array", async () => {
      const reports = [
        {
          id: 1,
          name: "Report 1",
          reportType: "quick",
          format: "pdf",
        },
        {
          id: 2,
          name: "Report 2",
          reportType: "full",
          format: "xlsx",
        },
      ];
      mockApi.get.mockResolvedValueOnce({ reports });

      const result = await reportsService.getReports();

      expect(mockApi.get).toHaveBeenCalledWith("/api/reports", true);
      expect(result).toEqual(reports);
    });
  });

  describe("downloadReport", () => {
    it("fetches the report blob and triggers download", async () => {
      mockGetSessionId.mockReturnValue("session-123");
      const mockBlob = new Blob(["test data"], {
        type: "application/pdf",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const mockAnchor = {
        href: "",
        download: "",
        click: jest.fn(),
      };
      mockCreateElement.mockReturnValueOnce(mockAnchor as any);

      const appendChildSpy = jest
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => node);
      const removeChildSpy = jest
        .spyOn(document.body, "removeChild")
        .mockImplementation((node) => node);

      await reportsService.downloadReport(42, "report.pdf", "pdf");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/reports/42/download",
        { headers: { "x-session-id": "session-123" } },
      );
      expect(mockAnchor.download).toBe("report.pdf");
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:mock-url",
      );

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it("throws on failed download", async () => {
      mockGetSessionId.mockReturnValue("session-123");
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(
        reportsService.downloadReport(99, "bad.pdf", "pdf"),
      ).rejects.toThrow("Download failed");
    });
  });

  describe("deleteReport", () => {
    it("calls DELETE /api/reports/:id with auth", async () => {
      mockApi.delete.mockResolvedValueOnce(undefined);

      await reportsService.deleteReport(15);

      expect(mockApi.delete).toHaveBeenCalledWith(
        "/api/reports/15",
        true,
      );
    });
  });
});
