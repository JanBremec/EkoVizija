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

// Initialize the left and right maps
let mapLeft = L.map('leftMap', {
    center: [46.119944, 14.815333], // Slovenia center
    zoom: 10
});
let mapRight = L.map('rightMap', {
    center: [46.119944, 14.815333], // Slovenia center
    zoom: 10
});

// Create custom panes for the tile layers
mapLeft.createPane('tilePane');
mapRight.createPane('tilePane');

// Set the z-index of the tile pane to be lower than the default overlay pane
mapLeft.getPane('tilePane').style.zIndex = 200; // Lower z-index for tile layers
mapRight.getPane('tilePane').style.zIndex = 200;

// Add base tile layers
var lightLeft = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    pane: 'tilePane' // Use the custom tile pane
});
lightLeft.addTo(mapLeft);
var lightRight = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    pane: 'tilePane' // Use the custom tile pane
});
lightRight.addTo(mapRight);

// dark mode layers
var darkLeft = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    pane: 'tilePane' // Use the custom tile pane
});

var darkRight = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    pane: 'tilePane' // Use the custom tile pane
});

// Handle dark mode toggle to switch between dark and light openstreetmap layers
const themeToggleButton = document.querySelector('.theme-toggle');
// get from button text if dark mode is enabled
let isDarkMode = themeToggleButton.textContent === 'Light Mode';

themeToggleButton.addEventListener('click', () => {
    isDarkMode = !isDarkMode;

    // Remove only the tile layers
    mapLeft.eachLayer(layer => {
        if (layer === lightLeft || layer === darkLeft) {
            mapLeft.removeLayer(layer);
        }
    });
    mapRight.eachLayer(layer => {
        if (layer === lightRight || layer === darkRight) {
            mapRight.removeLayer(layer);
        }
    });

    // Add the appropriate tile layer based on the mode
    const tileLayerLeft = isDarkMode ? darkLeft : lightLeft;
    const tileLayerRight = isDarkMode ? darkRight : lightRight;
    tileLayerLeft.addTo(mapLeft);
    tileLayerRight.addTo(mapRight);

    // Update the button text
    themeToggleButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
});

// Variables to store the data and layers
let leftData = [];
let rightData = [];
// Dictionary to store heatmap layers for each pollutant
let heatmapLayers = {
    left: {},
    right: {}
};
// Dictionary to store grid layers for each pollutant
let gridLayers = {
    left: {},
    right: {}
};
let currentPollutant = 'no2_ppb'; // Default pollutant to display
let usingHeatmap = true; // Flag to track if heatmap is being used, if false, grid is used
// Define min and max values for each pollutant
let minMaxPollutantValues = {
    no2_ppb: { min: 6.369617206257097e-05, max: 0.00011085229532006554 },
    co_ppb: { min: 26171103.83150496, max: 35970473.01792881 },
    so2_ppb: { min: -1.883573891338224e-05, max: 0.000644304165693134 },
    o3_ppb: { min: 0.1419198613660179, max: 0.1535920355741955 },
    ch4_ppb: { min: 1769.9879973719176, max: 1938.758298729912 }
};

// Define gradients for each pollutant
const pollutantGradients = {
    no2_ppb: { 0.4: 'rgb(0,0,255)', 0.65: 'rgb(0,255,0)', 1: 'rgb(255,0,0)' },
    co_ppb: { 0.4: 'rgb(128,0,128)', 0.65: 'rgb(255,165,0)', 1: 'rgb(255,255,0)' },
    so2_ppb: { 0.4: 'rgb(0,255,255)', 0.65: 'rgb(0,128,0)', 1: 'rgb(255,0,255)' },
    o3_ppb: { 0.4: 'rgb(0,0,128)', 0.65: 'rgb(0,128,128)', 1: 'rgb(0,255,255)' },
    ch4_ppb: { 0.4: 'rgb(255,192,203)', 0.65: 'rgb(238,130,238)', 1: 'rgb(220,20,60)' }
};

// Helper function to get color based on pollutant value for grid
function getPollutantColor(value) {
    // Normalize the value to a range between 0 and 1
    const min = minMaxPollutantValues[currentPollutant].min;
    const max = minMaxPollutantValues[currentPollutant].max;
    const normalizedValue = (value - min) / (max - min);

    // Get the color based on the normalized value
    return colorRamp(normalizedValue, pollutantGradients[currentPollutant]);
}

