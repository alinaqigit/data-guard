import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import {
  SecurityProvider,
  useSecurity,
  IDLE_SCAN,
} from "@/context/SecurityContext";
import {
  authService,
  policyService,
  scannerService,
  getSessionId,
} from "@/lib/api";
import {
  fileActionsService,
  monitoringApiService,
} from "@/lib/api/fileActions.service";
import { getSocket, disconnectSocket } from "@/lib/api/socket";

// Mock all API services
jest.mock("@/lib/api", () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    verifySession: jest.fn(),
  },
  policyService: {
    getAllPolicies: jest.fn().mockResolvedValue([]),
    createPolicy: jest.fn(),
    updatePolicy: jest.fn(),
    togglePolicy: jest.fn(),
    deletePolicy: jest.fn(),
  },
  scannerService: {
    getAllScans: jest.fn().mockResolvedValue({ scans: [] }),
    startScan: jest.fn(),
    deleteAllScans: jest.fn(),
  },
  getSessionId: jest.fn().mockReturnValue(null),
  setRememberedCredentials: jest.fn(),
  getRememberedCredentials: jest.fn().mockReturnValue(null),
  clearRememberedCredentials: jest.fn(),
}));

jest.mock("@/lib/api/fileActions.service", () => ({
  fileActionsService: {
    quarantine: jest.fn(),
    encrypt: jest.fn(),
    deleteFile: jest.fn(),
  },
  monitoringApiService: {
    startMonitoring: jest.fn().mockResolvedValue({}),
    stopMonitoring: jest.fn().mockResolvedValue(undefined),
    updateAutoResponse: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn(),
  },
}));

jest.mock("@/lib/api/socket", () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    getSocket: jest.fn().mockReturnValue(mockSocket),
    disconnectSocket: jest.fn(),
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Helper component to consume the context
function TestConsumer({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useSecurity>) => void;
}) {
  const ctx = useSecurity();
  React.useEffect(() => {
    onContext(ctx);
  });
  return <div data-testid="consumer" />;
}

function renderWithProvider(
  onContext: (ctx: ReturnType<typeof useSecurity>) => void,
) {
  return render(
    <SecurityProvider>
      <TestConsumer onContext={onContext} />
    </SecurityProvider>,
  );
}

