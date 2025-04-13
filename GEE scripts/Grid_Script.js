// This script was used in GEE to export the grid that was use for making the air quality maps from Sentinel 5 data

// ----------------------------------------------------------
// Extract and Visualize Sentinel-5P Grid (Corrected)
// ----------------------------------------------------------

// 1. Define region (Slovenia + buffer)
var slovenia = ee.FeatureCollection("FAO/GAUL/2015/level0")
  .filter(ee.Filter.eq('ADM0_NAME', 'Slovenia'));
var region = slovenia.geometry().buffer(50000); // 50 km buffer


// CORRECTED Sentinel-5P Grid Visualization
// Displays the native 7km×7km measurement grid

// 1. Load Sentinel-5P data
var s5p = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')  // Using methane for example
  .filterDate('2023-01-01', '2023-12-31')
  .filterBounds(region);  // Your area of interest

// 2. Get native grid footprints
var footprints = s5p.map(function(image) {
  // Get the exact footprint geometry
  var footprint = image.geometry(); 
  // Simplify to reduce vertices (helps visualization)
  return ee.Feature(footprint.simplify(100), {
    'date': image.date().format('YYYY-MM-dd'),
    'methane': image.select('CH4_column_volume_mixing_ratio_dry_air')
  });
});

// 3. Create distinct grid cells (remove overlaps)
var uniqueGrid = ee.FeatureCollection(footprints).distinct('.geo');

// 4. Visualize with proper styling
Map.addLayer(uniqueGrid.style({
  color: 'red',
  width: 2,
  fillColor: '00000000'  // Transparent fill
}), {}, 'Sentinel-5P Native Grid (7km)');

// 5. Add methane values as labels (optional)
var withValues = uniqueGrid.map(function(feat) {
  var value = feat.getNumber('methane');
  return feat.set('label', ee.String('CH4: ').cat(value.format('%.1f')));
});

Map.addLayer(withValues.draw({
  color: 'black',
  pointSize: 3,
  fontSize: 12,
  textProperty: 'label'
}), {}, 'Methane Values');

print('Number of grid cells:', uniqueGrid.size());
print('Sample grid cell:', ee.Feature(uniqueGrid.first()));