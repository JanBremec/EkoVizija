from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
import geopandas as gpd  # corrected from 'gdp' to 'gpd'
from joblib import load

app = Flask(__name__)

# LOADING DATA ===================================
df_data = pd.read_csv('all_data.csv')
df_data['lon'] = df_data['lon'].astype('float')
df_data['lat'] = df_data['lat'].astype('float')

# POLLUTANTS =====================================
air_pollutants = ['no2_ppb', 'co_ppb', 'so2_ppb', 'o3_ppb', 'ch4_ppb']

# FEATURES FOR THE MODELS ========================
features = [
    'road_length_m', 'population_sum', 'distance_to_factory',
    'class_1_percent', 'class_2_percent', 'class_3_percent',
    'class_4_percent', 'class_5_percent', 'class_6_percent',
    'class_7_percent', 'class_8_percent', 'class_9_percent',
    'class_10_percent', 'class_11_percent'
]
# LOADING MODELS ===================================
dict_models = {}
for pollutant in air_pollutants:
    model_name = "model_" + pollutant + ".pkl"
    #with open(model_name, 'rb') as f:
    #    dict_models[pollutant] = pickle.load(f)
    dict_models[pollutant] = load(model_name)

# PREDICT FLASK - to be reworked with proper API ===
@app.route('/predict', methods=['GET'])
def predict():
    
    # COORDS FROM REQUEST (each grid square has unique coords) - lat and lon gotta be inputs 
    lon_req = 14.737982764559842
    lat_req = 45.41872014470829

    # LOADING DATA for coords
    row_data = df_data[(df_data['lat'] == lat_req) & (df_data['lon'] == lon_req)]
    if row_data.empty:
        return jsonify({'error': 'No matching location found'}), 404
    row_data = row_data.iloc[[0]]
    row_data = row_data[features]

    # PREDICT VALUES 
    predictions = {}
    for pollutant in air_pollutants:
        model = dict_models[pollutant]
        prediction = model.predict(row_data)[0]  
        predictions[pollutant] = prediction
    return jsonify(predictions)

if __name__ == '__main__':
    app.run(debug=True)
