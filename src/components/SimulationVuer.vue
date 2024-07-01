<template>
  <div class="simulation-vuer" v-loading="showUserMessage" :element-loading-text="userMessage">
    <p v-if="!hasValidSimulationUiInfo && !showUserMessage" class="default error"><span class="error">Error:</span> an unknown or invalid model was provided.</p>
    <div class="main" v-if="hasValidSimulationUiInfo">
      <div class="main-left">
        <p class="default name">{{name}}</p>
        <el-divider></el-divider>
        <p class="default input-parameters">Input parameters</p>
        <div class="input scrollbar">
          <SimulationVuerInput v-for="(input, index) in simulationUiInfo.input"
            ref="simInput"
            :defaultValue="input.defaultValue"
            :key="`input-${index}`"
            :name="input.name"
            :maximumValue="input.maximumValue"
            :minimumValue="input.minimumValue"
            :possibleValues="input.possibleValues"
            :stepValue="input.stepValue"
          />
        </div>
        <div class="primary-button">
          <el-button type="primary" size="small" @click="startSimulation()" v-if="!this.libopencor">Run Simulation</el-button>
        </div>
        <div class="secondary-button" v-if="uuid">
          <el-button size="small" @click="runOnOsparc()">Run on oSPARC</el-button>
        </div>
        <div class="secondary-button">
          <el-button size="small" @click="viewDataset()">View Dataset</el-button>
        </div>
        <p class="default note" v-if="uuid">Additional parameters are available on oSPARC</p>
      </div>
      <div class="main-right" ref="output" v-show="isSimulationValid">
        <PlotVuer v-for="(outputPlot, index) in simulationUiInfo.output.plots"
          :key="`output-${index}`"
          :metadata="plotMetadata(index)"
          :data-source="{data: simulationResults[index]}"
          :plotLayout="layout[index]"
          :plotType="'plotly-only'"
          :selectorUi="false"
        />
      </div>
      <div class="main-right" v-show="!isSimulationValid">
        <p class="default error"><span class="error">Error:</span> <span v-html="errorMessage"></span>.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { PlotVuer } from "@abi-software/plotvuer";
import "@abi-software/plotvuer/dist/style.css";
import SimulationVuerInput from "./SimulationVuerInput.vue";
import { ElButton, ElDivider, ElLoading } from "element-plus";
import { evaluateValue, evaluateSimulationValue, OPENCOR_SOLVER_NAME, PMR_URL } from "./common.js";
import { validJson } from "./json.js";
import { initialiseUi, finaliseUi } from "./ui.js";
import libOpenCOR from "./libopencor.js";

const LIBOPENCOR_SOLVER = "libOpenCOR";
const OSPARC_SOLVER = "oSPARC";

/**
 * SimulationVuer
 */
