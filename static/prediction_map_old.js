
// This script is for rendering a prediction map with air quality data using Leaflet.js
// It fetches prediction data from a backend server and visualizes it on a map.
// The map is divided into two panes: one for the predicted data if land use changes (city -> forest) and one for the predicted data if nothing is changed.

/*
no2_ppb: Min = 6.369617206257097e-05 (Year: 2020, Grid ID: 477,5052), Max = 0.00011085229532006554 (Year: 2021, Grid ID: 576,5074)
co_ppb: Min = 26171103.83150496 (Year: 2022, Grid ID: 494,5179), Max = 35970473.01792881 (Year: 2021, Grid ID: 373,5065)
so2_ppb: Min = -1.883573891338224e-05 (Year: 2024, Grid ID: 420,5072), Max = 0.000644304165693134 (Year: 2021, Grid ID: 539,5188)
o3_ppb: Min = 0.1419198613660179 (Year: 2020, Grid ID: 495,5177), Max = 0.1535920355741955 (Year: 2024, Grid ID: 392,5058)
ch4_ppb: Min = 1769.9879973719176 (Year: 2020, Grid ID: 481,5029), Max = 1938.758298729912 (Year: 2023, Grid ID: 405,5040)

Max Difference in Pollutant Values on Same Grid ID:
ch4_ppb: Grid ID = 443,5121, Difference = 136.89675281443965, Min = 1779.0223866456092 (Year: 2020), Max = 1915.9191394600489 (Year: 2023)
co_ppb: Grid ID = 508,5132, Difference = 4316683.694369867, Min = 29766713.34908025 (Year: 2022), Max = 34083397.04345012 (Year: 2021)
no2_ppb: Grid ID = 425,5160, Difference = 1.5618358320322874e-05, Min = 7.493151451517541e-05 (Year: 2020), Max = 9.054987283549828e-05 (Year: 2021)
o3_ppb: Grid ID = 535,5029, Difference = 0.010299958997313119, Min = 0.1426300244719257 (Year: 2020), Max = 0.1529299834692388 (Year: 2024)
so2_ppb: Grid ID = 545,5159, Difference = 0.0005078567564163262, Min = 0.00012977988436304024 (Year: 2023), Max = 0.0006376366407793664 (Year: 2021)
*/

// Define a generic function to create color scales for pollutants
function createColorScale(thresholds, colors) {
    return function (value) {
        for (let i = 0; i < thresholds.length; i++) {
            if (value > thresholds[i]) {
                return colors[i];
            }
        }
        return colors[colors.length - 1]; // Default color
    };
}

// Define thresholds and colors for each pollutant
const pollutantScales = {
    no2_ppb: createColorScale(
        [0.00011085229532006554, 0.0001, 0.00009, 0.00008, 0.00007, 0.00006, 0.00005],
        ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0']
    ),
    co_ppb: createColorScale(
        [35970473.01792881, 35000000, 34000000, 33000000, 32000000, 31000000, 30000000],
        ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0']
    ),
    so2_ppb: createColorScale(
        [0.000644304165693134, 0.0006, 0.0005, 0.0004, 0.0003, 0.0002, 0.0001],
        ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0']
    ),
    o3_ppb: createColorScale(
        [0.1535920355741955, 0.153, 0.152, 0.151, 0.15, 0.149, 0.148],
        ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0']
    ),
    ch4_ppb: createColorScale(
        [1938.758298729912, 1930, 1920, 1910, 1900, 1890, 1880],
        ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0']
    )
};

// Generic function to get color based on pollutant key and value
function getColor(key, value) {
    return pollutantScales[key] ? pollutantScales[key](value) : '#FFEDA0';
}

// Initialize the map
let map = L.map('predictionMap', {
    center: [46.119944, 14.815333], // Adjust to your region
    zoom: 12
});
// Create separate panes for the side-by-side layers
map.createPane('left');
map.createPane('right');

// Set the z-index for the panes to control their stacking order
map.getPane('left').style.zIndex = 400;
map.getPane('right').style.zIndex = 401;

// Add a base tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// we have pollution data for no2_ppb,co_ppb,so2_ppb,o3_ppb,ch4_ppb
// Create layer groups for predictions of air quality 
// predict: what happens if land covering type changed, old: what happens if nothing is changed
let predictLayerNO2 = L.layerGroup().addTo(map);
predictLayerNO2.options.pane = 'right'; // Assign to the right pane
let oldLayerNO2 = L.layerGroup().addTo(map);
oldLayerNO2.options.pane = 'left'; // Assign to the left pane
let predictLayerCO = L.layerGroup().addTo(map);
predictLayerCO.options.pane = 'right';
let oldLayerCO = L.layerGroup().addTo(map);
oldLayerCO.options.pane = 'left';
let predictLayerSO2 = L.layerGroup().addTo(map);
predictLayerSO2.options.pane = 'right'; // Assign to the right pane
let oldLayerSO2 = L.layerGroup().addTo(map);
oldLayerSO2.options.pane = 'left'; // Assign to the left pane
let predictLayerO3 = L.layerGroup().addTo(map);
predictLayerO3.options.pane = 'right'; // Assign to the right pane
let oldLayerO3 = L.layerGroup().addTo(map);
oldLayerO3.options.pane = 'left'; // Assign to the left pane
let predictLayerCH4 = L.layerGroup().addTo(map);
predictLayerCH4.options.pane = 'right'; // Assign to the right pane
let oldLayerCH4 = L.layerGroup().addTo(map);
oldLayerCH4.options.pane = 'left'; // Assign to the left pane

