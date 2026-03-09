import OpenCOR from "@opencor/opencor";
import "@opencor/opencor/style.css";

import { createApp } from "vue";

createApp({
  data() {
    return {
      omex: null,
    };
  },
  template: `
    <OpenCOR
      v-if="omex !== null"
      ref="opencor"
      :omex="omex"
      theme="light"
      @simulationData="onSimulationData"
    />
  `,
  components: {
    OpenCOR,
  },
  methods: {
    handleMessage(event) {
      if (!event.data || typeof event.data.type !== "string") {
        return;
      }

      switch (event.data.type) {
        case "init":
          // Message to initialise OpenCOR with the OMEX value.

          this.omex = event.data.omex;

          break;
        case "trackSimulationData":
          // Message to track some simulation data for the specified model parameters.

          this.$refs.opencor?.trackSimulationData(event.data.modelParameters);

          break;
        case "untrackSimulationData":
          // Message to stop tracking simulation data for the specified model parameters.

          this.$refs.opencor?.untrackSimulationData(event.data.modelParameters);

          break;
      }
    },
    onSimulationData(event) {
      // Send the simulation data to the parent window.

      window.parent.postMessage(
        {
          type: "simulationData",
          simulationData: event.simulationData,
        },
        "*",
      );
    },
  },
  mounted() {
    window.addEventListener("message", this.handleMessage);
  },
  beforeUnmount() {
    window.removeEventListener("message", this.handleMessage);
  },
}).mount("#app");
