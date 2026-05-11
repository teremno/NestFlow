import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const ORCA_WHIRLPOOLS_WASM = "orca_whirlpools_core_js_bindings_bg.wasm";

interface ServerAssetCompilation {
  hooks: {
    processAssets: {
      tap: (options: { name: string; stage: number }, callback: () => void) => void;
    };
  };
  emitAsset: (filename: string, source: unknown) => void;
}

interface ServerAssetCompiler {
  hooks: {
    thisCompilation: {
      tap: (
        name: string,
        callback: (compilation: ServerAssetCompilation) => void,
      ) => void;
    };
  };
}

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.plugins.push({
        apply(compiler: ServerAssetCompiler) {
          compiler.hooks.thisCompilation.tap(
            "CopyOrcaWhirlpoolsWasmForKaminoRoute",
            (compilation) => {
              compilation.hooks.processAssets.tap(
                {
                  name: "CopyOrcaWhirlpoolsWasmForKaminoRoute",
                  stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                },
                () => {
                  const wasmPath = path.join(
                    process.cwd(),
                    "node_modules",
                    "@orca-so",
                    "whirlpools-core",
                    "dist",
                    "nodejs",
                    ORCA_WHIRLPOOLS_WASM,
                  );

                  compilation.emitAsset(
                    `app/api/kamino/deposit/${ORCA_WHIRLPOOLS_WASM}`,
                    new webpack.sources.RawSource(fs.readFileSync(wasmPath)),
                  );
                },
              );
            },
          );
        },
      });
    }

    return config;
  },
};

export default nextConfig;