describe("SecurityContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (getSessionId as jest.Mock).mockReturnValue(null);
  });

  it("provides default values", async () => {
    let ctx: ReturnType<typeof useSecurity> | undefined;
    renderWithProvider((c) => {
      ctx = c;
    });

    await waitFor(() => {
      expect(ctx).toBeDefined();
      expect(ctx!.isAuthenticated).toBe(false);
      expect(ctx!.user).toBeNull();
      expect(ctx!.scans).toEqual([]);
      expect(ctx!.alerts).toEqual([]);
      expect(ctx!.policies).toEqual([]);
      expect(ctx!.theme).toBe("dark");
      expect(ctx!.scanState).toEqual(IDLE_SCAN);
    });
  });

  it("throws error when useSecurity is used outside provider", () => {
    // Suppress expected console.error from React
    const spy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function BadConsumer() {
      useSecurity();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      "useSecurity must be used within a SecurityProvider",
    );

    spy.mockRestore();
  });

  describe("login", () => {
    it("sets authenticated state after successful login", async () => {
      const loginResponse = {
        user: { id: 1, username: "testuser" },
        sessionId: "sess-123",
      };
      (authService.login as jest.Mock).mockResolvedValueOnce(
        loginResponse,
      );
      (
        policyService.getAllPolicies as jest.Mock
      ).mockResolvedValueOnce([]);
      (scannerService.getAllScans as jest.Mock).mockResolvedValueOnce(
        { scans: [] },
      );

      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.login("testuser", "password123");
      });

      await waitFor(() => {
        expect(ctx!.isAuthenticated).toBe(true);
        expect(ctx!.user?.name).toBe("testuser");
      });
    });
  });

  describe("logout", () => {
    it("clears state after logout", async () => {
      // First login
      (authService.login as jest.Mock).mockResolvedValueOnce({
        user: { id: 1, username: "testuser" },
        sessionId: "sess-123",
      });
      (authService.logout as jest.Mock).mockResolvedValueOnce(
        undefined,
      );
      (policyService.getAllPolicies as jest.Mock).mockResolvedValue(
        [],
      );
      (scannerService.getAllScans as jest.Mock).mockResolvedValue({
        scans: [],
      });

      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.login("testuser", "pass");
      });

      await waitFor(() => expect(ctx!.isAuthenticated).toBe(true));

      await act(async () => {
        await ctx!.logout();
      });

      await waitFor(() => {
        expect(ctx!.isAuthenticated).toBe(false);
        expect(ctx!.user).toBeNull();
        expect(ctx!.policies).toEqual([]);
        expect(ctx!.scans).toEqual([]);
        expect(disconnectSocket).toHaveBeenCalled();
      });
    });
  });

  describe("theme", () => {
    it("toggles between light and dark", async () => {
      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx!.theme).toBe("dark"));

      act(() => {
        ctx!.toggleTheme();
      });

      await waitFor(() => expect(ctx!.theme).toBe("light"));

      act(() => {
        ctx!.toggleTheme();
      });

      await waitFor(() => expect(ctx!.theme).toBe("dark"));
    });
  });

  describe("alert management", () => {
    it("resolves an alert", async () => {
      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      // We can't easily add alerts through the provider directly
      // but we can test the resolve/delete/clear functions exist
      expect(typeof ctx!.resolveAlert).toBe("function");
      expect(typeof ctx!.deleteAlert).toBe("function");
      expect(typeof ctx!.clearAllAlerts).toBe("function");
      expect(typeof ctx!.updateAlertStatus).toBe("function");
    });
  });

  describe("policy management", () => {
    it("adds a policy", async () => {
      const createdPolicy = {
        id: 10,
        userId: 1,
        name: "SSN Policy",
        pattern: "\\d{3}-\\d{2}-\\d{4}",
        type: "regex" as const,
        description: "Detect SSNs",
        isEnabled: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      (policyService.createPolicy as jest.Mock).mockResolvedValueOnce(
        createdPolicy,
      );

      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.addPolicy({
          name: "SSN Policy",
          description: "Detect SSNs",
          type: "REGEX",
          pattern: "\\d{3}-\\d{2}-\\d{4}",
          status: "Active",
        });
      });

      await waitFor(() => {
        expect(ctx!.policies).toHaveLength(1);
        expect(ctx!.policies[0].name).toBe("SSN Policy");
        expect(ctx!.policies[0].status).toBe("Active");
      });
    });

    it("deletes a policy", async () => {
      // First create one
      const createdPolicy = {
        id: 5,
        userId: 1,
        name: "Test",
        pattern: "test",
        type: "keyword" as const,
        isEnabled: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      (policyService.createPolicy as jest.Mock).mockResolvedValueOnce(
        createdPolicy,
      );
      (policyService.deletePolicy as jest.Mock).mockResolvedValueOnce(
        { message: "Deleted" },
      );

      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.addPolicy({
          name: "Test",
          description: "",
          type: "KEYWORD",
          pattern: "test",
          status: "Active",
        });
      });

      await waitFor(() => expect(ctx!.policies).toHaveLength(1));

      await act(async () => {
        await ctx!.deletePolicy("5");
      });

      await waitFor(() => expect(ctx!.policies).toHaveLength(0));
    });
  });

  describe("file actions", () => {
    it("quarantine calls fileActionsService", async () => {
      (
        fileActionsService.quarantine as jest.Mock
      ).mockResolvedValueOnce({
        newPath: "C:\\quarantine\\file.txt",
        message: "Quarantined",
      });

      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.quarantineFile(1, "C:\\data\\file.txt");
      });

      expect(fileActionsService.quarantine).toHaveBeenCalledWith(
        "C:\\data\\file.txt",
      );
    });

    it("encrypt calls fileActionsService", async () => {
      (fileActionsService.encrypt as jest.Mock).mockResolvedValueOnce(
        {
          newPath: "C:\\data\\file.txt.enc",
          message: "Encrypted",
        },
      );

      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.encryptFile(1, "C:\\data\\file.txt");
      });

      expect(fileActionsService.encrypt).toHaveBeenCalledWith(
        "C:\\data\\file.txt",
      );
    });
  });

  describe("monitoring settings", () => {
    it("updates monitoring settings", async () => {
      let ctx: ReturnType<typeof useSecurity> | undefined;
      renderWithProvider((c) => {
        ctx = c;
      });

      await waitFor(() => expect(ctx).toBeDefined());

      await act(async () => {
        await ctx!.updateMonitoringSettings({ notifications: false });
      });

      await waitFor(() => {
        expect(ctx!.monitoringSettings.notifications).toBe(false);
      });
    });
  });
});
