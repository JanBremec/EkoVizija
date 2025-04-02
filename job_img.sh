#!/bin/bash
#SBATCH --job-name=DigiVizijaUcenjeTest
#SBATCH --output=DigiVizijaUcenjeTest.out
#SBATCH --partition=gpu
#SBATCH --ntasks=1
#SBATCH --nodes=1
#SBATCH --time=4-00:00:00
#SBATCH --gpus=1
#SBATCH --export=ALL

module load Python
source /d/hpc/home/hackathon17/DigiVizija_env/bin/activate
cd images
srun python3 image_fetcher.py

