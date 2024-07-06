<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
import { lightningChart } from "@arction/lcjs";

export default {
  name: "Chart",
  props: {
    xData: {
      required: true,
      // type: Array,
    },
    yData: {
      required: true,
      // type: Array,
    },
    xAxisTitle: {
      required: true,
      type: String,
    },
    yAxisTitle: {
      required: true,
      type: String,
    },
  },
  watch: {
    xData() {
      this.chart.dispose();
      this.createChart();
    },
    yData() {
      this.chart.dispose();
      this.createChart();
    },
  },
  data() {
    // Add the chart to the data in a way that Vue will not attach its observers to it. If the chart variable would be
    // added in the return object, Vue would attach the observers and every time LightningChart JS made a change to any
    // of its internal variables, Vue would try to observe the change and update. Observing would slow down the chart a
    // lot.

    this.chart = null;

    return {
      chartId: null,
    };
  },
  methods: {
    createChart() {
      this.lc = lightningChart();
      this.chart = this.lc
        .ChartXY({ container: `${this.chartId}` })
        .setTitle("")
        .setAnimationsEnabled(false);

      this.chart.getDefaultAxisX().setTitle(this.xAxisTitle);
      this.chart.getDefaultAxisY().setTitle(this.yAxisTitle);

      const lineSeries = this.chart.addLineSeries();

      lineSeries.addArraysXY((this.xData === undefined) ? [] : this.xData,
                             (this.yData === undefined) ? [] : this.yData);
    },
  },
  beforeMount() {
    // Generate a random ID to us as the container ID for the chart and the target div ID.

    this.chartId = Math.trunc(Math.random() * 1000000);
  },
  mounted() {
    // The chart can only be created when the component has mounted the DOM because the chart needs the element with
    // a specified container ID to exist in the DOM.

    this.createChart();
  },
  beforeUnmount() {
    // dispose() should be called when the component is unmounted to free all the resources used by the chart.

    this.lc.dispose();
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.fill {
  height: 100%;
}
</style>
