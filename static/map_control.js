//////////////////////////////
// Initialize the map
//////////////////////////////

// OpenStreetMap
let osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

let darkOSM = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    // pane: 'tilePane' // Use the custom tile pane
});

// select the layers we want to visualize
// https://sh.dataspace.copernicus.eu/ogc/wms/<INSTANCE-ID>

// Sentinel Hub WMS service
// tiles generated using EPSG:3857 projection - Leaflet takes care of that
let baseUrl = "https://sh.dataspace.copernicus.eu/ogc/wms/d10c052b-1d1b-4565-ac6f-bef9135417f2";

function createWmsLayer(layerId) {

    const layer = L.tileLayer.wms(baseUrl, {
        tileSize: 512,
        attribution: '&copy; <a href="https://dataspace.copernicus.eu/" target="_blank">Copernicus Data Space Ecosystem</a>',
        maxcc: 20,
        minZoom: 6,
        maxZoom: 16,
        layers: layerId,
        transparent: true,
        format: 'image/png',
        // time: "2024-06-01/2025-03-30"
    });
    return layer;
}

let vegetationIdx = createWmsLayer("VEGETATION_INDEX"); //nvdi
// let naturalColor = createWmsLayer("TRUE-COLOR");
// let metan = createWmsLayer("METAN");
let cloudless = createWmsLayer("CLOUDLESS_NATURAL");

let baseMaps = {
    'OpenStreetMap': osm
};
let overlayMaps = {
    'Vegetation Index': vegetationIdx,
    // 'True Color': naturalColor,
    'Cloudless Natural': cloudless,
    // 'Methane': metan
}

let map = L.map('copernicusMap', {
    center: [46.119944, 14.815333], // lat/lng in EPSG:4326
    zoom: 12,
    layers: [osm]
});

L.control.layers(baseMaps, overlayMaps).addTo(map);


////////////////////////////////////
// Create tile grid to draw
////////////////////////////////////

var elToColor = {
    "forest": "green",
    "city": "red",
    "clearColor": "#3388ff",
    "highway": "grey",
    "crops": "yellow",
    "factory": "purple",
};


let isDrawingMode = false; // Track whether drawing mode is enabled
let isMouseDown = false; // Track whether the mouse is pressed
let currentColor = elToColor["city"]; // Default color mode

// Reset toggle states on page load
window.addEventListener('load', function () {
    // Set default state for the drawing mode toggle
    document.getElementById('drawingModeToggle').checked = false;

    // Set default state for the color mode toggles
    document.getElementById('forest').checked = false;
    document.getElementById('city').checked = true; // Default to "City"
    document.getElementById('highway').checked = false;
    document.getElementById('crops').checked = false;
    document.getElementById('factory').checked = false;
    document.getElementById('clearColor').checked = false;


    // Reset the currentColor variable to match the default
    currentColor = elToColor["city"];

    showHideGridToggle.checked = true; // Ensure the show checkbox is checked
    map.addLayer(gridLayer); // Ensure the grid is visible
});

// Add event listener for the drawing mode toggle
document.getElementById('drawingModeToggle').addEventListener('change', function (event) {
    isDrawingMode = event.target.checked;
    if (isDrawingMode) {
        map.dragging.disable(); // Disable map dragging
    } else {
        map.dragging.enable(); // Re-enable map dragging
    }
});

// Add event listeners for color mode toggles
Object.keys(elToColor).forEach(colorKey => {
    const toggleElement = document.getElementById(colorKey);
    if (toggleElement) {
        toggleElement.addEventListener('change', function () {
            if (this.checked) currentColor = elToColor[colorKey];
        });
    }
});

// Add event listeners for mouse events on the map
map.on('mousedown', function () {
    if (isDrawingMode) {
        isMouseDown = true;
    }
});

map.on('mouseup', function () {
    if (isDrawingMode) {
        isMouseDown = false;
    }
});

// Colored tiles tracking
let coloredTiles = new Map(); // Store tile bounds (southWest, northEast) as keys and color as values

// Create a layer group for the grid
let gridLayer = L.layerGroup(); // This will hold all the rectangles

//////////////////////////////
// Fetch and Render Predefined Grid
//////////////////////////////

// Function to fetch grid data from a backend or static file
async function fetchGridData() {
    try {
        // Fetch the grid data (replace with your backend API or static file URL)
        console.log("fetching grid data...")
        const response = await fetch('/grid-data'); // Example: JSON file hosted as a static resource
        if (!response.ok) {
            throw new Error('Failed to fetch grid data');
        }
        console.log("grid data fetch success");
        const gridData = await response.json();
        return gridData;
    } catch (error) {
        console.error('Error fetching grid data:', error);
        return [];
    }
}

