import uuid
from flask import Flask, render_template, jsonify, request, session
import csv
import os
import time
import joblib
import pandas as pd

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24)

# LOADING DATA ===================================
data_file_path = os.path.join('air_quality', 'all_data.csv')
df_data = pd.read_csv(data_file_path)
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
    model_name = "model_" + pollutant + ".joblib"
    model_path = os.path.join("models", model_name)
    dict_models[pollutant] = joblib.load(model_path)

# Function to assign an anonymous session
@app.before_request
def assign_anonymous_session():
    if 'user_id' not in session:
        # Generate a unique identifier for the anonymous user
        session['user_id'] = str(uuid.uuid4())


@app.route('/')
def index():
    user_id = session.get('user_id', 'Unknown')
    return render_template('index.html', user_id=user_id)


@app.route('/analytics')
def analytics():
    user_id = session.get('user_id', 'Unknown')
    return render_template('analytics.html', user_id=user_id)


@app.route('/reports')
def reports():
    user_id = session.get('user_id', 'Unknown')
    return render_template('reports.html', user_id=user_id)


@app.route('/settings')
def settings():
    user_id = session.get('user_id', 'Unknown')
    return render_template('settings.html', user_id=user_id)


@app.route('/prediction')
def prediction():
    user_id = session.get('user_id', 'Unknown')
    return render_template('prediction.html', user_id=user_id)


@app.route('/grid-data', methods=['GET'])
def get_grid_data():
    grid_data = []
    with open('./air_quality/all_data.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            grid_data.append({
                "grid_id_x": row["grid_id_x"],
                "lon": float(row["lon"]),
                "lat": float(row["lat"]),
                "sw_lon": float(row["sw_lon"]),
                "sw_lat": float(row["sw_lat"]),
                "ne_lon": float(row["ne_lon"]),
                "ne_lat": float(row["ne_lat"])
            })
    return jsonify(grid_data)


