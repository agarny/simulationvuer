import { Validator } from "jsonschema";
import { OPENCOR_SOLVER_NAME } from "./common.js";

export function validJson(json, simulationInfoNeeded) {
  // Check the JSON against our schema.

  let validator = new Validator();
  let schema = {
    additionalProperties: false,
    properties: {
      input: {
        items: {
          oneOf: [
            {
              additionalProperties: false,
              properties: {
                defaultValue: {
                  required: true,
                  type: "number",
                },
                id: {
                  type: "string",
                },
                name: {
                  required: true,
                  type: "string",
                },
                possibleValues: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      name: {
                        required: true,
                        type: "string",
                      },
                      value: {
                        required: true,
                        type: "number",
                      },
                    },
                    type: "object",
                  },
                  minItems: 1,
                  required: true,
                  type: "array",
                },
                visible: {
                  type: "string",
                },
              },
            },
            {
              additionalProperties: false,
              properties: {
                defaultValue: {
                  required: true,
                  type: "number",
                },
                id: {
                  type: "string",
                },
                maximumValue: {
                  required: true,
                  type: "number",
                },
                minimumValue: {
                  required: true,
                  type: "number",
                },
                name: {
                  required: true,
                  type: "string",
                },
                stepValue: {
                  type: "number",
                },
                visible: {
                  type: "string",
                },
              },
            },
          ],
          type: "object",
        },
        minItems: 1,
        required: true,
        type: "array",
      },
      output: {
        additionalProperties: false,
        minItems: 1,
        properties: {
          data: {
            items: {
              additionalProperties: false,
              properties: {
                id: {
                  required: true,
                  type: "string",
                },
                name: {
                  required: true,
                  type: "string",
                },
              },
              type: "object",
            },
            minItems: 1,
            required: true,
            type: "array",
          },
          plots: {
            items: {
              additionalProperties: false,
              properties: {
                xAxisTitle: {
                  required: true,
                  type: "string",
                },
                xValue: {
                  required: true,
                  type: "string",
                },
                yAxisTitle: {
                  required: true,
                  type: "string",
                },
                yValue: {
                  required: true,
                  type: "string",
                },
              },
              type: "object",
            },
            maxItems: 9,
            minItems: 1,
            required: true,
            type: "array",
          },
        },
        required: true,
        type: "object",
      },
      parameters: {
        items: {
          additionalProperties: false,
          properties: {
            name: {
              required: true,
              type: "string",
            },
            value: {
              required: true,
              type: "string",
            },
          },
          type: "object",
        },
        type: "array",
      },
      simulation: {
        additionalProperties: false,
        properties: {
          opencor: {
            additionalProperties: false,
            properties: {
              endingPoint: {
                type: "number",
              },
              pointInterval: {
                type: "number",
              },
              resource: {
                required: true,
                type: "string",
              },
            },
            type: "object",
          },
          solvers: {
            items: {
              additionalProperties: false,
              properties: {
                if: {
                  type: "string",
                },
                input: {
                  additionalProperties: false,
                  properties: {
                    name: {
                      required: true,
                      type: "string",
                    },
                    value: {
                      required: true,
                      type: "string",
                    },
                  },
                  type: "object",
                },
                name: {
                  required: true,
                  type: "string",
                },
                version: {
                  required: true,
                  type: "string",
                },
              },
              type: "object",
            },
            minItems: 1,
            required: true,
            type: "array",
          },
        },
        required: simulationInfoNeeded,
        type: "object",
      },
    },
    type: "object",
  };

  let result = validator.validate(json, schema, { nestedErrors: true });

  if (!result.valid) {
    console.warn(result.toString());

    return false;
  }

  // Make sure that the input information makes sense.

  let inputIdUsed = [];
  let inputValid = json.input.every((input) => {
    if (input.id !== undefined) {
      if (input.id === "") {
        console.warn("JSON: the input id must not be empty.");

        return false;
      }

      if (inputIdUsed[input.id]) {
        console.warn("JSON: the input id must be unique (" + input.id + " is used more than once).");

        return false;
      }

      inputIdUsed[input.id] = true;
    }

    if (input.name === "") {
      console.warn("JSON: the input name must not be empty.");

      return false;
    }

    if (input.possibleValues !== undefined) {
      if (!input.possibleValues.every((possibleValue) => {
        if (possibleValue.name === "") {
          console.warn("JSON: an input possible value must not be empty.");

          return false;
        }

        return true;
      })) {
        return false;
      }

      let values = input.possibleValues.map((value) => {
        return value.value;
      });
      let valueUsed = [];

      if (!values.every((value) => {
        if (valueUsed[value]) {
          console.warn("JSON: an input possible value must have a unique value (" + value + " is used more than once).");

          return false;
        }

        valueUsed[value] = true;

        return true;
      })) {
        return false;
      }

      if (!values.includes(input.defaultValue)) {
        console.warn("JSON: the input default value (" + input.defaultValue + ") must be one of the possible values (" + values.join(", ") + ").");

        return false;
      }
    }

    if ((input.minimumValue !== undefined) && (input.maximumValue !== undefined)) {
      if (input.minimumValue >= input.maximumValue) {
        console.warn("JSON: the input minimum value (" + input.minimumValue + ") must be lower than the maximum value (" + input.maximumValue + ").");

        return false;
      }

      if ((input.defaultValue < input.minimumValue) || (input.defaultValue > input.maximumValue)) {
        console.warn("JSON: the input default value (" + input.defaultValue + ") must be greater or equal than the minimum value (" + input.minimumValue + ") and lower or equal than the maximum value (" + input.maximumValue + ").");

        return false;
      }

      let range = input.maximumValue - input.minimumValue;

      if (input.stepValue !== undefined) {
        if ((input.stepValue <= 0) || (input.stepValue > range)) {
          console.warn("JSON: the input step value (" + input.stepValue + ") must be greater than zero and lower or equal than the range value (" + range + ").");

          return false;
        }

        if (!Number.isInteger(range / input.stepValue)) {
          console.warn("JSON: the input step value (" + input.stepValue + ") must be a factor of the range value (" + range + ").");

          return false;
        }
      } else {
        if (!Number.isInteger(range)) {
          console.warn("JSON: the (default) input step value (1) must be a factor of the range value (" + range + ").");

          return false;
        }
      }
    }

    if (input.visible !== undefined) {
      if (input.visible === "") {
        console.warn("JSON: the input visible must not be empty.");

        return false;
      }
    }

    return true;
  });

  if (!inputValid) {
    return false;
  }

  // Make sure that the output information makes sense.

  let outputIdUsed = [];
  let outputDataValid = json.output.data.every((outputData) => {
    if (outputData.id !== undefined) {
      if (outputData.id === "") {
        console.warn("JSON: the output data id must not be empty.");

        return false;
      }

      if (outputIdUsed[outputData.id]) {
        console.warn("JSON: the output data id must be unique (" + outputData.id + " is used more than once).");

        return false;
      }

      outputIdUsed[outputData.id] = true;
    }

    if (outputData.name === "") {
      console.warn("JSON: the output data name must not be empty.");

      return false;
    }

    return true;
  });

  if (!outputDataValid) {
    return false;
  }

  let outputPlotsValid = json.output.plots.every((outputPlot) => {
    if (outputPlot.xAxisTitle === "") {
      console.warn("JSON: the output plot X axis title must not be empty.");

      return false;
    }

    if (outputPlot.xValue === "") {
      console.warn("JSON: the output plot X value must not be empty.");

      return false;
    }

    if (outputPlot.yAxisTitle === "") {
      console.warn("JSON: the output plot Y axis title must not be empty.");

      return false;
    }

    if (outputPlot.yValue === "") {
      console.warn("JSON: the output plot Y value must not be empty.");

      return false;
    }

    return true;
  });

  if (!outputPlotsValid) {
    return false;
  }

  // Make sure that the parameters information makes sense.

  if (json.parameters !== undefined) {
    let parametersValid = json.parameters.every((parameter) => {
      if (parameter.name === "") {
        console.warn("JSON: the parameter name must not be empty.");

        return false;
      }

      if (parameter.value === "") {
        console.warn("JSON: the parameter value must not be empty.");

        return false;
      }

      return true;
    });

    if (!parametersValid) {
      return false;
    }
  }

  // Make sure that the simulation information makes sense.

  if (simulationInfoNeeded) {
    let needOpencorSettings = false;

    if (!json.simulation.solvers.every((solver) => {
      if (solver.if !== undefined) {
        if (solver.if === "") {
          console.warn("JSON: a simulation solver if must not be empty.");

          return false;
        }
      }

      if (solver.input !== undefined) {
        if (solver.input.name === "") {
          console.warn("JSON: a simulation solver input name must not be empty.");

          return false;
        }

        if (solver.input.value === "") {
          console.warn("JSON: a simulation solver input value must not be empty.");

          return false;
        }
      }

      if (solver.name === "") {
        console.warn("JSON: a simulation solver name must not be empty.");

        return false;
      }

      needOpencorSettings = needOpencorSettings || (solver.name === OPENCOR_SOLVER_NAME);

      if (solver.version === "") {
        console.warn("JSON: a simulation solver version must not be empty.");

        return false;
      }

      return true;
    })) {
      return false;
    }

    if (needOpencorSettings && (json.simulation.opencor === undefined)) {
      console.warn("JSON: the simulation solver for OpenCOR is specified so simulation OpenCOR settings must also be specified.");

      return false;
    }

    if (json.simulation.opencor !== undefined) {
      if (json.simulation.opencor.resource === "") {
        console.warn("JSON: the simulation OpenCOR resource must not be empty.");

        return false;
      }

      if (json.simulation.opencor.endingPoint !== undefined) {
        if (json.simulation.opencor.pointInterval !== undefined) {
          if (json.simulation.opencor.endingPoint <= 0.0) {
            console.warn("JSON: the simulation OpenCOR ending point (" + json.simulation.opencor.endingPoint + ") must be greater than zero.");

            return false;
          }

          if (json.simulation.opencor.pointInterval <= 0.0) {
            console.warn("JSON: the simulation OpenCOR point interval (" + json.simulation.opencor.pointInterval + ") must be greater than zero.");

            return false;
          }
        } else {
          console.warn("JSON: a simulation OpenCOR ending point is specified so a simulation OpenCOR point interval must also be specified.");

          return false;
        }
      } else if (json.simulation.opencor.pointInterval !== undefined) {
        console.warn("JSON: a simulation OpenCOR point interval is specified so a simulation OpenCOR ending point must also be specified.");

        return false;
      }
    }
  }

  return true;
}
