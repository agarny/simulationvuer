/**
 * Vuese Generator
 *
 * To generate markdown files from Vue components
 * To watch components changes for Vitepress on Dev Mode
 */

import { Render } from "@vuese/markdown-render";

import chokidar from "chokidar";
import fs from "node:fs";
import path from "node:path";
import { parseSource } from "vue-docgen-api";

const watchMode = process.argv.find((argv) => argv === "watch");

const componentsDir = "src/components";
const components = ["SimulationVuer.vue"];
const outputDir = "docs/components";

async function generateMarkdown(file) {
  const fileWithPath = `${componentsDir}/${file}`;
  const fileContent = fs.readFileSync(fileWithPath, "utf-8");

  try {
    const result = await parseSource(fileContent, fileWithPath);
    const {
      displayName: name,
      description: desc,
      props,
      events,
      methods,
    } = result;

    // transform props to vuese styles
    const parseResult = {
      name: name,
      componentDesc: {
        default: [desc],
      },
      props: transformData(props),
      events: transformData(events),
      methods: transformData(methods),
    };
    parseResult.name = "SimulationVuer"; // Because there has another name prop in component
    const r = new Render(parseResult);
    const markdownResult = r.renderMarkdown();
    const markdownContent = markdownResult.content;
    const componentName = path.basename(fileWithPath, ".vue");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    await fs.promises.writeFile(
      `${outputDir}/${componentName}.md`,
      markdownContent,
    );

    console.log(`Markdown file for ${componentName} is generated!`);
  } catch (e) {
    // log parse or write errors so the developer knows something went wrong
    console.error(`Failed to generate markdown for ${file}:`, e);
  }
}

function transformData(data = []) {
  function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  data.forEach((prop) => {
    if (prop.description) {
      prop.describe = [prop.description.replaceAll("\n", " ")];
    }

    if (prop.type) {
      // Handle multiple types separated by '|'
      // Convert to array to avoid markdown table issues
      if (prop.type.name.indexOf("|") !== -1) {
        prop.type = prop.type.name
          .split("|")
          .map((item) => capitalise(item.trim()));
      } else {
        prop.type = capitalise(prop.type.name);
      }
    }

    if (prop.defaultValue) {
      prop.default = prop.defaultValue.value.replaceAll("\n", " ");
    }

    // events
    if (prop.properties) {
      prop.argumentsDesc = [];
      prop.properties.forEach((param) => {
        const argName = param.name || param.description;
        prop.argumentsDesc.push(argName);
      });
    }

    // methods
    if (prop.params) {
      prop.argumentsDesc = [];
      prop.params.forEach((param) => {
        const argName = param.description || param.name;
        prop.argumentsDesc.push(argName);
      });
    }
  });
  if (!data.length) {
    return null;
  }
  return data;
}

// To generate markdown files - one time
components.forEach((component) => {
  console.log(`Write markdown file for ${component} on first load.`);
  generateMarkdown(component);
});

// To watch component changes and generate markdown files
if (watchMode) {
  const watcher = chokidar.watch(components, {
    cwd: componentsDir,
    ignoreInitial: true,
  });

  watcher.on("change", (file) => {
    console.log(`The component ${file} has changed!`);
    generateMarkdown(file);
  });
}
