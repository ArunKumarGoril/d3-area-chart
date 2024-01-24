// setting dimensions and margins fro the chart
const margin = { top: 70, right: 60, bottom: 50, left: 80 };
const width = 1100 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

// setting up the x and y scales
const xScale = d3.scaleTime().range([0, width]);

const yScale = d3.scaleLinear().range([height, 0]);

// create a svg element and append it to the chart container
const svg = d3
  .select("#chart-container")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// create a tooltip div
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

// create a second tooltip div for new date
const tooltipRowDate = d3.select("body").append("div").attr("class", "tooltip");

// create out gradient
const gradient = svg
  .append("defs")
  .append("linearGradient")
  .attr("id", "gradient")
  .attr("x1", "0%")
  .attr("x2", "0%")
  .attr("y1", "0%")
  .attr("y2", "100%")
  .attr("spreadMethod", "pad");

gradient
  .append("stop")
  .attr("offset", "0%")
  .attr("stop-color", "#85bb65")
  .attr("stop-opacity", 1);

gradient
  .append("stop")
  .attr("offset", "100%")
  .attr("stop-color", "#85bb65")
  .attr("stop-opacity", 0);

// load and process data
d3.csv("./data/NTDOY.csv").then((data) => {
  // parse the Date and convert the Close to a number
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach((d) => {
    d.Date = parseDate(d.Date);
    d.Close = +d.Close;
  });

  // set the domian for the x and y scales
  xScale.domain(d3.extent(data, (d) => d.Date));
  yScale.domain([0, d3.max(data, (d) => d.Close)]);

  // x and y axes
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(xScale.ticks(d3.timeYear.every(1)))
    .tickFormat(d3.timeFormat("%Y"));

  const yAxis = d3
    .axisRight(yScale)
    .ticks(10)
    .tickFormat((d) => {
      if (isNaN(d)) {
        return "";
      } else {
        return `$${d.toFixed(2)}`;
      }
    });

  // append the axis to the chart
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    // .style("font-size", "14px")
    .call(xAxis)
    .selectAll(".tick line")
    .style("stroke-opacity", 1);
  svg.selectAll(".tick text").attr("fill", "#777");

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${width}, 0)`)
    .style("font-size", "14px")
    .call(yAxis)
    .selectAll(".tick text")
    .style("fill", "#777");

  // set the line generator
  const line = d3
    .line()
    .x((d) => xScale(d.Date))
    .y((d) => yScale(d.Close));

  // create an area generator
  const area = d3
    .area()
    .x((d) => xScale(d.Date))
    .y0(height)
    .y1((d) => yScale(d.Close));

  // add the area chart
  svg
    .append("path")
    .datum(data)
    .attr("class", "area")
    .attr("d", area)
    .style("fill", "url(#gradient)")
    .style("opacity", 0.5);

  // add the line path
  svg
    .append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "#85bb65")
    .attr("stroke-width", 1)
    .attr("d", line);

  // add a circle element
  const circle = svg
    .append("circle")
    .attr("r", 0)
    .attr("fill", "red")
    .style("stroke", "white")
    .attr("opacity", 0.7)
    .style("pointer-events", "none");

  // add red lines extending from the circle to the date and value
  const tooltipLineX = svg
    .append("line")
    .attr("class", "tooltip-line")
    .attr("id", "tooltip-line-x")
    .attr("stroke", "red")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2,2");

  const tooltipLineY = svg
    .append("line")
    .attr("class", "tooltip-line")
    .attr("id", "tooltip-line-y")
    .attr("stroke", "red")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2,2");

  // creating a listening rectangle
  const listeningRect = svg
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  // create a mouse move function
  listeningRect.on("mousemove", function (event) {
    const [xCoord] = d3.pointer(event, this);
    const bisectDate = d3.bisector((d) => d.Date).left;
    const x0 = xScale.invert(xCoord);
    const i = bisectDate(data, x0, 1);
    const d0 = data[i - 1];
    const d1 = data[i];
    const d = x0 - d0.date > d1.date - x0 ? d1 : d0;
    const xPos = xScale(d.Date);
    const yPos = yScale(d.Close);

    // update circle position
    circle.attr("cx", xPos).attr("cy", yPos);

    // add transition for circle
    circle.transition().duration(50).attr("r", 5);

    // update the position of red lines
    tooltipLineX
      .style("display", "block")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", 0)
      .attr("y2", height);
    tooltipLineY
      .style("display", "block")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yPos)
      .attr("y2", yPos);

    // add in our tooltip
    tooltip
      .style("display", "block")
      .style("left", `${width + 90}px`)
      .style("top", `${yPos + 70}px`)
      .html(`$${d.Close !== undefined ? d.Close.toFixed(2) : "N/A"}`);

    tooltipRowDate
      .style("display", "block")
      .style("left", `${xPos + 60}px`)
      .style("top", `${height + 53}px`)
      .html(
        `$${d.Date !== undefined ? d.Date.toISOString().slice(0, 10) : "N/A"}`
      );
  });

  // listen reactangle mouse leave function
  listeningRect.on("mouseleave", function () {
    circle.transition().duration(50).attr("r", 0);
    tooltip.style("display", "none");
    tooltipRowDate.style("display", "none");
    tooltipLineX.attr("y1", 0).attr("y2", 0);
    tooltipLineY.attr("x1", 0).attr("x2", 0);
    tooltipLineX.style("display", "none");
    tooltipLineY.style("display", "none");
  });

  // define the slider
  const sliderRange = d3
    .sliderBottom()
    .min(d3.min(data, (d) => d.Date))
    .max(d3.max(data, (d) => d.Date))
    .width(300)
    .tickFormat(d3.timeFormat("%Y-%m-%d"))
    .ticks(3)
    .default([d3.min(data, (d) => d.Date), d3.max(data, (d) => d.Date)])
    .fill("#85bb65");

  sliderRange.on("onchange", (val) => {
    // set new domin for x scale
    xScale.domain(val);

    // filter data based
    const filteredData = data.filter(
      (d) => d.Date >= val[0] && d.Date <= val[1]
    );

    // set new domain for y scale based on new data
    yScale.domain([0, d3.max(filteredData, (d) => d.Close)]);

    // update the line and area
    svg.select(".line").attr("d", line(filteredData));
    svg.select(".area").attr("d", area(filteredData));

    // update the x axis with new domain
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(xScale.ticks(d3.timeYear.every(1)))
      .tickFormat(d3.timeFormat("%Y"));

    svg.select(".x-axis").transition().duration(300).call(xAxis);

    const yAxis = d3
      .axisRight(yScale)
      .ticks(10)
      .tickFormat((d) => {
        if (d <= 0) return "";
        return `$${d.toFixed(2)}`;
      });

    svg.select(".y-axis").transition().duration(300).call(yAxis);
  });

  // add the slider to the DOM
  const gRange = d3
    .select("#slider-range")
    .append("svg")
    .attr("width", 500)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(90, 30)");

  gRange.call(sliderRange);

  // add the chart title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left - 115)
    .attr("y", margin.top - 100)
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("font-family", "sans-serif")
    .text("Ninten Co., Ltd. (NTDOY)");
});

// let data;
// const fetchData = async () => {
//     data = await d3.csv("./data/NTDOY.csv");
//     // parse the Date and convert the Close to a number
//     const parseDate = d3.timeParse("%Y-%m-%d");
//     data.forEach(d => {
//         d.Date = parseDate(d.Date);
//         d.Close = +d.Close;
//     });
// }
// fetchData();
// console.log(data);
