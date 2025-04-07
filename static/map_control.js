//////////////////////////////
// Initialize the map
//////////////////////////////

// OpenStreetMap
let osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
        time: "2024-06-01/2025-03-30"
    });
    return layer;
}

let vegetationIdx = createWmsLayer("VEGETATION_INDEX"); //nvdi
let naturalColor = createWmsLayer("TRUE-COLOR");
let metan = createWmsLayer("METAN");
let cloudless = createWmsLayer("CLOUDLESS_NATURAL");

let baseMaps = {
    'OpenStreetMap': osm
};
let overlayMaps = {
    'Vegetation Index': vegetationIdx,
    'True Color': naturalColor,
    'Cloudless Natural': cloudless,
    'Methane': metan
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

let isDrawingMode = false; // Track whether drawing mode is enabled
let isMouseDown = false; // Track whether the mouse is pressed
let currentColor = "red"; // Default color mode

// Reset toggle states on page load
window.addEventListener('load', function () {
    // Set default state for the drawing mode toggle
    document.getElementById('drawingModeToggle').checked = false;

    // Set default state for the color mode toggles
    document.getElementById('forest').checked = false;
    document.getElementById('city').checked = true; // Default to "City"
    document.getElementById('clearColor').checked = false;

    // Reset the currentColor variable to match the default
    currentColor = "red";
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
document.getElementById('forest').addEventListener('change', function () {
    if (this.checked) currentColor = "green";
});

document.getElementById('city').addEventListener('change', function () {
    if (this.checked) currentColor = "red";
});

document.getElementById('clearColor').addEventListener('change', function () {
    if (this.checked) currentColor = "clear";
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
let coloredTiles = new Set(); // Store IDs of colored tiles

// Function to create a grid canvas over Slovenia
function createGrid(bounds, tileSizeKm) {
    let grid = [];
    const earthCircumferenceKm = 40075; // Earth's circumference in kilometers
    const latStep = tileSizeKm / 111; // 1 degree latitude is approximately 111 km
    const lngStep = tileSizeKm / (earthCircumferenceKm * Math.cos((bounds.getNorth() + bounds.getSouth()) / 2 * Math.PI / 180) / 360); // Adjust for longitude

    for (let lat = bounds.getSouth(); lat < bounds.getNorth(); lat += latStep) {
        for (let lng = bounds.getWest(); lng < bounds.getEast(); lng += lngStep) {
            let southWest = [lat, lng];
            let northEast = [lat + latStep, lng + lngStep];
            let rect = L.rectangle([southWest, northEast], {
                color: "#3388ff",
                weight: 1,
                fillOpacity: 0.2
            });

            // Add mouseover event for drawing mode
            rect.on('mouseover', function () {
                if (isDrawingMode && isMouseDown) {
                    let tileBounds = { southWest, northEast }; // Bounding box of the tile
                    let tileKey = JSON.stringify(tileBounds); // Convert to string for Set compatibility

                    if (currentColor === "clear") {
                        coloredTiles.delete(tileKey); // Remove the tile from the set
                        rect.setStyle({ fillColor: "#3388ff", fillOpacity: 0.2 }); // Reset to default
                    } else {
                        coloredTiles.add(tileKey); // Add the tile to the set
                        rect.setStyle({ fillColor: currentColor, fillOpacity: 0.5 }); // Apply the selected color
                    }
                }
            });

            // Add click event for normal mode
            rect.on('click', function () {
                if (isDrawingMode) {
                    let tileBounds = { southWest, northEast }; // Bounding box of the tile
                    let tileKey = JSON.stringify(tileBounds); // Convert to string for Set compatibility

                    if (currentColor === "clear") {
                        coloredTiles.delete(tileKey); // Remove the tile from the set
                        rect.setStyle({ fillColor: "#3388ff", fillOpacity: 0.2 }); // Reset to default
                    } else {
                        coloredTiles.add(tileKey); // Add the tile to the set
                        rect.setStyle({ fillColor: currentColor, fillOpacity: 0.5 }); // Apply the selected color
                    }
                }
            });

            rect.addTo(map);
            grid.push(rect);
        }
    }
    return grid;
}

// Define Slovenia's bounding box (approximate)
let sloveniaBounds = L.latLngBounds(
    [45.42, 13.37], // Southwest corner
    [46.88, 16.60]  // Northeast corner
);

// Create a 10x10 grid over Slovenia
createGrid(sloveniaBounds, 1);

// Add event listener to the button
document.getElementById('predictButton').addEventListener('click', function () {
    // Convert the Set of colored tiles to an array
    let data = Array.from(coloredTiles);

    // Send the data to the backend
    /*
    fetch('/process-colored-tiles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coloredTiles: data })
    })
    .then(response => response.json())
    .then(result => {
        console.log('Data sent successfully:', result);
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
    */

    // For demonstration purposes, just log the data
    console.log('Colored tiles data:', data);
});