@app.route('/prediction-data', methods=['GET'])
def prediction_data():
    prediction_data = []
    data_type = ""
    with open('./air_quality/all_data_changed.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        CSVfilednames = reader.fieldnames
        # data can have for each square in the grid the north east and south west coordinates
        # or the central point of the grid square
        # if it has both, we send both to the frontend and the user will switch between the two
        missing_fields = [field for field in ["sw_lon", "sw_lat", "ne_lon", "ne_lat", "lat", "lon"] if field not in CSVfilednames]
        if missing_fields:
            print(f"Missing fields: {missing_fields}")
        if("sw_lon" in CSVfilednames and "sw_lat" in CSVfilednames and "ne_lon" in CSVfilednames and "ne_lat" in CSVfilednames and "lat" in CSVfilednames and "lon" in CSVfilednames):

            for row in reader:
                prediction_data.append({
                    "grid_id_x": row["grid_id_x"],
                    "lon": float(row["lon"]),
                    "lat": float(row["lat"]),
                    "sw_lon": float(row["sw_lon"]),
                    "sw_lat": float(row["sw_lat"]),
                    "ne_lon": float(row["ne_lon"]),
                    "ne_lat": float(row["ne_lat"]),
                    "year": int(float(row["year"])),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "grid_and_point"
        # if csv contains sw and ne data, create data for grid
        elif ("sw_lon" in CSVfilednames and "sw_lat" in CSVfilednames and "ne_lon" in CSVfilednames and "ne_lat" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "grid_id_x": row["grid_id_x"],
                    "sw_lon": float(row["sw_lon"]),
                    "sw_lat": float(row["sw_lat"]),
                    "ne_lon": float(row["ne_lon"]),
                    "ne_lat": float(row["ne_lat"]),
                    "year": int(float(row["year"])),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "grid"
        # if csv has data based on lat long points
        elif ("lat" in CSVfilednames and "lon" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"]),
                    "year": int(float(row["year"])),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "point"
        return jsonify({"data": prediction_data, "data_type": data_type})


@app.route('/unchanged-prediction-data', methods=['GET'])
def unchanged_prediction_data():
    prediction_data = []
    data_type = ""
    # for now read the 2020 data just to test frontend
    # TODO: send the prediction data for if there is no change in the grid
    with open('./air_quality/all_data.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        CSVfilednames = reader.fieldnames
        # data can have for each square in the grid the north east and south west coordinates
        # or the central point of the grid square
        # if it has both, we send both to the frontend and the user will switch between the two
        if("sw_lon" in CSVfilednames and "sw_lat" in CSVfilednames and "ne_lon" in CSVfilednames and "ne_lat" in CSVfilednames and "lat" in CSVfilednames and "lon" in CSVfilednames):

            for row in reader:
                prediction_data.append({
                    "grid_id_x": row["grid_id_x"],
                    "lon": float(row["lon"]),
                    "lat": float(row["lat"]),
                    "sw_lon": float(row["sw_lon"]),
                    "sw_lat": float(row["sw_lat"]),
                    "ne_lon": float(row["ne_lon"]),
                    "ne_lat": float(row["ne_lat"]),
                    "year": int(float(row["year"])),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "grid_and_point"
        # if csv contains sw and ne data, create data for grid
        elif ("sw_lon" in CSVfilednames and "sw_lat" in CSVfilednames and "ne_lon" in CSVfilednames and "ne_lat" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "grid_id_x": row["grid_id_x"],
                    "sw_lon": float(row["sw_lon"]),
                    "sw_lat": float(row["sw_lat"]),
                    "ne_lon": float(row["ne_lon"]),
                    "ne_lat": float(row["ne_lat"]),
                    "year": int(float(row["year"])),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "grid"
        # if csv has data based on lat long points
        elif ("lat" in CSVfilednames and "lon" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"]),
                    "year": int(float(row["year"])),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "point"
        return jsonify({"data": prediction_data, "data_type": data_type})


class_columns = [
    'class_1_percent',
    'class_2_percent',
    'class_3_percent',
    'class_4_percent',
    'class_5_percent',
    'class_6_percent',
    'class_7_percent',
    'class_8_percent',
    'class_9_percent',
    'class_10_percent',
    'class_11_percent'
]

color_to_class_column = {
    'red': 'class_7_percent', # CITY
    'green': 'class_2_percent', #FOREST
    'yellow': 'class_5_percent', #CROPS
}

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        changed_indexes = set()
        df = pd.read_csv('air_quality/all_data_changed.csv')

        for item in data:
            
            print(item)
            sw = item['southWest']
            ne = item['northEast']
            color = item['color']
            print("color", color)

            sw_lat, sw_lon = sw
            ne_lat, ne_lon = ne

            mask = (
                (df['lat'] >= sw_lat) & (df['lat'] <= ne_lat) &
                (df['lon'] >= sw_lon) & (df['lon'] <= ne_lon)
            )
            
            print(mask)
            matched_indexes = df[mask].index.tolist()
            print(matched_indexes)
            changed_indexes.update(matched_indexes)
            
            if color=='red':
                df.loc[mask, 'population_sum'] += 1000
            
            if color in color_to_class_column.keys():
                for col in class_columns:
                    df.loc[mask, col] = 0

                # LAND of type to 100%
                if color in color_to_class_column:
                    class_col = color_to_class_column[color]
                    df.loc[mask, class_col] = 100
            elif color == 'gray':
                df.loc[mask, 'road_length_m'] += 1000
            elif color == 'purple':
                df.loc[mask, 'distance_to_factory'] = 0
            else:
                print(f"Unknown color: {color}")
                
        for idx in changed_indexes:
            try:
                row = df.loc[idx]
                input_data = row[features].to_frame().T 

                for pollutant in air_pollutants:
                    model = dict_models.get(pollutant)
                    if model:
                        prediction = model.predict(input_data)[0]
                        df.at[idx, pollutant] = float(prediction)

            except Exception as e:
                print(f"Failed to predict for index {idx}: {e}")


        df.to_csv('all_data_changed.csv', index=False)
        return jsonify({'message': 'Data for prediction updated successfully.'}), 200
    except Exception as e:
        print('Error processing prediction data:', str(e))
        return jsonify({'error': str(e)}), 500


"""@app.route('/predict', methods=['POST'])
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
    return jsonify(predictions)"""


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)
