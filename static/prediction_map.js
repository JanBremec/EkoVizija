// Define a color scale for air quality values (e.g., NO2 levels)
function getColor(value) {
    return value > 50 ? '#800026' :
        value > 40 ? '#BD0026' :
            value > 30 ? '#E31A1C' :
                value > 20 ? '#FC4E2A' :
                    value > 10 ? '#FD8D3C' :
                        value > 5 ? '#FEB24C' :
                            '#FFEDA0';
}

// Initialize the map
let map = L.map('predictionMap', {
    center: [46.119944, 14.815333], // Adjust to your region
    zoom: 12
});

// Add a base tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Create a layer group for the grid
let predictLayerNO2 = L.layerGroup(); // This will hold all the rectangles
let oldLayerNO2 = L.layerGroup(); // This will hold the prediction if nothing is done

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

        // Iterate through the layers dictionary
        Object.entries(layers).forEach(([key, layer]) => {
            const value = cell[key]; // Get the value for the current key (e.g., no2_ppb, co_ppb)

            const rect = L.rectangle(bounds, {
                color: '#000', // Border color
                weight: 1,
                fillColor: getColor(value), // Fill color based on the value
                fillOpacity: 0.5
            });

            // Add the rectangle to the corresponding layer
            layer.addLayer(rect);
        });
    });

    // Add all layers to the map
    Object.values(layers).forEach(layer => layer.addTo(map));
}

// Render the heatmap with air quality values
async function renderPredictionHeatmap(predicitonData, layers) {
    
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
    if (predictionData.data_type === "grid") {
        console.log("got grid data");
        renderPredictionGrid(predictionData.data, predictLayers);
        renderPredictionGrid(unchangedPredictionData.data, unchangedLayers);
    } else if (predictionData.data_type === "point") {
        renderPredictionHeatmap(predictionData.data, predictLayers);
        renderPredictionHeatmap(unchangedPredictionData.data, unchangedLayers);
    }

    L.control.sideBySide(oldLayerNO2, predictLayerNO2).addTo(map);
})();