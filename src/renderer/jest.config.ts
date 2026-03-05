import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>"],
  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}",
    "**/*.test.{ts,tsx}",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        jsx: "react-jsx",
      },
    ],
  },
  moduleNameMapper: {
    // Handle CSS / style imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Handle image imports
    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/__tests__/__mocks__/fileMock.ts",
    // Handle Next.js modules
    "^next/navigation$":
      "<rootDir>/__tests__/__mocks__/next-navigation.ts",
    "^next/image$": "<rootDir>/__tests__/__mocks__/next-image.tsx",
    "^next/link$": "<rootDir>/__tests__/__mocks__/next-link.tsx",
    // Handle @/ path alias
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "context/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
};

export default config;
