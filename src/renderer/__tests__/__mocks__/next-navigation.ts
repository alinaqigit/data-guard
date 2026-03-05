// Mock next/navigation
const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}));

const usePathname = jest.fn(() => "/");
const useSearchParams = jest.fn(() => new URLSearchParams());

module.exports = {
  useRouter,
  usePathname,
  useSearchParams,
  redirect: jest.fn(),
  notFound: jest.fn(),
};
