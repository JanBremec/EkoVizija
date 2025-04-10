import rasterio
from rasterio.windows import Window
from rasterio.crs import CRS
from rasterio.warp import transform
import numpy as np
import pandas as pd
from scipy.stats import mode
import matplotlib.pyplot as plt

"""
1	Water	Areas where water was predominantly present throughout the year; may not cover areas with sporadic or ephemeral water; contains little to no sparse vegetation, no rock outcrop nor built up features like docks; examples: rivers, ponds, lakes, oceans, flooded salt plains.
2	Trees	Any significant clustering of tall (~15 feet or higher) dense vegetation, typically with a closed or dense canopy; examples: wooded vegetation,  clusters of dense tall vegetation within savannas, plantations, swamp or mangroves (dense/tall vegetation with ephemeral water or canopy too thick to detect water underneath).
4	Flooded vegetation	Areas of any type of vegetation with obvious intermixing of water throughout a majority of the year; seasonally flooded area that is a mix of grass/shrub/trees/bare ground; examples: flooded mangroves, emergent vegetation, rice paddies and other heavily irrigated and inundated agriculture.
5	Crops	Human planted/plotted cereals, grasses, and crops not at tree height; examples: corn, wheat, soy, fallow plots of structured land.
7	Built Area	Human made structures; major road and rail networks; large homogenous impervious surfaces including parking structures, office buildings and residential housing; examples: houses, dense villages / towns / cities, paved roads, asphalt.
8	Bare ground	Areas of rock or soil with very sparse to no vegetation for the entire year; large areas of sand and deserts with no to little vegetation; examples: exposed rock or soil, desert and sand dunes, dry salt flats/pans, dried lake beds, mines.
9	Snow/Ice	Large homogenous areas of permanent snow or ice, typically only in mountain areas or highest latitudes; examples: glaciers, permanent snowpack, snow fields.
10	Clouds	No land cover information due to persistent cloud cover.
11	Rangeland	Open areas covered in homogenous grasses with little to no taller vegetation; wild cereals and grasses with no obvious human plotting (i.e., not a plotted field); examples: natural meadows and fields with sparse to no tree cover, open savanna with few to no trees, parks/golf courses/lawns, pastures. Mix of small clusters of plants or single plants dispersed on a landscape that shows exposed soil or rock; scrub-filled clearings within dense forests that are clearly not taller than trees; examples: moderate to sparse cover of bushes, shrubs and tufts of grass, savannas with very sparse grasses, trees or other plants.
"""

# Load your grid CSV (with NE/SW corners)
grid_df = pd.read_csv("../air_quality/Slovenia_Grid_Coordinates_1km.csv")

# Select 3 grid squares for testing
test_grid = grid_df.head(3)

# Open LULC raster
year = 2020
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

def get_lulc_mode_and_image(row, index):
    """Compute mode of LULC in a grid square, save an image of the raster window, and calculate class percentages."""
    # Reproject SW and NE coordinates to match the raster CRS
    sw_x, sw_y = reproject_coordinates(row["sw_lon"], row["sw_lat"], CRS.from_epsg(4326), raster_crs)
    ne_x, ne_y = reproject_coordinates(row["ne_lon"], row["ne_lat"], CRS.from_epsg(4326), raster_crs)
    print(f"Reprojected SW: ({sw_x}, {sw_y}), NE: ({ne_x}, {ne_y})")

    # Get pixel coordinates from reprojected coordinates
    sw_col, sw_row = lulc_raster.index(sw_x, sw_y)
    ne_col, ne_row = lulc_raster.index(ne_x, ne_y)
    print(f"Pixel Coordinates SW: (col={sw_col}, row={sw_row}), NE: (col={ne_col}, row={ne_row})")

    # Ensure correct order of rows and columns
    min_row, max_row = min(sw_row, ne_row), max(sw_row, ne_row)
    min_col, max_col = min(sw_col, ne_col), max(sw_col, ne_col)

    # Read raster window
    window = Window.from_slices(
        rows=(min_row, max_row),  # Ensure correct row order
        cols=(min_col, max_col)  # Ensure correct column order
    )
    print(f"Raster Window: {window}")
    
    data = lulc_raster.read(1, window=window)

    # Check if the window contains valid data
    print(f"Data Values in Window: {np.unique(data)}")
    if data.size == 0 or np.all(data == 0):  # Assuming 0 represents NoData
        print(f"Window contains only NoData for grid square {index + 1}")
        return np.nan, {}

    # Save the raster window as an image
    plt.imshow(data, cmap='viridis')
    plt.colorbar(label="LULC Value")
    plt.title(f"Grid Square {index + 1}")
    plt.savefig(f"grid_square_{index + 1}.png")
    plt.close()

    # Compute mode (excluding NoData)
    valid_data = data[data != 0]
    if len(valid_data) == 0:
        return 0, {}  # NoData

    # Calculate mode
    mode_value = mode(valid_data, keepdims=False).mode

    # Calculate percentage of each class
    unique, counts = np.unique(valid_data, return_counts=True)
    percentages = {int(k): round(v / len(valid_data) * 100, 2) for k, v in zip(unique, counts)}
    print(f"Class Percentages for Grid Square {index + 1}: {percentages}")

    return mode_value, percentages

# Process the 3 grid squares
results = test_grid.apply(
    lambda row: get_lulc_mode_and_image(row, test_grid.index.get_loc(row.name)), axis=1
)

# Extract mode and percentages into separate columns
test_grid["LULC_mode"] = results.apply(lambda x: x[0])

# Initialize columns for each class (1 to 11) with 0
for class_id in range(1, 12):
    test_grid[f"class_{class_id}_percent"] = 0.0

# Populate class percentage columns
for i, percentages in enumerate(results.apply(lambda x: x[1])):
    for class_id, percent in percentages.items():
        test_grid.loc[i, f"class_{class_id}_percent"] = percent

# Save the results to a CSV
test_grid.to_csv("test_lulc_results.csv", index=False)

print("Test completed. Check the output images and 'test_lulc_results.csv' for results.")