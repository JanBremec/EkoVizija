#!/bin/bash
#SBATCH --job-name=DigiVizijaUcenjeTest
#SBATCH --output=DigiVizijaUcenjeTest.out
#SBATCH --partition=gpu
#SBATCH --ntasks=1
#SBATCH --nodes=1
#SBATCH --time=4-00:00:00
#SBATCH --gpus=1

pip install -r requirements.txt
srun python3 ./images/image_fetcher.py
srun python3 ./models/model1.py