export default {
  LIBOPENCOR_SOLVER: LIBOPENCOR_SOLVER,
  OSPARC_SOLVER: OSPARC_SOLVER,
  name: "SimulationVuer",
  components: {
    PlotVuer,
    SimulationVuerInput,
    ElButton,
    ElDivider,
    ElLoading,
  },
  props: {
    /**
     * The the URL to the API location.
     */
    apiLocation: {
      required: true,
      type: String,
    },
    /**
     * The ID of the simulation-based dataset.
     */
    id: {
      required: true,
      type: Number,
    },
    /**
     * The preferred solver to use for OpenCOR-based simulations. This property
     * is optional and defaults to "oSPARC". The only value that is currently
     * supported is "libOpenCOR". Any other value will default to "oSPARC".
     */
     preferredSolver: {
      type: String,
      default: OSPARC_SOLVER,
    },
  },
  data: function() {
    // Retrieve some information about the dataset.

    if (this.id > 0) {
      const xmlhttp = new XMLHttpRequest();

      xmlhttp.open("GET", this.apiLocation + "/sim/dataset/" + this.id);
      xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState === 4) {
          if (xmlhttp.status === 200) {
            let datasetInfo = JSON.parse(xmlhttp.responseText);

            this.name = datasetInfo.name;
            this.uuid = (datasetInfo.study !== undefined)?datasetInfo.study.uuid:undefined;
          }
        }
      };
      xmlhttp.send();
    }

    return {
      errorMessage: "",
      hasFinalisedUi: false,
      hasValidSimulationUiInfo: false,
      isMounted: false,
      isSimulationValid: true,
      layout: [],
      libopencor: null,
      name: null,
      opencorBasedSimulation: true,
      perfectScollbarOptions: {
        suppressScrollX: true,
      },
      showUserMessage: false,
      simulationResults: [],
      simulationResultsId: {},
      simulationUiInfo: {},
      solver: undefined,
      userMessage: "",
      ui: null,
      uuid: null,
    };
  },
  methods: {
    /**
     * @vuese
     * Generate the metadata associated with the plot which `index` is given.
     * @arg `index`
     */
    plotMetadata(index) {
      return {
        version: "1.1.0",
        type: "plot",
        attrs: {
          style: "timeseries",
          layout: this.layout[index],
        },
      };
    },
    /**
     * @vuese
     * Download the PMR file associated with the given `url`.
     * @arg `url`
     */
    downloadPmrFile(url) {
      return new Promise((resolve, reject) => {
        const xmlhttp = new XMLHttpRequest();

        xmlhttp.open("POST", this.apiLocation + "/pmr_file");
        xmlhttp.setRequestHeader("Content-type", "application/json");
        xmlhttp.onreadystatechange = () => {
          if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
              resolve(Uint8Array.from(atob(xmlhttp.response), (c) => c.charCodeAt(0)));
            }
            reject();
          }
        };
        xmlhttp.send(JSON.stringify({path: url.replace(PMR_URL, "")}));
      });
    },
    /**
     * @vuese
     * Manage the file associated with the given `url` and `fileContents`.
     * @arg `url`
     * @arg `fileContents`
     */
    manageFile(url, fileContents) {
      const fileManager = this.libopencor.FileManager.instance();
      let file = fileManager.file(url);

      if (!file) {
        file = new this.libopencor.File(url);
      }

      const fileContentsPtr = this.libopencor._malloc(fileContents.length);
      const mem = new Uint8Array(this.libopencor.HEAPU8.buffer, fileContentsPtr, fileContents.length);

      mem.set(fileContents);

      file.setContents(fileContentsPtr, fileContents.length);

      this.libopencor._free(fileContentsPtr);

      return file;
    },
    /**
     * @vuese
     * Run the simulation using libOpenCOR.
     */
    runSimulation() {
      const fileManager = this.libopencor.FileManager.instance();
      const opencorData = this.opencorData();
      const modelUrl = opencorData.model_url;
      const document = new this.libopencor.SedDocument(fileManager.file(modelUrl));
      const instance = document.instantiate();

      instance.run();

      const instanceTask = instance.tasks().get(0);

      console.log(opencorData);
      console.log(`>>> VOI: ${instanceTask.voiName()} [${instanceTask.voiUnit()}]`);

      document.delete();
    },
    /**
     * @vuese
     * Build the simulation UI using `simulationUiInfo`, a JSON object that describes the contents of the simulation UI.
     * @arg `simulationUiInfo`
     */
    buildSimulationUi(simulationUiInfo) {
      // Keep track of the simulation UI information.

      this.simulationUiInfo = simulationUiInfo;

      // Make sure that the simulation UI information is valid.

      this.hasValidSimulationUiInfo = validJson(this.simulationUiInfo);

      if (!this.hasValidSimulationUiInfo) {
        return;
      }

      // Retrieve and keep track of the solver to be used for the simulation.

      this.simulationUiInfo.simulation.solvers.forEach((solver) => {
        if ((solver.if === undefined) || evaluateValue(this, solver.if)) {
          this.solver = solver;
        }
      });

      if (this.solver === undefined) {
        console.warn("SIMULATION: no solver name and/or solver version specified.");

        return;
      }

      this.opencorBasedSimulation = this.solver.name === OPENCOR_SOLVER_NAME;

      // Load libOpenCOR, if needed, before doing anything else.

      if (this.opencorBasedSimulation && (this.preferredSolver === LIBOPENCOR_SOLVER)) {
        this.userMessage = "Retrieving the model...";
        this.showUserMessage = true;
        // Note: we use this.$nextTick() so that the user message is shown
        //       before we download the model file.

        this.$nextTick(() => {
          libOpenCOR().then((libopencor) => {
            // Keep track of the libOpenCOR module.

            this.libopencor = libopencor;

            // Retrieve the model file, if needed.

            const modelUrl = this.opencorData().model_url;

            this.downloadPmrFile(modelUrl).then((fileContents) => {
              const file = this.manageFile(modelUrl, fileContents);

              // In the case of a SED-ML file, we also need to retrieve its
              // corresponding CellML file.

              if (file.type().value === this.libopencor.File.Type.SEDML_FILE.value) {
                const document = new this.libopencor.SedDocument(file);
                const cellmlUrl = document.models().get(0).file().url();

                this.downloadPmrFile(cellmlUrl).then((cellmlFileContents) => {
                  this.manageFile(cellmlUrl, cellmlFileContents);

                  this.showUserMessage = false;

                  this.$nextTick(() => {
                    this.runSimulation();
                  });
                });

                document.delete();
              } else {
                this.showUserMessage = false;

                this.$nextTick(() => {
                  this.runSimulation();
                });
              }
            });
          });
        });
      }

      // Initialise our UI.

      initialiseUi(this);

      // Finalise our UI.
      // Note: we try both here and in the mounted() function since we have no
      //       idea how long it's going to take to retrieve the simulation UI
      //       information.

      this.$nextTick(() => {
        finaliseUi(this);

        this.simulationResults.forEach((data, index) => {
          this.simulationResults[index] = [{
            x: [],
            y: [],
            type: "scatter",
          }];
        });
      });
    },
    /**
     * @vuese
     * Run the simulation-based dataset directly on oSPARC. Not all simulation-based datasets can be run directly on
     * oSPARC, but for those that can the simulation UI shows a `Run on oSPARC` button which, when clicked, calls this
     * method.
     */
    runOnOsparc() {
      window.open(`https://osparc.io/study/${this.uuid}`, "_blank");
    },
    /**
     * @vuese
     * View the simulation-based dataset on the SPARC portal. The simulation UI has a `View Dataset` button which, when
     * clicked, calls this method.
     */
    viewDataset() {
      window.open(`https://sparc.science/datasets/${this.id}?type=dataset`, "_blank");
    },
    /**
     * @vuese
     * Data needed to set a model's parameters.
     */
    parametersData() {
      let res = undefined;

      if (this.simulationUiInfo.parameters !== undefined) {
        res = {};

        this.simulationUiInfo.parameters.forEach((parameter) => {
          res[parameter.name] = evaluateValue(this, parameter.value);
        });
      }

      return res;
    },
    /**
     * @vuese
     * Data needed to specify the model output.
     */
    outputData() {
      let res = undefined;

      if (this.simulationUiInfo.output.data !== undefined)  {
        let index = -1;

        res = [];

        this.simulationUiInfo.output.data.forEach((outputData) => {
          res[++index] = outputData.name;
        });
      }

      return res;
    },
    /**
     * @vuese
     * Data needed to run an OpenCOR-based simulation.
     */
    opencorData() {
      let res = {
        model_url: this.simulationUiInfo.simulation.opencor.resource,
        json_config: {},
      };

      if (   (this.simulationUiInfo.simulation.opencor.endingPoint !== undefined)
          && (this.simulationUiInfo.simulation.opencor.pointInterval !== undefined)) {
        res.json_config.simulation = {
          "Ending point": this.simulationUiInfo.simulation.opencor.endingPoint,
          "Point interval": this.simulationUiInfo.simulation.opencor.pointInterval,
        };
      }

      let parameters = this.parametersData();

      if (parameters !== undefined) {
        res.json_config.parameters = parameters;
      }

      let output = this.outputData();

      if (output !== undefined) {
        res.json_config.output = output;
      }

      return res;
    },
    /**
     * @vuese
     * Data needed to run an oSPARC-based simulation.
     */
    osparcData() {
      let res = {};
      let parameters = this.parametersData();

      if (parameters !== undefined) {
        res.job_inputs = parameters;
      }

      return res;
    },
    /**
     * @vuese
     * Create the `request` that is going to be used by `startSimulation` to ask oSPARC to start the simulation.
     */
    retrieveRequest() {
      let request = {
        solver: this.solver
      };

      if (this.opencorBasedSimulation) {
        request.opencor = this.opencorData();
      } else {
        request.osparc = this.osparcData();
      }

      return request;
    },
    /**
     * @vuese
     * Process the simulation results retrieved by `checkSimulation`. The simulation results are post-processed, if
     * needed, and then readied for use by `PlotVuer`.
     * @arg `results`
     */
    processSimulationResults(results) {
      // Convert, if needed, the results to a JSON format that is compatible
      // with our OpenCOR results.

      if (typeof(results) === "string") {
        const SPACES = /[ \t]+/g;

        let lines = results.trim().split("\n");
        let iMax = lines[0].trim().split(SPACES).length;

        results = {};

        for (let i = 0; i < iMax; ++i) {
          results[i] = [];
        }

        let i = -1;

        lines.forEach((line) => {
          ++i;

          let j = -1;
          let values = line.trim().split(SPACES);

          values.forEach((value) => {
            results[++j][i] = Number(value);
          });
        });
      }

      // Get the results ready for plotting.

      let index = -1;
      let iMax = results[this.simulationResultsId[Object.keys(this.simulationResultsId)[0]]].length;

      this.simulationUiInfo.output.plots.forEach((outputPlot) => {
        let xValue = [];
        let yValue = [];

        for (let i = 0; i < iMax; ++i) {
          xValue[i] = evaluateSimulationValue(this, results, outputPlot.xValue, i);
          yValue[i] = evaluateSimulationValue(this, results, outputPlot.yValue, i);
        }

        this.simulationResults[++index] = [
          {
            x: xValue,
            y: yValue,
            type: "scatter",
          },
        ];
      });
    },
    /**
     * @vuese
     * Check the progress of the simulation using the given `data`, a JSON object that contains the simulation job ID,
     * as well as the solver name and version. This method is first called by `startSimulation` and then every second by
     * itself until the simulation is finished.
     * @arg `data`
     */
    checkSimulation(data) {
      // Check the simulation.

      const xmlhttp = new XMLHttpRequest();

      xmlhttp.open("POST", this.apiLocation + "/check_simulation");
      xmlhttp.setRequestHeader("Content-type", "application/json");
      xmlhttp.onreadystatechange = () => {
        if (xmlhttp.readyState === 4) {
          if (xmlhttp.status === 200) {
            let response = JSON.parse(xmlhttp.responseText);

            this.isSimulationValid = response.status === "ok";

            if (this.isSimulationValid) {
              if (response.results !== undefined) {
                // The simulation is finished, so process its results.

                this.showUserMessage = false;

                this.processSimulationResults(response.results);
              } else {
                // The simulation is not yet finished, so check again in a
                // second.

                let that = this;

                setTimeout(function() {
                  that.checkSimulation(data);
                }, 1000);
              }
            } else {
              this.showUserMessage = false;
              this.errorMessage = response.description;
            }
          } else {
            this.isSimulationValid = false;
            this.showUserMessage = false;
            this.errorMessage = xmlhttp.statusText.toLowerCase() + " (<a href='https://httpstatuses.com/" + xmlhttp.status + "/' target='_blank'>" + xmlhttp.status + "</a>)";
          }
        }
      };
      xmlhttp.send(JSON.stringify(data));
    },
    /**
     * @vuese
     * Start the simulation associated with the simulation-based dataset. The simulation UI has a `Run Simulation`
     * button which, when clicked, calls this method.
     */
    startSimulation() {
      // Start the simulation (after resetting our previous simulation data, in
      // case there were sonme).
      // Note: we use this.$nextTick() so that the user message is shown before
      //       we get to post our HTTP request.

      this.userMessage = "Loading simulation results...";
      this.showUserMessage = true;

      this.$nextTick(() => {
        this.simulationResults = [];

        const xmlhttp = new XMLHttpRequest();

        xmlhttp.open("POST", this.apiLocation + "/start_simulation");
        xmlhttp.setRequestHeader("Content-type", "application/json");
        xmlhttp.onreadystatechange = () => {
          if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
              let response = JSON.parse(xmlhttp.responseText);

              this.isSimulationValid = response.status === "ok";

              if (this.isSimulationValid) {
                this.checkSimulation(response.data);
              } else {
                this.showUserMessage = false;
                this.errorMessage = response.description;
              }
            } else {
              this.isSimulationValid = false;
              this.showUserMessage = false;
              this.errorMessage = xmlhttp.statusText.toLowerCase() + " (<a href='https://httpstatuses.com/" + xmlhttp.status + "/' target='_blank'>" + xmlhttp.status + "</a>)";
            }
          }
        };
        xmlhttp.send(JSON.stringify(this.retrieveRequest()));
      });
    },
  },
  created: function() {
    // Try to retrieve the UI information.

    if (this.id > 0) {
      this.userMessage = "Retrieving UI information...";
      this.showUserMessage = true;

      // Retrieve and build the simulation UI.
      // Note: we use this.$nextTick() so that the user message is shown before
      //       we get to post our HTTP request.

      this.$nextTick(() => {
        const xmlhttp = new XMLHttpRequest();

        xmlhttp.open("GET", this.apiLocation + "/simulation_ui_file/" + this.id);
        xmlhttp.onreadystatechange = () => {
          if (xmlhttp.readyState === 4) {
            this.showUserMessage = false;

            this.$nextTick(() => {
              if (xmlhttp.status === 200) {
                this.buildSimulationUi(JSON.parse(xmlhttp.responseText));
              }
            });
          }
        };
        xmlhttp.send();
      });
    }
  },
  mounted: function() {
    // Finalise our UI.
    // Note: we try both here and in the created() function since we have no
    //       idea how long it's going to take to retrieve the simulation UI
    //       information.

    this.isMounted = true;

    finaliseUi(this);
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

.simulation-vuer {
  --el-color-primary: #8300BF;
  --el-color-primary-light-7: #DAB3EC;
  --el-color-primary-light-8: #E6CCF2;
  --el-color-primary-light-9: #F3E6F9;
}

:deep( .el-button:hover) {
  box-shadow: -3px 2px 4px #00000040;
}
:deep( .el-divider) {
  margin: -8px 0 8px 0 !important;
  width: 210px;
}
:deep( .el-loading-spinner) {
  .path {
    stroke: #8300BF;
  }
  i, .el-loading-text {
    color: #8300BF;
  }
}
div.input {
  border: 1px solid #dcdfe6;
  padding: 4px;
  height: 300px;
}
div.main {
  display: grid;
  --mainLeftWidth: 243px;
  grid-template-columns: var(--mainLeftWidth) calc(100% - var(--mainLeftWidth));
  height: 100%;
}
div.main-left {
  border-right: 1px solid #dcdfe6;
  padding: 12px 20px 12px 12px;
  height: 100%;
  overflow: auto;
}
div.main-right.x1 {
  height: 100%;
}
div.main-right.x2 {
  height: 50%;
}
div.main-right.x3 {
  height: 33.333%;
}
div.main-right.x4 {
  height: 25%;
}
div.main-right.x5 {
  height: 20%;
}
div.main-right.x6 {
  height: 16.667%;
}
div.main-right.x7 {
  height: 14.286%;
}
div.main-right.x8 {
  height: 12.5%;
}
div.main-right.x9 {
  height: 11.111%;
}
:deep( div.main-right div.controls) {
  height: 0;
}
div.primary-button,
div.secondary-button {
  display: flex;
  justify-content: flex-end;
  width: 210px;
}
div.primary-button {
  margin-top: 14px;
}
div.secondary-button {
  margin-top: 8px;
}
div.primary-button .el-button,
div.secondary-button .el-button,
div.primary-button .el-button:hover,
div.secondary-button .el-button:hover {
  width: 121px;
  border-color: #8300bf;
}
div.primary-button .el-button,
div.primary-button .el-button:hover {
  background-color: #8300bf;
}
div.secondary-button .el-button,
div.secondary-button .el-button:hover {
  background-color: #f9f2fc;
  color: #8300bf;
}
div.scrollbar {
  overflow-y: scroll;
  scrollbar-width: thin;
}
div.scrollbar::-webkit-scrollbar {
  width: 8px;
  right: -8px;
  background-color: #f5f5f5;
}
div.scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  background-color: #979797;
}
div.scrollbar::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}
div.simulation-vuer {
  height: 100%;
}
p.default {
  font-family: Asap, sans-serif;
  letter-spacing: 0;
  margin: 16px 0;
  text-align: start;
}
p.error {
  margin-left: 16px;
}
p.input-parameters {
  margin-bottom: 8px;
}
p.name,
p.input-parameters {
  margin-top: 0;
  font-weight: 500 /* Medium */;
}
p.name {
  line-height: 20px;
}
p.note {
  font-size: 12px;
  line-height: 16px;
}
span.error {
  font-weight: 500 /* Medium */;
}
</style>
