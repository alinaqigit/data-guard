import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";
import { createMockSecurityContext } from "../test-utils";

// Track the latest mock context values
let mockContextValues = createMockSecurityContext();

jest.mock("@/context/SecurityContext", () => ({
  useSecurity: () => mockContextValues,
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValues = createMockSecurityContext({
      isAuthenticated: false,
    });
  });

  it("renders login form with username and password fields", () => {
    render(<LoginPage />);

    expect(
      screen.getByPlaceholderText("Enter username"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("••••••••"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders DataGaurd branding", () => {
    render(<LoginPage />);
    expect(screen.getByText("DataGaurd")).toBeInTheDocument();
  });

  it("has a remember me checkbox", () => {
    render(<LoginPage />);
    expect(screen.getByText("Remember me")).toBeInTheDocument();
  });

  it("redirects to home if already authenticated", () => {
    mockContextValues = createMockSecurityContext({
      isAuthenticated: true,
    });
    render(<LoginPage />);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("calls login on form submit", async () => {
    const user = userEvent.setup();
    const loginMock = jest.fn().mockResolvedValue(undefined);
    mockContextValues = createMockSecurityContext({
      isAuthenticated: false,
      login: loginMock,
    });

    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText("Enter username"),
      "testuser",
    );
    await user.type(
      screen.getByPlaceholderText("••••••••"),
      "password123",
    );
    await user.click(
      screen.getByRole("button", { name: /login to datagaurd/i }),
    );

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        "testuser",
        "password123",
        false,
      );
    });
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    const loginMock = jest
      .fn()
      .mockRejectedValue(new Error("Invalid credentials"));
    mockContextValues = createMockSecurityContext({
      isAuthenticated: false,
      login: loginMock,
    });

    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText("Enter username"),
      "baduser",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await user.click(
      screen.getByRole("button", { name: /login to datagaurd/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Invalid credentials"),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state during login", async () => {
    const user = userEvent.setup();
    // Create a login that never resolves during the test
    let resolveLogin: () => void;
    const loginMock = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );
    mockContextValues = createMockSecurityContext({
      isAuthenticated: false,
      login: loginMock,
    });

    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText("Enter username"),
      "user",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "pass");
    await user.click(
      screen.getByRole("button", { name: /login to datagaurd/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Logging in...")).toBeInTheDocument();
    });

    // Cleanup
    await act(async () => resolveLogin!());
  });

  it("has link to signup page", () => {
    render(<LoginPage />);
    const signupLink = screen.getByText("Create Account");
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.closest("a")).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("toggles remember me checkbox", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});

// Need act import
import { act } from "@testing-library/react";
