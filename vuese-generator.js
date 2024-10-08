/**
 * Vuese Generator
 *
 * To generate markdown files from Vue components
 * To watch components changes for Vitepress on Dev Mode
 */

import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
// import { parser } from '@vuese/parser'
import { parseSource } from 'vue-docgen-api'
import { Render } from '@vuese/markdown-render'

const watchMode = process.argv.find((argv) => argv === 'watch')

const componentsDir = 'src/components'
const components = ['SimulationVuer.vue']
const outputDir = 'docs/components'

function generateMarkdown(file) {
  const fileWithPath = `${componentsDir}/${file}`
  const fileContent = fs.readFileSync(fileWithPath, 'utf-8')

  try {
    // const parserResult = parser(fileContent)
    const parserResult = parseSource(fileContent, fileWithPath)
    parserResult.then((result) => {
      const {
        displayName: name,
        description: desc,
        props,
        events,
        methods
      } = result

      // transform props to vuese styles
      const parseResult = {
        name: name,
        componentDesc: {
          default: [desc]
        },
        props: transformData(props),
        events: transformData(events),
        methods: transformData(methods),
      }
      parseResult.name = 'SimulationVuer' // Because there has another name prop in component
      const r = new Render(parseResult)
      const renderResult = r.render()
      const markdownResult = r.renderMarkdown()
      const markdownContent = markdownResult.content
      const componentName = path.basename(fileWithPath, '.vue')

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir)
      }

      fs.writeFile(`${outputDir}/${componentName}.md`, markdownContent, (err) => {
        if (err) {
          console.error(`Error writing markdown file for ${componentName}`, err)
        } else {
          console.log(`Markdown file for ${componentName} is generated!`)
        }
      })
    })
  } catch(e) {
    console.error(e)
  }
}

function transformData(data = []) {
  data.forEach((prop) => {
    prop.name = prop.name

    if (prop.description) {
      prop.describe = [prop.description.replaceAll('\n', ' ')]
    }

    if (prop.type) {
      prop.type = prop.type.name
    }

    if (prop.defaultValue) {
      prop.default = prop.defaultValue.value.replaceAll('\n', ' ')
    }

    // events
    if (prop.properties) {
      prop.argumentsDesc = []
      prop.properties.forEach((param) => {
        const argName = param.name || param.description
        prop.argumentsDesc.push(argName)
      })
    }

    // methods
    if (prop.params) {
      prop.argumentsDesc = []
      prop.params.forEach((param) => {
        const argName = param.description || param.name
        prop.argumentsDesc.push(argName)
      })
    }
  })
  if (!data.length) {
    return null
  }
  return data
}

// To generate markdown files - one time
components.forEach((component) => {
  console.log(`Write markdown file for ${component} on first load.`)
  generateMarkdown(component)
})

// To watch component changes and generate markdown files
if (watchMode) {
  const watcher = chokidar.watch(components, {
    cwd: componentsDir,
    ignoreInitial: true,
  })

  watcher.on('change', (file) => {
    console.log(`The component ${file} has changed!`)
    generateMarkdown(file)
  })
}
