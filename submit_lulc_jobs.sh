#!/bin/bash
#SBATCH --job-name=lulc_extract_DigiVizija
#SBATCH --output=logs/lulc_%A_%a.out
#SBATCH --array=1-100  # Split into 100 jobs
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --time=01:00:00
#SBATCH --export=ALL

# Activate Python env
module load Python
source /d/hpc/home/hackathon17/DigiVizija_env/bin/activate
cd land_data
# Run script for a subset of grid cells
srun python3 lulc_zonal_stats.py --job_id $SLURM_ARRAY_TASK_ID --total_jobs 100 --year 2018