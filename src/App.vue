<template>
  <div id="app">
    <div class="app">
      <h1>SimulationVuer</h1>
      <el-radio-group v-model="id" size="small">
        <el-radio-button :class="className(dataset.id)" v-for="dataset in datasets" v-bind:key="dataset.id" :label="(typeof dataset.id === 'number') ? dataset.id : 'ISAN'" :value="dataset.id" />
      </el-radio-group>
    </div>
    <hr />
    <div v-for="dataset in datasets" v-bind:key="dataset.id">
      <div v-if="initialised(dataset.id)" v-show="dataset.id == id">
        <span v-if="typeof dataset.id === 'number'">
          <strong>Dataset <a :href="datasetUrl(dataset.id)" target="_blank">{{ dataset.id }}</a>:</strong> {{ dataset.description }}
        </span>
        <span v-if="typeof dataset.id !== 'number'">
          <strong>ISAN:</strong> {{ dataset.description }} {{ typeof dataset.id }}
        </span>
        <hr />
        <SimulationVuer :apiLocation="apiLocation" :id="dataset.id" :preferredSolver="preferredSolver" />
      </div>
    </div>
    <hr />
  </div>
</template>

<script>
import SimulationVuer from "./components/SimulationVuer.vue";
import { ElRadioButton, ElRadioGroup } from "element-plus";

export default {
  name: "App",
  components: {
    SimulationVuer,
    ElRadioButton,
    ElRadioGroup,
  },
  data: function () {
    return {
      apiLocation: import.meta.env.VITE_API_LOCATION,
      datasets: [
        { id: 0, description: "Non-simulation dataset", },
        { id: 135, description: "Computational analysis of the human sinus node action potential - Model development and effects of mutations", },
        { id: 157, description: "Fabbri-based composite SAN model", },
        { id: 308, description: "Kember Cardiac Nerve Model", },
        { id: 318, description: "Multi-scale rabbit cardiac electrophysiology models", },
        { id: 320, description: "Multi-scale human cardiac electrophysiology models", },
        { id: "workspace/b7c/rawfile/c7afa067a84b83044276d3416f81dbc7130ba66c/isan.omex", description: "Example of a COMBINE archive with a simulation UI file", },
      ],
      id: 0,
      ready: [],
      preferredSolver: SimulationVuer.LIBOPENCOR_SOLVER,
    };
  },
  methods: {
    className(id) {
      return (id == this.datasets[0].id) ? "first-dataset" : "";
    },
    datasetUrl(id) {
      return `https://sparc.science/datasets/${id}?type=dataset`;
    },
    initialised(id) {
      if (this.ready.includes(id)) {
        return true;
      }

      if (this.id == id) {
        this.ready.push(id);
      }

      return this.ready.includes(id);
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.el-radio-button__inner {
  background-color: #f9f2fc;
  border-color: #8300bf;
  box-shadow: -1px 0 0 0 #8300bf !important;
  color: #8300bf;
}

.first-dataset>.el-radio-button__inner {
  border-left: 1px solid #8300bf !important;
}

.el-radio-button__original-radio:checked+.el-radio-button__inner {
  background-color: #8300bf;
  border-color: #8300bf;
  color: white;
}

.el-radio-button__inner:hover {
  color: #8300bf;
}

a {
  color: #2c3e50;
}

div.app {
  text-align: center;
}
</style>
