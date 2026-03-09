import { defineConfig } from "vitepress";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

const versionNumber = process.env.npm_package_version;

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SimulationVuer",
  description: "API documentation for SimulationVuer",
  base: "/simulationvuer/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      {
        text: "API Reference",
        link: "/components/SimulationVuer",
      },
    ],

    sidebar: [
      {
        text: "API Reference",
        link: "/components/SimulationVuer",
      },
      {
        text: "Live demo for a SPARC simulation-based dataset",
        link: "/demoSparcSimulationBasedDataset",
      },
      {
        text: "Live demo for a PMR path to an OMEX file",
        link: "/demoPmrPathToAnOmexFile",
      },
      {
        text: "Live demo for a direct URL to an OMEX file",
        link: "/demoDirectUrlToAnOmexFile",
      },
      {
        text: "Version",
        items: [
          {
            text: `${versionNumber}`,
          },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/ABI-Software/simulationvuer",
      },
    ],
  },
  markdown: { attrs: { disable: true } },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use '../src/assets/styles' as *;`,
        },
      },
    },
    plugins: [
      Components({
        // Allow auto load markdown components under `./src/components/`.
        extensions: ["vue"],
        // Allow auto import and register the components used in markdown.
        include: [/\.vue$/, /\.vue\?vue/],
        resolvers: [
          ElementPlusResolver({
            importStyle: "css",
          }),
        ],
      }),
    ],
  },
});
