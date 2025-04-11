// Initialize the map
let mapLeft = L.map('leftMap', {
    center: [46.119944, 14.815333], // Slovenia center
    zoom: 10
});
let mapRight = L.map('rightMap', {
    center: [46.119944, 14.815333], // Slovenia center
    zoom: 10
});



// Add a base tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapLeft);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(mapRight);

// Mock data for testing
const mockChangedData = [
    { lat: 46.119944, lon: 14.815333, value: 0.00007166031340004382 },
    { lat: 46.120944, lon: 14.816333, value: 0.00007166031340004382 },
];

const mockUnchangedData = [
    { lat: 46.121944, lon: 14.817333, value: 0.00007 },
    { lat: 46.122944, lon: 14.818333, value: 0.00008 }
];

// Convert mock data to heatmap format
const changedHeatData = mockChangedData.map(item => [item.lat, item.lon, item.value]);
const unchangedHeatData = mockUnchangedData.map(item => [item.lat, item.lon, item.value]);

// Create heatmap layers
const changedHeatmapLayer = L.heatLayer(changedHeatData, {
    radius: 25, // Radius of each point
    blur: 15,   // Blur intensity
    maxZoom: 17, // Maximum zoom level for intensity scaling
    gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }, // Color gradient
    minOpacity: 0.5, // Minimum opacity for the heatmap
    max: 0.00011085229532006554, // Maximum intensity
});

const unchangedHeatmapLayer = L.heatLayer(unchangedHeatData, {
    radius: 25, // Radius of each point
    blur: 15,   // Blur intensity
    maxZoom: 17, // Maximum zoom level for intensity scaling
    gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }, // Color gradient
    minOpacity: 0.5, // Minimum opacity for the heatmap
    max: 0.00011085229532006554, // Maximum intensity
});

// Add heatmap layers to the map
changedHeatmapLayer.addTo(mapRight);
unchangedHeatmapLayer.addTo(mapLeft);

mapLeft.sync(mapRight);
mapRight.sync(mapLeft);