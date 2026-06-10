// Renders heatmap hexagons as SVG polygons
function drawMap(data, germanyGeo, metadata, heatmapData, yearlyAccidentsByState, heatmapOptions = {}){

    // Convert German State ISO to code
    const STATE_ISO_TO_CODE = {
		"DE-SH": "01",
		"DE-HH": "02",
		"DE-NI": "03",
		"DE-HB": "04",
		"DE-NW": "05",
		"DE-HE": "06",
		"DE-RP": "07",
		"DE-BW": "08",
		"DE-BY": "09",
		"DE-SL": "10",
		"DE-BE": "11",
		"DE-BB": "12",
		"DE-MV": "13",
		"DE-SN": "14",
		"DE-ST": "15",
		"DE-TH": "16"
	};

    const STATE_NAMES = {
        "01": "Schleswig-Holstein",
        "02": "Hamburg",
        "03": "Lower Saxony",
        "04": "Bremen",
        "05": "North Rhine-Westphalia",
        "06": "Hesse",
        "07": "Rhineland-Palatinate",
        "08": "Baden-Wuerttemberg",
        "09": "Bavaria",
        "10": "Saarland",
        "11": "Berlin",
        "12": "Brandenburg",
        "13": "Mecklenburg-Western Pomerania",
        "14": "Saxony",
        "15": "Saxony-Anhalt",
        "16": "Thuringia"
    };

    const headers = [
        "stateCode", "administrativeRegionCode", "districtCode", "municipalityCode", "year", "month", "hour", "weekday", 
        "severity", "accidentKind", "accidentType", "lightCondition", "roadSurfaceCondition", "involvesBicycle", "involvesPassengerCar", 
        "involvesPedestrian", "involvesMotorcycle", "involvesGoodsRoadVehicle", "involvesOther", "longitude", "latitude"
    ];
    
    const objdata = data.map(row =>
        Object.fromEntries(row.map((val, i) => [headers[i], val]))
    );

    // Create accidentsByState from yearlyAccidentsByState by mapping state names to state codes
    const STATE_NAME_TO_CODE = {
        "Schleswig-Holstein": "01",
        "Hamburg": "02",
        "Lower Saxony": "03",
        "Bremen": "04",
        "North Rhine-Westphalia": "05",
        "Hesse": "06",
        "Rhineland-Palatinate": "07",
        "Baden-Wuerttemberg": "08",
        "Bavaria": "09",
        "Saarland": "10",
        "Berlin": "11",
        "Brandenburg": "12",
        "Mecklenburg-Western Pomerania": "13",
        "Saxony": "14",
        "Saxony-Anhalt": "15",
        "Thuringia": "16"
    };
    
    const accidentsByState = {};
    if (yearlyAccidentsByState) {
        for (const [stateName, count] of Object.entries(yearlyAccidentsByState)) {
            const stateCode = STATE_NAME_TO_CODE[stateName];
            if (stateCode) {
                accidentsByState[stateCode] = count;
            }
        }
    }
    // console.log("Accidents by state:", accidentsByState);

    const NO_DATA_COLOR = "#e0e0e0";

    function hasNoAccidentData(value) {
        return value === 0 || value === "0" || value === null || value === undefined || value === "No Data";
    }

    function formatAccidentTooltipValue(value) {
        return hasNoAccidentData(value) ? "No Data" : Number(value).toLocaleString();
    }

    const height = 800;
    const width = 900;

    let svg;
    let transform = { x: 0, y: 0, k: 1 };
    let zoomBehavior;
    const margin = { top: 10, bottom: 80, left: 10, right: 10 };

    const geoProjection = d3.geoMercator().fitExtent(
        [
            [margin.left, margin.top],
            [width - margin.right, height - margin.bottom],
        ],
        germanyGeo
    );

    const path = d3.geoPath(geoProjection);

    const HEX_RADIUS_PX = 5;

    //Function to calculate hexagon corner coordinates
    function hexCorner(centerX, centerY, radius, index) {
        const angle = Math.PI / 180 * (60 * index - 30); //We want a pointy hexagon top, hence -30 degree offset
        return [
            //convert polar to cartesian coordinates
            centerX + radius * Math.cos(angle), 
            centerY + radius * Math.sin(angle)
        ];
    }

    //Function to get the points string for SVG polygon element based on hexagon center and radius
    function hexPolygonPoints(centerX, centerY, radius) {
        const corners = [];
        for (let i = 0; i < 6; i++) {
            corners.push(hexCorner(centerX, centerY, radius, i));
        }
        return corners.map(([x, y]) => `${x},${y}`).join(" ");
    }

    const years = Array.from(
        new Set(
            objdata
                .map(d => +d.year)
                .filter(year => Number.isFinite(year))
        )
    ).sort((a, b) => a - b);

    const selectedYear = heatmapData?.year || years[years.length - 1] || 2024;
    const heatmapCells = Array.isArray(heatmapData?.cells) ? heatmapData.cells : [];
    const palette = heatmapOptions?.heatmapPalette || {};
    const stateFillColor = heatmapOptions?.stateFillColor || "#f2ec99";
    const heatmapMode = palette.mode === "threshold" ? "threshold" : "gradient";
    
    let heatmapMaxIntensity = 0;
    let heatmapMinIntensity = Number.POSITIVE_INFINITY;
    for (const cell of heatmapCells) {
        const intensity = Number(cell.heatmap_intensity) || 0;
        if (intensity > heatmapMaxIntensity) {
            heatmapMaxIntensity = intensity;
        }
        if (intensity < heatmapMinIntensity) {
            heatmapMinIntensity = intensity;
        }
    }
    if (heatmapMinIntensity === Number.POSITIVE_INFINITY) heatmapMinIntensity = 0;
    if (heatmapMaxIntensity === 0 && heatmapMinIntensity === 0) heatmapMaxIntensity = 1;

    let heatmapColorScale;
    let legendStops = [];
    let legendColors = [];

    if (heatmapMode === "threshold") {
        const thresholdDomain = Array.isArray(palette.thresholds) && palette.thresholds.length ? palette.thresholds : [0.25, 0.5];
        const thresholdColors = Array.isArray(palette.colors) && palette.colors.length ? palette.colors : ["#f3903f", "#ed683c", "#e93e3a"];
        heatmapColorScale = d3.scaleThreshold()
            .domain(thresholdDomain)
            .range(thresholdColors);
        legendStops = [0, ...thresholdDomain, 1];
        legendColors = thresholdColors;
    } else {
        const span = Math.max(0, heatmapMaxIntensity - heatmapMinIntensity);
        const stops = [0, 0.25, 0.5, 0.75, 1].map(t => heatmapMinIntensity + t * span);

        heatmapColorScale = d3.scaleLinear()
            .domain(stops)
            .range(["#0000ff", "#00ffff", "#00ff00", "#ffff00", "#ff0000"])
            .interpolate(d3.interpolateRgb)
            .clamp(true);

        legendStops = [0, 0.25, 0.5, 0.75, 1];
        legendColors = ["#0000ff", "#00ffff", "#00ff00", "#ffff00", "#ff0000"];
    }

    const heatmapOpacityScale = d3.scaleLinear()
        .domain([heatmapMinIntensity, heatmapMaxIntensity])
        .range([0.04, 0.9])
        .clamp(true);

    
    d3.select("#state-tooltip").remove();

    const tooltip = d3.select("body")
        .append("div")
        .attr("id", "state-tooltip")
        .style("position", "fixed")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("background", "rgba(32, 32, 32, 0.9)")
        .style("color", "#fff")
        .style("padding", "8px 10px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("line-height", "1.35")
        .style("box-shadow", "0 4px 14px rgba(0, 0, 0, 0.25)")
        .style("z-index", 1000);

    // Create the main SVG element
    svg = d3.select("main")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "block");

    // Draw background rectangle
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#FFFFFF");

    const mapGroup = svg.append("g")
        .attr("id", "map");

    // SVG heatmap group for hexagons
    const heatmapGroup = svg.append("g")
        .attr("id", "heatmap-svg")
        .attr("clip-path", "url(#germany-clip)");

    const outlineGroup = svg.append("g")
        .attr("id", "state-outlines")
        .attr("pointer-events", "none");

    // Initial zoom: scale up the map groups so the map fills more of the available area
    const INITIAL_MAP_SCALE = 1.0; // <1.0 to zoom out, >1.0 to zoom in
    const initialTx = (width - width * INITIAL_MAP_SCALE) / 2;
    const initialTy = (height - height * INITIAL_MAP_SCALE) / 2;
    const initialTransform = d3.zoomIdentity
        .translate(initialTx, initialTy)
        .scale(INITIAL_MAP_SCALE);

    // Define clip path for Germany boundary
    const defs = svg.append("defs");
    defs.append("clipPath")
        .attr("id", "germany-clip")
        .append("path")
        .attr("d", path(germanyGeo));

    // Draw states
    mapGroup.selectAll(".state")
        .data(germanyGeo.features)
        .join("path")
        .attr("class", "state")
        .attr("d", path)
        .attr("fill", d => {
            const isoCode = d.properties.id;
            const stateCode = STATE_ISO_TO_CODE[isoCode];
            const count = accidentsByState[stateCode] || 0;
            return hasNoAccidentData(count) ? NO_DATA_COLOR : stateFillColor;
        })
        .on("mouseover", function(event, d) {
            const isoCode = d.properties.id;
            const stateCode = STATE_ISO_TO_CODE[isoCode];
            const count = accidentsByState[stateCode] || 0;
            const stateName = STATE_NAMES[stateCode] || "Unknown";
            tooltip
                .html(`<strong>${stateName}</strong><br/>Accidents: ${formatAccidentTooltipValue(count)}`)
                .style("opacity", 1)
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY + 14}px`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY + 14}px`);
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        })
        .attr("stroke", "none");

    outlineGroup.selectAll(".state-outline")
        .data(germanyGeo.features)
        .join("path")
        .attr("class", "state-outline")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#666")
        .attr("stroke-width", 1.5);

    function renderHeatmapSVG(year) {
        d3.select("#heatmap-year-label").text(`Year ${year}`);
        d3.select("#heatmap-year-count").text(`${heatmapCells.length.toLocaleString()} hex centers`);

        // What is happening here?
        // We bind the heatmap cell data to SVG polygon elements, 
        // calculate the hexagon points based on the cell's lat/lon and 
        // the defined radius, and set fill color and opacity based on the 
        // intensity value using the defined scales. 
        // We also handle cases where the projection might return invalid coordinates 
        // by skipping those cells.
        heatmapGroup.selectAll(".hex-cell")
            .data(heatmapCells)
            .join("polygon")
            .attr("class", "hex-cell")
            .attr("points", d => {
                const center = geoProjection([+d.longitude, +d.latitude]);
                if (!center || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
                    return "";
                }
                return hexPolygonPoints(center[0], center[1], HEX_RADIUS_PX);
            })
            .attr("fill", d => {
                const intensity = +d.heatmap_intensity || 0;
                return heatmapColorScale(intensity);
            })
            .attr("fill-opacity", d => {
                const intensity = +d.heatmap_intensity || 0;
                return heatmapOpacityScale(intensity);
            })
            .attr("stroke", "none");
    }

    // Heatmap legend
    const heatmapLegendX = 20;
    const heatmapLegendY = 20;

    const heatmapLegendGroup = svg.append("g")
        .attr("id", "heatmap-legend")
        .attr("transform", `translate(${heatmapLegendX}, ${heatmapLegendY})`);

    heatmapLegendGroup.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-weight", "bold")
        .attr("font-size", "14px")
        .text("Accident-Intensity Density");

    heatmapLegendGroup.append("rect")
        .attr("x", 10)
        .attr("y", 30)
        .attr("width", 14)
        .attr("height", 300)
        .attr("fill", "url(#heatmap-gradient)");

    const legendGradientStops = [0, 0.25, 0.5, 0.75, 1];
    const legendGradientColors = ["#0000ff", "#00ffff", "#00ff00", "#ffff00", "#ff0000"];

    const legendGradient = defs
        .append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    legendGradientStops.forEach((stop, index) => {
        legendGradient.append("stop")
            .attr("offset", `${stop * 100}%`)
            .attr("stop-color", legendGradientColors[index]);
    });

    heatmapLegendGroup.append("text")
        .attr("x", 30)
        .attr("y", 40)
        .attr("font-size", "12px")
        .attr("dominant-baseline", "hanging")
        .text("High Density Area");

    heatmapLegendGroup.append("text")
        .attr("x", 30)
        .attr("y", 330)
        .attr("font-size", "12px")
        .attr("dominant-baseline", "ideographic")
        .text("Low Density Area");

    d3.select("#heatmap-year-slider").on("input", function(event) {
        renderHeatmapSVG(+this.value);
    });

    // Zoom event
    zoomBehavior = d3.zoom()
        .scaleExtent([1 / 2, 8])
        .on("zoom", zoomed);

    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, initialTransform);

    function zoomed(event) {
        transform = event.transform;
        svg.selectAll("#map").attr("transform", "translate("+transform.x+","+transform.y+")scale("+transform.k+")");
        svg.selectAll("#state-outlines").attr("transform", "translate("+transform.x+","+transform.y+")scale("+transform.k+")");
        svg.selectAll("#heatmap-svg").attr("transform", "translate("+transform.x+","+transform.y+")scale("+transform.k+")");
    }

    // Expose zoom reset so parent page can reset the currently active iframe map
    window.resetMapZoom = function resetMapZoom() {
        if (!svg || !zoomBehavior) return;
        svg.call(zoomBehavior.transform, initialTransform);
    };

    renderHeatmapSVG(selectedYear);
}