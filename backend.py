# app.py
from flask import Flask, render_template, jsonify, request
import csv

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/reports')
def reports():
    return render_template('reports.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/prediction')
def prediction():
    return render_template('prediction.html')

@app.route('/grid-data', methods=['GET'])
def get_grid_data():
    grid_data = []
    with open('./air_quality/Slovenia_Grid_Coordinates_1km.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            grid_data.append({
                "grid_id": row["grid_id"],
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
    with open('./air_quality/Slovenia_AirQuality_1kmGrid_2019_withBounds.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        #if csv contains sw and ne data, create data for grid
        CSVfilednames = reader.fieldnames
        if("sw_lon" in CSVfilednames and "sw_lat" in CSVfilednames and "ne_lon" in CSVfilednames and "ne_lat" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "grid_id": row["grid_id"],
                    "lon": float(row["lon"]),
                    "lat": float(row["lat"]),
                    "sw_lon": float(row["sw_lon"]),
                    "sw_lat": float(row["sw_lat"]),
                    "ne_lon": float(row["ne_lon"]),
                    "ne_lat": float(row["ne_lat"]),
                    "year": int(row["year"]),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "grid"
        # if csv has data based on lat long points
        elif("lat" in CSVfilednames and "lon" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"]),
                    "year": int(row["year"]),
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
    with open('./air_quality/Slovenia_AirQuality_1kmGrid_2020_withBounds.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        #if csv contains sw and ne data, create data for grid
        CSVfilednames = reader.fieldnames
        print(CSVfilednames)
        if("sw_lon" in CSVfilednames and "sw_lat" in CSVfilednames and "ne_lon" in CSVfilednames and "ne_lat" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "grid_id": row["grid_id"],
                    "lon": float(row["lon"]),
                    "lat": float(row["lat"]),
                    "sw_lon": float(row["sw_lon"]),
                    "sw_lat": float(row["sw_lat"]),
                    "ne_lon": float(row["ne_lon"]),
                    "ne_lat": float(row["ne_lat"]),
                    "year": int(row["year"]),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "grid"
        # if csv has data based on lat long points
        elif("lat" in CSVfilednames and "lon" in CSVfilednames):
            for row in reader:
                prediction_data.append({
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"]),
                    "year": int(row["year"]),
                    "no2_ppb": float(row["no2_ppb"]),
                    "co_ppb": float(row["co_ppb"]),
                    "so2_ppb": float(row["so2_ppb"]),
                    "o3_ppb": float(row["o3_ppb"]),
                    "ch4_ppb": float(row["ch4_ppb"])
                })
            data_type = "point"
        return jsonify({"data": prediction_data, "data_type": data_type})



@app.route('/predict', methods=['POST'])
def predict():
    # code for predicting with ai
    
    # for now just responds success
    return "Success", 201

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)