// Helper function to interpolate colors based on a gradient
function colorRamp(normalizedValue, gradient) {
    // Ensure the normalized value is between 0 and 1
    normalizedValue = Math.max(0, Math.min(1, normalizedValue));

    // Get the gradient stops as an array of [stop, color]
    const stops = Object.entries(gradient)
        .map(([stop, color]) => [parseFloat(stop), color])
        .sort(([a], [b]) => a - b); // Sort by stop percentage

    // Find the two stops between which the normalized value falls
    for (let i = 0; i < stops.length - 1; i++) {
        const [startStop, startColor] = stops[i];
        const [endStop, endColor] = stops[i + 1];

        if (normalizedValue >= startStop && normalizedValue <= endStop) {
            // Interpolate between the two colors
            const t = (normalizedValue - startStop) / (endStop - startStop);
            return interpolateColor(startColor, endColor, t);
        }
    }

    // If the value is outside the gradient range, return the closest color
    return normalizedValue <= stops[0][0] ? stops[0][1] : stops[stops.length - 1][1];
}

// Helper function to interpolate between two colors
function interpolateColor(color1, color2, t) {
    const parseColor = (color) => color.match(/\d+/g).map(Number); // Extract RGB values
    const [r1, g1, b1] = parseColor(color1);
    const [r2, g2, b2] = parseColor(color2);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgb(${r},${g},${b})`;
}


// Function to create heatmap layer from data using the leaflet-heat.js plugin
function createHeatmapLayer(data, pollutant) {
    const heatData = data.map(item => [item.lat, item.lon, item[pollutant]]);
    console.log(`Creating heatmap layer for pollutant: ${pollutant}`, heatData);

    // Get min/max values for consistent gradient
    const values = data.map(item => item[pollutant]);
    const maxValue = Math.max(...values);

    // Use the gradient for the selected pollutant
    const gradient = pollutantGradients[pollutant] || { 0.4: 'blue', 0.65: 'lime', 1: 'red' };

    // Create a heatmap layer
    return L.heatLayer(heatData, {
        radius: 25, // Radius of each point
        blur: 15,   // Blur intensity
        maxZoom: 17, // Maximum zoom level for intensity scaling
        gradient: gradient, // Use the pollutant-specific gradient
        minOpacity: 0.5, // Minimum opacity for the heatmap
        max: maxValue // Maximum value of the pollutant so that the heatmap is scaled accordingly
    });
}

// Function to create a grid layer (placeholder for now)
function createGridLayer(data, pollutant) {
    const gridLayer = L.layerGroup();

    data.forEach(item => {
        const bounds = [
            [item.sw_lat, item.sw_lon], // Southwest corner
            [item.ne_lat, item.ne_lon]  // Northeast corner
        ];

        // Create a rectangle for the grid cell
        const rectangle = L.rectangle(bounds, {
            color: 'blue', // Default border color
            weight: 1,     // Border thickness
            fillColor: getPollutantColor(item[pollutant]), // Color based on pollutant value
            fillOpacity: 0.6 // Transparency
        });

        // Add a tooltip to show pollutant value on hover
        rectangle.bindTooltip(`${pollutant.toUpperCase().replace('_PPB', 'in PPB')}: ${item[pollutant]}`, {
            permanent: false,
            direction: 'center'
        });

        gridLayer.addLayer(rectangle);
    });

    return gridLayer;
}

// Function to update the legend dynamically
function updateLegend(type, pollutant) {
    const minValue = minMaxPollutantValues[pollutant].min;
    const maxValue = minMaxPollutantValues[pollutant].max;
    console.log(`Updating legend for ${type} with pollutant: ${pollutant}, min: ${minValue}, max: ${maxValue}`);
    const legendTitle = document.getElementById('legend-title');
    const legendContent = document.getElementById('legend-content');

    // Clear existing legend content
    legendContent.innerHTML = '';

    if (type === 'heatmap') {
        legendTitle.textContent = `Heatmap Legend (${pollutant})`;

    } else if (type === 'grid') {
        legendTitle.textContent = `Grid Legend (${pollutant})`;
    }

    // Create the gradient bar
    const gradientBar = document.createElement('div');
    gradientBar.style.height = '20px'; // Increased height for better visibility
    gradientBar.style.marginBottom = '5px'; // Add spacing below the gradient bar

    // Set the gradient dynamically based on the pollutant
    const gradient = pollutantGradients[pollutant] || { 0.4: 'blue', 0.65: 'lime', 1: 'red' };

    // Sort the gradient stops by their percentage (key)
    const sortedGradientStops = Object.entries(gradient)
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b)) // Sort by stop percentage
        .map(([stop, color]) => `${color} ${(stop * 100).toFixed(0)}%`)
        .join(', ');

    gradientBar.style.background = `linear-gradient(to right, ${sortedGradientStops})`;

    // Add the gradient bar to the legend
    legendContent.appendChild(gradientBar);

    // Create the labels for min and max values
    const labels = document.createElement('div');
    labels.style.display = 'flex';
    labels.style.justifyContent = 'space-between';
    labels.style.marginTop = '5px';

    // Dynamically format the numbers based on their magnitude
    const formatNumber = (num) => {
        if (Math.abs(num) < 0.01) {
            return num.toExponential(2); // Use scientific notation for very small numbers
        }
        return num.toFixed(4); // Use 4 decimal places for small values
    };

    labels.innerHTML = `
            <span>${formatNumber(minValue)}</span>
            <span>${formatNumber(maxValue)}</span>
        `;

    // Add the labels to the legend
    legendContent.appendChild(labels);
}

// selector for the map type (heatmap or grid)
const mapSelector = document.getElementById('mapSelector');
// Add an event listener to toggle between heatmap and grid
mapSelector.addEventListener('change', (e) => {
    const selectedMap = e.target.value;
    console.log("Selected map type:", selectedMap);

    if (selectedMap === 'heat') { // pazi da se ujema s html!!!
        console.log("Heatmap selected");
        toggleVisualization('heatmap');
    } else if (selectedMap === 'grid') {
        console.log("Grid selected");
        toggleVisualization('grid');
    }
});

// Function to toggle between heatmap and grid
function toggleVisualization(type) {
    if (type === 'heatmap') {
        // Remove grid layers
        Object.values(gridLayers.left).forEach(layer => {
            if (layer) {
                layer.removeFrom(mapLeft);
            }
        });
        Object.values(gridLayers.right).forEach(layer => {
            if (layer) {
                layer.removeFrom(mapRight);
            }
        });
        usingHeatmap = true;
        console.log("Displaying heatmap...");
        updateHeatmaps(currentPollutant); // Load heatmap
        updateLegend('heatmap', currentPollutant); // Load heatmap legend
    } else if (type === 'grid') {
        // Remove heatmap layers
        Object.values(heatmapLayers.left).forEach(layer => {
            if (layer) {
                layer.removeFrom(mapLeft);
            }
        }
        );
        Object.values(heatmapLayers.right).forEach(layer => {
            if (layer) {
                layer.removeFrom(mapRight);
            }
        }
        );
        usingHeatmap = false;
        console.log("Displaying grid...");
        updateGridmaps(currentPollutant); // Update grid layers
        updateLegend('grid', currentPollutant); // Load grid legend
    }
}

// Function to update the heatmaps and legend
function updateHeatmaps(pollutant) {

    // Remove all existing heatmap layers
    Object.values(heatmapLayers.left).forEach(layer => {
        if (layer) {
            layer.removeFrom(mapLeft);
        }
    });
    Object.values(heatmapLayers.right).forEach(layer => {
        if (layer) {
            layer.removeFrom(mapRight);
        }
    });

    currentPollutant = pollutant;
    console.log(`Updating heatmaps for pollutant: ${pollutant}`);
    // Create new heatmap layers if they are not in the dictionary
    if (!heatmapLayers.left[pollutant]) {
        heatmapLayers.left[pollutant] = createHeatmapLayer(leftData, pollutant);
    }
    if (!heatmapLayers.right[pollutant]) {
        heatmapLayers.right[pollutant] = createHeatmapLayer(rightData, pollutant);
    }
    // show the heatmap layers for the pollutant
    heatmapLayers.left[pollutant].addTo(mapLeft);
    heatmapLayers.right[pollutant].addTo(mapRight);
    // Update the legend for heatmap
    updateLegend('heatmap', pollutant);
}

// Function to update the grid layers
function updateGridmaps(pollutant) {
    console.log("Updating gridmaps for pollutant:", pollutant);

    // Remove all existing grid layers
    Object.values(gridLayers.left).forEach(layer => {
        if (layer) {
            layer.removeFrom(mapLeft);
        }
    });
    Object.values(gridLayers.right).forEach(layer => {
        if (layer) {
            layer.removeFrom(mapRight);
        }
    });

    currentPollutant = pollutant;
    // Create new grid layers if they are not in the dictionary
    if (!gridLayers.left[pollutant]) {
        gridLayers.left[pollutant] = createGridLayer(leftData, pollutant);
    }
    if (!gridLayers.right[pollutant]) {
        gridLayers.right[pollutant] = createGridLayer(rightData, pollutant);
    }
    // show the grid layers for the pollutant
    gridLayers.left[pollutant].addTo(mapLeft);
    gridLayers.right[pollutant].addTo(mapRight);
    // Update the legend for grid
    updateLegend('grid', pollutant);
}

// Get the pollutant selector element
const pollutantSelector = document.getElementById('pollutantSelector');

// Add an event listener to update the heatmaps when the pollutant is changed
// pollutants are: no2_ppb, co_ppb, so2_ppb, o3_ppb, ch4_ppb
pollutantSelector.addEventListener('change', (e) => {
    currentPollutant = e.target.value;

    if (usingHeatmap) {
        updateHeatmaps(currentPollutant);
    }
    else {
        updateGridmaps(currentPollutant);
    }
});

// Get the pollution show/hide toggle checkbox
const pollutionToggle = document.getElementById('pollutionToggle');

// Add an event listener to toggle pollution visibility
pollutionToggle.addEventListener('change', (e) => {
    const showPollution = e.target.checked;

    if (showPollution) {
        if (usingHeatmap) {
            heatmapLayers.left[currentPollutant].addTo(mapLeft);
            heatmapLayers.right[currentPollutant].addTo(mapRight);
        } else {
            gridLayers.left[currentPollutant].addTo(mapLeft);
            gridLayers.right[currentPollutant].addTo(mapRight);
        }
    } else {
        if (usingHeatmap) {
            heatmapLayers.left[currentPollutant].removeFrom(mapLeft);
            heatmapLayers.right[currentPollutant].removeFrom(mapRight);
        } else {
            gridLayers.left[currentPollutant].removeFrom(mapLeft);
            gridLayers.right[currentPollutant].removeFrom(mapRight);
        }
    }
});

// get the data from backend and create heatmaps
// Fetch both datasets
// prediction-data is for the changed scenario (city -> forest)
// unchanged-prediction-data is for the unchanged scenario
// The backend should provide these endpoints to return the data in the following format:
// {
//     data_type: "point",
//     data: [{"grid_id": num, "lat": num, "lon": num, "no2_ppb": num, "co_ppb": num, "so2_ppb": num, "o3_ppb": num, "ch4_ppb": num}]
// }
// or
// {
//     data_type: "grid",
//     data: [{"grid_id": num, "sw_lat": num, "sw_lon": num, "ne_lat": num, "ne_lon": num, "no2_ppb": num, "co_ppb": num, "so2_ppb": num, "o3_ppb": num, "ch4_ppb": num}]
// }
// or
// {
//     data_type: "grid_and_point",
//     data: [{"grid_id": num, "lat": num, "lon": num,"sw_lat": num, "sw_lon": num, "ne_lat": num, "ne_lon": num, "no2_ppb": num, "co_ppb": num, "so2_ppb": num, "o3_ppb": num, "ch4_ppb": num}]
// }
Promise.all([
    fetch('/prediction-data').then(res => res.json()),
    fetch('/unchanged-prediction-data').then(res => res.json())
]).then(([changedData, unchangedData]) => {
    console.log("Changed data datatype:", changedData.data_type);
    console.log("Unchanged data datatype:", unchangedData.data_type);
    const dataType = changedData.data_type || unchangedData.data_type; // Assume both have the same data_type
    leftData = unchangedData.data;
    rightData = changedData.data;
    console.log("dataType:", dataType);
    // Display heatmap by default if data_type is grid_and_point
    if (dataType === 'grid_and_point') {
        console.log("Data type is grid_and_point");
        toggleVisualization('heatmap');
    } else if (dataType === 'grid') {
        // Display grid by default if data_type is grid
        toggleVisualization('grid');
    } else {
        console.error("Unsupported data_type:", dataType);
    }
}).catch(error => {
    console.error('Error fetching data:', error);
});

// Synchronize the maps
mapLeft.sync(mapRight);
mapRight.sync(mapLeft);