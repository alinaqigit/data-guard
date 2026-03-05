// Mock next/link
import React from "react";

const MockLink = ({
  children,
  href,
  ...props
}: {
  children: React.ReactNode;
  href: string;
  [key: string]: any;
}) => {
  return React.createElement("a", { href, ...props }, children);
};

MockLink.displayName = "MockLink";

export default MockLink;
