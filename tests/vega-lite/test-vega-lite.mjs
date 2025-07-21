import * as vega from "vega";
import * as vegaLite from "vega-lite";

// Vega-Lite specification
const vegaLiteSpec = {
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  description: "A simple bar chart",
  data: {
    values: [
      { a: "A", b: 28 },
      { a: "B", b: 55 },
      { a: "C", b: 43 },
      { a: "D", b: 91 },
      { a: "E", b: 81 },
    ],
  },
  mark: "bar",
  encoding: {
    x: { field: "a", type: "nominal", axis: { labelAngle: 0 } },
    y: { field: "b", type: "quantitative" },
  },
};

async function generateSVG(spec) {
  try {
    // Compile Vega-Lite to Vega specification
    const vegaSpec = vegaLite.compile(spec).spec;

    // Create a Vega view
    const view = new vega.View(vega.parse(vegaSpec), {
      renderer: "none", // No renderer needed for SVG output
    });

    // Generate SVG string
    const svg = await view.toSVG();
    return svg;
  } catch (error) {
    console.error("Error generating SVG:", error);
    throw error;
  }
}

// Run the function and save the SVG
import { writeFileSync } from "fs";

generateSVG(vegaLiteSpec)
  .then((svg) => {
    console.log(svg);
    writeFileSync("chart.svg", svg);
    console.log("SVG saved to chart.svg");
  })
  .catch((err) => console.error(err));