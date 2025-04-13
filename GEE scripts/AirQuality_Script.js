
// this script is used to export air quality data from Sentinel-5P for Slovenia in a grid format
// The script is made to run in Google Earth Engine Code Editor
// The script exports the data in a CSV format with the following columns:
// grid_id, lon, lat, year, no2_ppb, co_ppb, so2_ppb, o3_ppb, ch4_ppb
// The script uses the following Sentinel-5P products:
// - COPERNICUS/S5P/OFFL/L3_NO2
// - COPERNICUS/S5P/OFFL/L3_CO
// - COPERNICUS/S5P/OFFL/L3_SO2
// - COPERNICUS/S5P/OFFL/L3_O3
// - COPERNICUS/S5P/OFFL/L3_CH4


/***************************************
 * MULTI-POLLUTANT AIR QUALITY EXPORT   *
 * With grid cell boundary coordinates  *
 ***************************************/

// Define bounding box around Slovenia
var sloveniaBbox = ee.Geometry.Rectangle([
    13.38, 45.42,  // SW corner
    16.61, 46.88    // NE corner
  ], 'EPSG:4326', false);
  
  // Create grid in UTM (EPSG:32633) for accurate 1km cells
  var grid = sloveniaBbox.transform('EPSG:32633', 1).coveringGrid('EPSG:32633', 1000)
    .map(function(feature) {
      return feature.set('grid_id', ee.Number(feature.get('system:index')));
    });
  
  // Function to get annual mean for any Sentinel-5P product
  function getAnnualMean(product, band, year) {
    return ee.ImageCollection(product)
      .select(band)
      .filterDate(ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year, 12, 31))
      .mean()
      .clip(sloveniaBbox);
  }
  
  // Get all pollutant data for year
  var year = 2021;
  var pollutants = {
    'no2': getAnnualMean('COPERNICUS/S5P/OFFL/L3_NO2', 'NO2_column_number_density', year),
    'co': getAnnualMean('COPERNICUS/S5P/OFFL/L3_CO', 'CO_column_number_density', year),
    'so2': getAnnualMean('COPERNICUS/S5P/OFFL/L3_SO2', 'SO2_column_number_density', year),
    'o3': getAnnualMean('COPERNICUS/S5P/OFFL/L3_O3', 'O3_column_number_density', year),
    'ch4': getAnnualMean('COPERNICUS/S5P/OFFL/L3_CH4', 'CH4_column_volume_mixing_ratio_dry_air', year)
  };
  
  // Combine all pollutants into one image
  var airQuality = ee.Image.cat(
    pollutants.no2.rename('no2'),
    pollutants.co.rename('co'),
    pollutants.so2.rename('so2'),
    pollutants.o3.rename('o3'),
    pollutants.ch4.rename('ch4')
  );
  
  // Extract all pollutant values to grid cells
  var gridWithData = airQuality.reduceRegions({
    collection: grid,
    reducer: ee.Reducer.mean(),
    scale: 1000,
    tileScale: 4
  }).filter(ee.Filter.notNull(
    ['no2', 'co', 'so2', 'o3', 'ch4']
  ));
  
  // Function to get bounds in WGS84
  function getCellBounds(feature) {
    // Get bounds and transform to WGS84
    var bounds = feature.geometry().transform('EPSG:4326', 1).bounds();
    
    // Get coordinates of the bounding rectangle
    var coords = ee.List(bounds.coordinates().get(0));
    
    // Get SW and NE corners
    var sw = ee.List(coords.get(0));
    var ne = ee.List(coords.get(2));
    
    return feature.set({
      'sw_lon': ee.Number(sw.get(0)),
      'sw_lat': ee.Number(sw.get(1)),
      'ne_lon': ee.Number(ne.get(0)),
      'ne_lat': ee.Number(ne.get(1))
    });
  }
  
  // Function to add all required properties
  function addProperties(feature) {
    // Get centroid
    var utmCentroid = feature.geometry().centroid(1);
    var wgs84Centroid = utmCentroid.transform('EPSG:4326', 1);
    
    // First add bounds
    var withBounds = getCellBounds(feature);
    
    // Get all properties as a dictionary
    var props = feature.toDictionary();
    
    // Then add all other properties with proper unit conversion
    return withBounds.set({
      'lon': wgs84Centroid.coordinates().get(0),
      'lat': wgs84Centroid.coordinates().get(1),
      'year': year,
      'no2_ppb': props.get('no2'),
      'co_ppb': ee.Number(props.get('co')).multiply(1e9), // Proper conversion
      'so2_ppb': props.get('so2'),
      'o3_ppb': props.get('o3'),
      'ch4_ppb': props.get('ch4')
    });
  }
  
  // Prepare export data
  var exportData = gridWithData.map(addProperties, true);
  
  // =================================================================
  // EXPORT DATA WITH BOUNDARY COORDINATES
  // =================================================================
  Export.table.toDrive({
    collection: exportData,
    description: 'Slovenia_AirQuality_1kmGrid_' + year + '_withBounds',
    fileFormat: 'CSV',
    selectors: [
      'grid_id', 
      'lon', 'lat',         // Center coordinates
      'sw_lon', 'sw_lat',   // Southwest corner
      'ne_lon', 'ne_lat',   // Northeast corner
      'year',
      'no2_ppb', 'co_ppb', 'so2_ppb', 'o3_ppb', 'ch4_ppb'
    ],
  });
  
  // Verification
  print('First feature with bounds', exportData.first());
  print('Total cells with data', exportData.size());
  
  