// Function to render the grid using predefined coordinates
async function renderPredefinedGrid() {
    const gridData = await fetchGridData();
    console.log('Grid data:', gridData);
    if (!gridData || gridData.length === 0) {
        console.error('No grid data available');
        return;
    }
    gridData.forEach(cell => {
        const southWest = [cell.sw_lat, cell.sw_lon];
        const northEast = [cell.ne_lat, cell.ne_lon];
        const rect = L.rectangle([southWest, northEast], {
            color: elToColor["clearColor"],
            weight: 1,
            fillOpacity: 0.2
        });

        // Add mouseover event for drawing mode
        rect.on('mouseover', function () {
            if (isDrawingMode && isMouseDown) {
                let tileKey = JSON.stringify({ southWest, northEast }); // Use tile bounds as the key

                if (currentColor === "clear") {
                    coloredTiles.delete(tileKey); // Remove the tile from the Map
                    rect.setStyle({ fillColor: elToColor["clearColor"], fillOpacity: 0.2 }); // Reset to default
                } else {
                    coloredTiles.set(tileKey, currentColor); // Add or update the tile with the selected color
                    rect.setStyle({ fillColor: currentColor, fillOpacity: 0.5 }); // Apply the selected color
                }
            }
        });

        // Add click event for drawing mode
        rect.on('click', function () {
            if (isDrawingMode) {
                console.log('Clicked on tile:', southWest, northEast);
                console.log('Current color:', currentColor);
                let tileKey = JSON.stringify({ southWest, northEast }); // Use tile bounds as the key

                if (currentColor === "clear") {
                    coloredTiles.delete(tileKey); // Remove the tile from the Map
                    console.log('Removing tile:', tileKey);
                    rect.setStyle({ fillColor: elToColor["clearColor"], fillOpacity: 0.2 }); // Reset to default
                } else {
                    coloredTiles.set(tileKey, currentColor); // Add or update the tile with the selected color
                    rect.setStyle({ fillColor: currentColor, fillOpacity: 0.5 }); // Apply the selected color
                }
            }
        });

        // Add the rectangle to the layer group
        gridLayer.addLayer(rect);
    });

    // Add the grid layer to the map
    gridLayer.addTo(map);
    // map.removeLayer(gridLayer); // Hide the grid by default
}

// Call the function to render the grid
renderPredefinedGrid();

// Drawing mode lets draw and blocks moving the map
document.getElementById('drawingModeToggle').addEventListener('change', function (event) {
    isDrawingMode = event.target.checked;

    if (isDrawingMode) {
        // map.addLayer(gridLayer); // Show the grid
        map.dragging.disable(); // Disable map dragging
    } else {
        // map.removeLayer(gridLayer); // Hide the grid
        map.dragging.enable(); // Re-enable map dragging
    }
});

//show hide grid toggle
document.getElementById('showHideGridToggle').addEventListener('change', function (event) {
    if (event.target.checked) {
        map.addLayer(gridLayer); // Show the grid
    } else {
        map.removeLayer(gridLayer); // Hide the grid
    }
});

//button for resetting the grid
document.getElementById('clearButton').addEventListener('click', function () {
    console.log('Resetting grid...');
    coloredTiles.clear(); // Clear the Map of colored tiles
    gridLayer.eachLayer(function (layer) {
        layer.setStyle({ fillColor: elToColor["clearColor"], fillOpacity: 0.2 }); // Reset all rectangles to default style
    });
    console.log('Grid reset successfully.');
});
// Add event listener to the predict button
document.getElementById('predictButton').addEventListener('click', function () {
    const predictButton = document.getElementById('predictButton');
    const spinner = document.createElement('span'); // Create a spinner element
    spinner.className = 'spinner'; // Add the custom spinner class

    // Disable the button and add the spinner
    predictButton.disabled = true;
    predictButton.textContent = 'Trenutek da premislim... ';
    predictButton.appendChild(spinner);

    // Prepare data to send to the backend
    const data = Array.from(coloredTiles.entries()).map(([key, color]) => {
        const { southWest, northEast } = JSON.parse(key);
        return {
            southWest: southWest,
            northEast: northEast,
            color: color
        };
    });

    // Send the data to the backend
    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send prediction data');
            }
            // Redirect to prediction.html after successful submission
            window.location.href = '/prediction';
        })
        .catch(error => {
            console.error('Error sending data:', error);
            alert('Error sending data.');
        })
        .finally(() => {
            // Re-enable the button and remove the spinner in case of an error
            predictButton.disabled = false;
            predictButton.textContent = 'Napovej';
        });
});

// Add a dark mode toggle button
const themeToggleButton = document.querySelector('.theme-toggle');
// Determine the initial mode based on the button text
let isDarkMode = themeToggleButton.textContent === 'Light Mode';

// Add event listener for the dark mode toggle
themeToggleButton.addEventListener('click', () => {
    isDarkMode = !isDarkMode;

    // Remove the current tile layer
    map.eachLayer(layer => {
        if (layer === osm || layer === darkOSM) {
            map.removeLayer(layer);
        }
    });

    // Add the appropriate tile layer based on the mode
    const tileLayer = isDarkMode ? darkOSM : osm;
    tileLayer.addTo(map);

    // Update the button text
    themeToggleButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
});