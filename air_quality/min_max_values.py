import os
import pandas as pd

# Directory containing the CSV files
directory = "./air_quality"  # Replace with the path to your directory containing the CSV files

# Initialize a dictionary to store min and max values for each pollutant (across all tiles and years, save the grid_id and year)
pollutant_stats = {}

# Initialize a dictionary to check grid_id consistency
grid_id_consistency = {}

# Initialize a list to store inconsistent grid_ids
inconsistent_grid_ids = []

# differences between pollutant value for each pollutant on the same grid_id
# Initialize a dictionary to store max and min pollutant value for each grid_id
pollutant_by_grid_id = {}


# Loop through all files in the directory
for filename in os.listdir(directory):
    print(f"Checking file: {filename}")
    if filename.startswith("Slovenia_AirQuality_1kmGrid_") and filename.endswith(".csv"):
        filepath = os.path.join(directory, filename)
        print(f"Processing file: {filename}")
        
        # Read the CSV file into a DataFrame
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            continue

        # Extract the year from "year" column
        if "year" in df.columns:
            year = df["year"].iloc[0]
        else:
            print(f"No 'year' column found in {filename}")
            continue
        
        # Check grid_id consistency and save min and max values of each pollutant for each grid_id
        if "grid_id" in df.columns and {"lon", "lat", "sw_lon", "sw_lat", "ne_lon", "ne_lat"}.issubset(df.columns):
            for _, row in df.iterrows():
                grid_id = row["grid_id"]
                lon, lat = row["lon"], row["lat"]
                sw_lon, sw_lat = row["sw_lon"], row["sw_lat"]
                ne_lon, ne_lat = row["ne_lon"], row["ne_lat"]

                if grid_id not in grid_id_consistency:
                    grid_id_consistency[grid_id] = {
                        "lon": lon,
                        "lat": lat,
                        "sw_lon": sw_lon,
                        "sw_lat": sw_lat,
                        "ne_lon": ne_lon,
                        "ne_lat": ne_lat
                    }
                else:
                    # Check if the values are consistent
                    if (grid_id_consistency[grid_id]["lon"] != lon or
                        grid_id_consistency[grid_id]["lat"] != lat or
                        grid_id_consistency[grid_id]["sw_lon"] != sw_lon or
                        grid_id_consistency[grid_id]["sw_lat"] != sw_lat or
                        grid_id_consistency[grid_id]["ne_lon"] != ne_lon or
                        grid_id_consistency[grid_id]["ne_lat"] != ne_lat):
                        print(f"Inconsistent values for grid_id {grid_id} in file {filename}")
                        inconsistent_grid_ids.append(grid_id)
                # check now the max and min values for each pollutant
                pollutant_col_names = df.columns.difference(["year", "grid_id", "lon", "lat", "sw_lon", "sw_lat", "ne_lon", "ne_lat"])
                for col in pollutant_col_names:
                    if grid_id not in pollutant_by_grid_id:
                        pollutant_by_grid_id[grid_id] = {}
                    if col not in pollutant_by_grid_id[grid_id]:
                        pollutant_by_grid_id[grid_id][col] = {
                            "min": row[col],
                            "max": row[col],
                            "min_year": year,
                            "max_year": year
                        }
                    else:
                        if row[col] < pollutant_by_grid_id[grid_id][col]["min"]:
                            pollutant_by_grid_id[grid_id][col]["min"] = row[col]
                            pollutant_by_grid_id[grid_id][col]["min_year"] = year
                        if row[col] > pollutant_by_grid_id[grid_id][col]["max"]:
                            pollutant_by_grid_id[grid_id][col]["max"] = row[col]
                            pollutant_by_grid_id[grid_id][col]["max_year"] = year
        
        # Check for max and min in pollutant values across all grid_id across years
        # Loop through each column (assuming pollutant data is in numeric columns)
        for column in df.columns:
            if column not in ["year","grid_id", "lon", "lat", "sw_lon", "sw_lat", "ne_lon", "ne_lat"]:  # Replace with non-pollutant columns to exclude
                try:
                    # Convert column to numeric, ignoring non-numeric values
                    df[column] = pd.to_numeric(df[column], errors='coerce')
                    
                    # Update min and max values for the pollutant
                    if column not in pollutant_stats:
                        pollutant_stats[column] = {
                            "min": df[column].min(),
                            "max": df[column].max(),
                            "min_year": year,
                            "max_year": year,
                            "min_grid_id": df.loc[df[column].idxmin(), "grid_id"],
                            "max_grid_id": df.loc[df[column].idxmax(), "grid_id"]
                        }
                    else:
                        if df[column].min() < pollutant_stats[column]["min"]:
                            pollutant_stats[column]["min"] = df[column].min()
                            pollutant_stats[column]["min_year"] = year
                        if df[column].max() > pollutant_stats[column]["max"]:
                            pollutant_stats[column]["max"] = df[column].max()
                            pollutant_stats[column]["max_year"] = year
                    
                except Exception as e:
                    print(f"Error processing column {column} in {filename}: {e}")

# Print the results
print("Grid ID Consistency Check:")
if inconsistent_grid_ids:
    print(f"Inconsistent grid_ids found: {set(inconsistent_grid_ids)}")
else:
    print("All grid_ids are consistent across files.")

print("\nPollutant Min and Max Values:")
for pollutant, stats in pollutant_stats.items():
    print(f"{pollutant}: Min = {stats['min']} (Year: {stats['min_year']}, Grid ID: {stats['min_grid_id']}), Max = {stats['max']} (Year: {stats['max_year']}, Grid ID: {stats['max_grid_id']})")

# Find on which grid_id is the biggest difference between max and min values for each pollutant
max_diff_pollutant_on_same_grid = {}
for grid_id, pollutants in pollutant_by_grid_id.items():
    for pollutant, values in pollutants.items():
        diff = values["max"] - values["min"]
        if pollutant not in max_diff_pollutant_on_same_grid:
            max_diff_pollutant_on_same_grid[pollutant] = {
                "grid_id": grid_id,
                "diff": diff,
                "min": values["min"],
                "max": values["max"],
                "min_year": values["min_year"],
                "max_year": values["max_year"]
            }
        else:
            if diff > max_diff_pollutant_on_same_grid[pollutant]["diff"]:
                max_diff_pollutant_on_same_grid[pollutant] = {
                    "grid_id": grid_id,
                    "diff": diff,
                    "min": values["min"],
                    "max": values["max"],
                    "min_year": values["min_year"],
                    "max_year": values["max_year"]
                }
# Print the results
print("\nMax Difference in Pollutant Values on Same Grid ID:")
for pollutant, details in max_diff_pollutant_on_same_grid.items():
    print(f"{pollutant}: Grid ID = {details['grid_id']}, Difference = {details['diff']}, Min = {details['min']} (Year: {details['min_year']}), Max = {details['max']} (Year: {details['max_year']})")