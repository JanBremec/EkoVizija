import rasterio
from rasterio.windows import Window
import numpy as np
import pandas as pd
from scipy.stats import mode
import argparse

# Parse SLURM job args
parser = argparse.ArgumentParser()
parser.add_argument("--job_id", type=int, required=True)
parser.add_argument("--total_jobs", type=int, required=True)
parser.add_argument("--year", type=int, required=True, help="Year for LULC raster file")
args = parser.parse_args()

# Load your grid CSV (with NE/SW corners)
grid_df = pd.read_csv("slovenia_grid.csv")

# Use the year argument
year = args.year

# Open LULC raster
lulc_raster = rasterio.open(f"33T_{year}0101-{year+1}0101.tif")

def get_lulc_mode(row):
    """Compute mode of LULC in a grid square."""
    # Get pixel coordinates from lat/lon
    sw_x, sw_y = lulc_raster.index(row["sw_lon"], row["sw_lat"])
    ne_x, ne_y = lulc_raster.index(row["ne_lon"], row["ne_lat"])
    
    # Read raster window
    window = Window.from_slices(
        rows=(ne_y, sw_y),  # Rasterio uses (min_row, max_row)
        cols=(sw_x, ne_x)
    )
    data = lulc_raster.read(1, window=window)
    
    # Compute mode (excluding NoData)
    valid_data = data[data != 0]
    if len(valid_data) == 0:
        return 0  # NoData
    return mode(valid_data, keepdims=False).mode

# Split grid into chunks
chunk_size = len(grid_df) // args.total_jobs
start = (args.job_id - 1) * chunk_size
end = args.job_id * chunk_size if args.job_id < args.total_jobs else len(grid_df)
subset_df = grid_df.iloc[start:end]

# Process subset
subset_df["LULC_mode"] = subset_df.apply(get_lulc_mode, axis=1)
subset_df.to_csv(f"results/{year}-{year+1}_lulc_chunk_{args.job_id}.csv", index=False)