// Create a dictionary of all pollutant layers for predictions and unchanged data
const predictLayers = {
    "NO2": predictLayerNO2,
    "CO": predictLayerCO,
    "SO2": predictLayerSO2,
    "O3": predictLayerO3,
    "CH4": predictLayerCH4
};

const unchangedLayers = {
    "NO2": oldLayerNO2,
    "CO": oldLayerCO,
    "SO2": oldLayerSO2,
    "O3": oldLayerO3,
    "CH4": oldLayerCH4
};

// Add a layer control to allow users to select pollutant layers
// Add separate layer controls for left (unchanged) and right (predicted for user's change) panes
const leftLayerControl = L.control.layers(null, null, { position: 'topleft', collapsed: false }).addTo(map);
const rightLayerControl = L.control.layers(null, null, { position: 'topright', collapsed: false }).addTo(map);

// Add pollutant layers to the respective controls
Object.keys(unchangedLayers).forEach(pollutant => {
    leftLayerControl.addOverlay(unchangedLayers[pollutant], `Unchanged ${pollutant}`);
});

Object.keys(predictLayers).forEach(pollutant => {
    rightLayerControl.addOverlay(predictLayers[pollutant], `Predicted ${pollutant}`);
});

// Initialize the side-by-side control with default layers
let sideBySideControl = L.control.sideBySide(oldLayerNO2, predictLayerNO2).addTo(map);

// Fetch prediction data from the backend
async function fetchPredictionData() {
    try {
        const response = await fetch('/prediction-data');
        if (!response.ok) {
            throw new Error('Failed to fetch prediction data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching prediction data:', error);
        return [];
    }
}

async function fetchUnchangedPredictionData() {
    try {
        const response = await fetch('/unchanged-prediction-data');
        if (!response.ok) {
            throw new Error('Failed to fetch unchanged prediction data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching unchanged prediction data:', error);
        return [];
    }
}

// Render the grid with air quality values
/*
 * layers is a dict with csv column name as key and layer as value 
 * {"no2_ppb": predictLayerNO2, ...}
*/
async function renderPredictionGrid(predictionData, layers) {
    predictionData.forEach(cell => {
        const southWest = [cell.sw_lat, cell.sw_lon];
        const northEast = [cell.ne_lat, cell.ne_lon];
        const bounds = [southWest, northEast];

        Object.entries(layers).forEach(([key, layer]) => {
            const value = cell[key];
            const rect = L.rectangle(bounds, {
                pane: layer.options.pane, // Ensure the rectangle is added to the correct pane
                color: '#000',
                weight: 1,
                fillColor: getColor(key, value),
                fillOpacity: 0.5
            });
            layer.addLayer(rect);
        });
    });
}

// Render the heatmap with air quality values
async function renderPredictionHeatmap(predicitonData, layers) {
    // Create a heatmap layer for each pollutant
    // var cfg = {
    //     // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    //     // if scaleRadius is false it will be the constant radius used in pixels
    //     "radius": 2,
    //     "maxOpacity": .8,
    //     // scales the radius based on map zoom
    //     "scaleRadius": true,
    //     // if set to false the heatmap uses the global maximum for colorization
    //     // if activated: uses the data maximum within the current map boundaries
    //     //   (there will always be a red spot with useLocalExtremas true)
    //     "useLocalExtrema": true,
    //     // which field name in your data represents the latitude - default "lat"
    //     latField: 'lat',
    //     // which field name in your data represents the longitude - default "lng"
    //     lngField: 'lng',
    //     // which field name in your data represents the data value - default "value"
    //     valueField: 'count'
    //   };
      
      
    //   var heatmapLayer = new HeatmapOverlay(cfg);
}


(async function initializePredictionMap() {
    // Fetch prediction data
    const predictionData = await fetchPredictionData();
    const unchangedPredictionData = await fetchUnchangedPredictionData();
    console.log(predictionData)
    console.log(unchangedPredictionData)

    var predictLayers = {
        "no2_ppb": predictLayerNO2
    }

    var unchangedLayers = {
        "no2_ppb": oldLayerNO2
    }

    // Check the data type and render accordingly
    if (predictionData.data_type === "grid_and_point") {
        console.log("got grid and point data");
        // TODO: render the grid and point data and make a switch to choose which one to show
    } else if (predictionData.data_type === "grid") {
        console.log("got grid data");
        renderPredictionGrid(predictionData.data, predictLayers);
        renderPredictionGrid(unchangedPredictionData.data, unchangedLayers);
    } else if (predictionData.data_type === "point") {
        renderPredictionHeatmap(predictionData.data, predictLayers);
        renderPredictionHeatmap(unchangedPredictionData.data, unchangedLayers);
    }

})();