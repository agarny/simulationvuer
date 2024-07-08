import { create, all } from "mathjs";

const math = create(all, {});

export const OPENCOR_SOLVER_NAME = "simcore/services/comp/opencor";

export function evaluateValue(parent, value) {
  let index = -1;
  const parser = new math.parser();

  parent.simulationUiInfo.input.forEach((input) => {
    ++index;

    parser.set(input.id, parent.$refs.simInput[index].vModel);
  });

  value = value.replace("===", "=="); //---GRY--- TO BE REMOVED ONCE DATASET 135 HAS BEEN FIXED.
  return parser.evaluate(value);
}

export function updateUi(parent) {
  // Show/hide and enable/disable all the elements.

  parent.$nextTick(() => {
    let index = -1;

    parent.simulationUiInfo.input.forEach((input) => {
      ++index;

      parent.$refs.simInput[index].visible = (input.visible === undefined) ? true : evaluateValue(parent, input.visible);
    });

    if (parent.libopencor !== undefined) {
      parent.userMessage = "Rerunning the model...";
      parent.showUserMessage = true;

      parent.$nextTick(() => {
        parent.runSimulation();
      });
    }
  });
}

export function finaliseUi(parent) {
  // Finalise our UI, but only if we haven't already done so, we are mounted,
  // and we have some valid simulation UI information.

  if (!parent.hasFinalisedUi && parent.isMounted && parent.hasValidSimulationUiInfo) {
    // Configure the PlotVuer's.

    parent.$refs.output.classList.add("x" + parent.simulationUiInfo.output.plots.length);

    // Initialise the simulation results.

    let index = -1;

    parent.simulationUiInfo.output.plots.forEach(() => {
      parent.simulationResults[++index] = [{
        x: [],
        y: [],
        type: "scatter",
      }];
    });

    // Make sure that our UI is up to date.

    updateUi(parent);

    parent.hasFinalisedUi = true;
  }
}
