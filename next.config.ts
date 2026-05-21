import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Disabled because Strict Mode double-mounts components in dev, which means
  // every HMR cycle creates (then disposes) two MapLibre WebGL contexts.
  // Browsers cap WebGL contexts at ~16; on macOS, exceeding that can wedge
  // the GPU driver hard enough to require a system reboot.
  reactStrictMode: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
