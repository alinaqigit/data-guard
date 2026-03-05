// Mock next/image
import React from "react";

const MockImage = (props: any) => {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return React.createElement("img", {
    ...props,
    src: props.src || "",
    fill: undefined,
  });
};

MockImage.displayName = "MockImage";

export default MockImage;
