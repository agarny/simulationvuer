import path from "path";
import { resolve } from "node:path";
const pathSrc = path.resolve(__dirname, "./src");
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

export default defineConfig(({ command, mode }) => {
  const config = {
    plugins: [
      vue(),
      Components({
        // Allow auto load markdown components under `./src/components/`.
        extensions: ["vue", "md"],
        // Allow auto import and register components used in markdown.
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        resolvers: [
          ElementPlusResolver({
            importStyle: "sass",
          }),
        ],
        dts: "src/components.d.ts",
      }),
    ],
    build: {
      lib: {
        entry: path.resolve(__dirname, "./src/components/index.js"),
        name: "SimulationVuer",
        fileName: "simulationvuer",
      },
      rollupOptions: {
        external: ["vue"],
        output: {
          globals: {
            vue: "Vue",
          },
        },
      },
    },
    resolve: {
      alias: {
        "~/": `${pathSrc}/`,
      },
    },
  };

  if (command === "serve") {
    config.server = {
      port: 8081,
    };
    config.define = {
      "process.env.HTTP_PROXY": 8081,
      global: "globalThis",
    };
  }
  return config;
});
