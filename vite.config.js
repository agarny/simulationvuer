import vue from "@vitejs/plugin-vue";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pathSrc = path.resolve(__dirname, "./src");

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
        external: ["vue", "@abi-software/svg-sprite", "@abi-software/plotvuer"],
        output: {
          globals: {
            vue: "Vue",
            "@abi-software/svg-sprite": "@abi-software/svg-sprite",
            "@abi-software/plotvuer": "@abi-software/plotvuer",
          },
        },
      },
    },
    resolve: {
      alias: {
        "~/": `${pathSrc}/`,
        vue: "vue/dist/vue.esm-bundler.js",
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

  if (mode === "app") {
    config.base = "./";

    for (const key of ["build", "define", "resolve", "server"]) {
      delete config[key];
    }
  }

  return config;
});
