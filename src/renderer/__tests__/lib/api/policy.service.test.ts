import { policyService } from "@/lib/api/policy.service";
import { api } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("policyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getAllPolicies calls GET /api/policies with auth", async () => {
    const policies = [
      {
        id: 1,
        name: "SSN Policy",
        type: "regex",
        pattern: "\\d{3}-\\d{2}-\\d{4}",
      },
    ];
    mockApi.get.mockResolvedValueOnce(policies);

    const result = await policyService.getAllPolicies();

    expect(mockApi.get).toHaveBeenCalledWith("/api/policies", true);
    expect(result).toEqual(policies);
  });

  it("getPolicyById calls GET /api/policies/:id with auth", async () => {
    const policy = { id: 5, name: "Email Policy" };
    mockApi.get.mockResolvedValueOnce(policy);

    const result = await policyService.getPolicyById(5);

    expect(mockApi.get).toHaveBeenCalledWith("/api/policies/5", true);
    expect(result).toEqual(policy);
  });

  it("createPolicy calls POST /api/policies with data and auth", async () => {
    const newPolicy = {
      name: "Credit Card",
      pattern: "\\d{16}",
      type: "regex" as const,
    };
    const created = { id: 10, ...newPolicy };
    mockApi.post.mockResolvedValueOnce(created);

    const result = await policyService.createPolicy(newPolicy);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/policies",
      newPolicy,
      true,
    );
    expect(result).toEqual(created);
  });

  it("updatePolicy calls PUT /api/policies/:id with data and auth", async () => {
    const updates = { name: "Updated Policy" };
    const updated = { id: 3, name: "Updated Policy" };
    mockApi.put.mockResolvedValueOnce(updated);

    const result = await policyService.updatePolicy(3, updates);

    expect(mockApi.put).toHaveBeenCalledWith(
      "/api/policies/3",
      updates,
      true,
    );
    expect(result).toEqual(updated);
  });

  it("togglePolicy calls PATCH /api/policies/:id/toggle with auth", async () => {
    const toggled = { id: 7, isEnabled: false };
    mockApi.patch.mockResolvedValueOnce(toggled);

    const result = await policyService.togglePolicy(7);

    expect(mockApi.patch).toHaveBeenCalledWith(
      "/api/policies/7/toggle",
      undefined,
      true,
    );
    expect(result).toEqual(toggled);
  });

  it("deletePolicy calls DELETE /api/policies/:id with auth", async () => {
    mockApi.delete.mockResolvedValueOnce({ message: "Deleted" });

    const result = await policyService.deletePolicy(2);

    expect(mockApi.delete).toHaveBeenCalledWith(
      "/api/policies/2",
      true,
    );
    expect(result).toEqual({ message: "Deleted" });
  });
});
