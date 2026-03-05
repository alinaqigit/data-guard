import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TitleBar from "@/components/TitleBar";

describe("TitleBar", () => {
  describe("when not in Electron environment", () => {
    beforeEach(() => {
      delete (window as any).electronWindow;
    });

    it("renders nothing when not in Electron", () => {
      const { container } = render(<TitleBar />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("when in Electron environment", () => {
    const mockElectronWindow = {
      minimize: jest.fn(),
      maximize: jest.fn(),
      close: jest.fn(),
      isMaximized: jest.fn().mockResolvedValue(false),
    };

    beforeEach(() => {
      (window as any).electronWindow = mockElectronWindow;
      jest.clearAllMocks();
    });

    afterEach(() => {
      delete (window as any).electronWindow;
    });

    it("renders title bar with DataGuard text", () => {
      render(<TitleBar />);
      expect(screen.getByText("DataGuard")).toBeInTheDocument();
    });

    it("renders minimize, maximize, and close buttons", () => {
      render(<TitleBar />);
      expect(screen.getByLabelText("Minimize")).toBeInTheDocument();
      expect(screen.getByLabelText("Maximize")).toBeInTheDocument();
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });

    it("calls minimize on minimize button click", async () => {
      const user = userEvent.setup();
      render(<TitleBar />);

      await user.click(screen.getByLabelText("Minimize"));
      expect(mockElectronWindow.minimize).toHaveBeenCalledTimes(1);
    });

    it("calls maximize on maximize button click", async () => {
      const user = userEvent.setup();
      render(<TitleBar />);

      await user.click(screen.getByLabelText("Maximize"));
      expect(mockElectronWindow.maximize).toHaveBeenCalledTimes(1);
    });

    it("calls close on close button click", async () => {
      const user = userEvent.setup();
      render(<TitleBar />);

      await user.click(screen.getByLabelText("Close"));
      expect(mockElectronWindow.close).toHaveBeenCalledTimes(1);
    });

    it("checks initial maximized state", () => {
      render(<TitleBar />);
      expect(mockElectronWindow.isMaximized).toHaveBeenCalled();
    });

    it("shows Restore label when maximized", async () => {
      mockElectronWindow.isMaximized.mockResolvedValue(true);

      render(<TitleBar />);

      // Wait for the async isMaximized check
      await screen.findByLabelText("Restore");
      expect(screen.getByLabelText("Restore")).toBeInTheDocument();
    });
  });
});
