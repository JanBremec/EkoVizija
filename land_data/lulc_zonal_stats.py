import argparse
import rasterio
from rasterio.windows import Window
from rasterio.crs import CRS
from rasterio.warp import transform
import numpy as np
import pandas as pd
from scipy.stats import mode
import matplotlib.pyplot as plt

"""
Land cover classes:
1  Water
2  Trees
4  Flooded vegetation
5  Crops
7  Built Area
8  Bare ground
9  Snow/Ice
10 Clouds
11 Rangeland
"""

# Parse command-line arguments
parser = argparse.ArgumentParser(description="Process LULC raster data for grid squares.")
parser.add_argument("--year", type=int, required=True, help="Year of the LULC raster file (e.g., 2020).")
args = parser.parse_args()

# Load the grid CSV (with NE/SW corners)
grid_df = pd.read_csv("../air_quality/Slovenia_Grid_Coordinates_1km.csv")

# Open the LULC raster
year = args.year
lulc_raster = rasterio.open(f"33T_{year}0101-{year+1}0101.tif")
print("LULC Raster Bounds:")
print(lulc_raster.bounds)

# Get the CRS of the raster
raster_crs = lulc_raster.crs
print(f"Raster CRS: {raster_crs}")

def reproject_coordinates(lon, lat, src_crs, dst_crs):
    """Reproject coordinates from one CRS to another."""
    x, y = transform(src_crs, dst_crs, [lon], [lat])
    return x[0], y[0]

def process_grid_square(row):
    """Process a single grid square to compute LULC mode and class percentages."""
    # Reproject SW and NE coordinates to match the raster CRS
    sw_x, sw_y = reproject_coordinates(row["sw_lon"], row["sw_lat"], CRS.from_epsg(4326), raster_crs)
    ne_x, ne_y = reproject_coordinates(row["ne_lon"], row["ne_lat"], CRS.from_epsg(4326), raster_crs)

    # Get pixel coordinates from reprojected coordinates
    sw_col, sw_row = lulc_raster.index(sw_x, sw_y)
    ne_col, ne_row = lulc_raster.index(ne_x, ne_y)

    # Ensure correct order of rows and columns
    min_row, max_row = min(sw_row, ne_row), max(sw_row, ne_row)
    min_col, max_col = min(sw_col, ne_col), max(sw_col, ne_col)

    # Read raster window
    window = Window.from_slices(
        rows=(min_row, max_row),
        cols=(min_col, max_col)
    )
    data = lulc_raster.read(1, window=window)

    # Exclude NoData values (assumed to be 0)
    valid_data = data[data != 0]
    if len(valid_data) == 0:
        return 0, {class_id: 0.0 for class_id in range(1, 12)}  # NoData

    # Calculate mode
    mode_value = mode(valid_data, keepdims=False).mode

    # Calculate percentage of each class
    unique, counts = np.unique(valid_data, return_counts=True)
    percentages = {int(k): round(v / len(valid_data) * 100, 2) for k, v in zip(unique, counts)}

    # Ensure all classes (1 to 11) are present in the percentages dictionary
    for class_id in range(1, 12):
        if class_id not in percentages:
            percentages[class_id] = 0.0

    return mode_value, percentages

# Process all grid squares
results = grid_df.apply(process_grid_square, axis=1)

# Extract mode and percentages into separate columns
grid_df["LULC_mode"] = results.apply(lambda x: x[0])
for class_id in range(1, 12):
    grid_df[f"class_{class_id}_percent"] = results.apply(lambda x: x[1][class_id])

# Save the results to a CSV
grid_df.to_csv("lulc_results.csv", index=False)

print("Processing completed. Results saved to 'lulc_results.csv'.")