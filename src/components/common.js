export const PMR_URL = "https://models.physiomeproject.org/";
export const OPENCOR_SOLVER_NAME = "simcore/services/comp/opencor";

function doEvaluateValue(value, from, to) {
  if (from !== undefined) {
    let re = new RegExp(`\\b${ from }\\b`, 'g');

    value = value.replace(re, to);
  }

  return value;
}

export function evaluateValue(parent, value) {
  let index = -1;

  parent.simulationUiInfo.input.forEach((input) => {
    ++index;

    value = doEvaluateValue(value, input.id, parent.$refs.simInput[index].vModel);
  });

  return Function("return " + value + ";")();
}

export function evaluateSimulationValue(parent, results, value, i) {
  parent.simulationUiInfo.output.data.forEach((data) => {
    value = doEvaluateValue(value, data.id, results[parent.simulationResultsId[data.id]][i]);
  });

  return Function("return " + value + ";")();
}
