#!/bin/bash
#SBATCH --job-name=lulc_extract_DigiVizija
#SBATCH --output=lulc_processing.out
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --time=04:00:00
#SBATCH --export=ALL

# Activate Python env
module load Python
source /d/hpc/home/hackathon17/DigiVizija_env/bin/activate
cd land_data
# Run the script for each year
srun python3 lulc_zonal_stats.py --year 2018
srun python3 lulc_zonal_stats.py --year 2019
srun python3 lulc_zonal_stats.py --year 2020
srun python3 lulc_zonal_stats.py --year 2021
srun python3 lulc_zonal_stats.py --year 2022
srun python3 lulc_zonal_stats.py --year 2023