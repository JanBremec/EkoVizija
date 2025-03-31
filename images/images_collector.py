from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session
from PIL import Image
from io import BytesIO

# Credentials
client_id = 'CLIENT_ID'
client_secret = 'CLIENT_SECRET'

# Create a session
client = BackendApplicationClient(client_id=client_id)
oauth = OAuth2Session(client=client)

# Get token for the session
token = oauth.fetch_token(
    token_url='https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    client_secret=client_secret,
    include_client_id=True
)

# Evalscript for Sentinel Hub processing
evalscript = """
//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04"],
    output: {
      bands: 3,
      sampleType: "AUTO", // default value - scales the output values from [0,1] to [0,255].
    },
  }
}

function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}
"""


# Function to make requests and save images for each year
def generate_images_for_years(start_year, end_year):
    url = "https://sh.dataspace.copernicus.eu/api/v1/process"

    for year in range(start_year, end_year + 1):
        # Update time range dynamically for each year
        request = {
            "input": {
                "bounds": {
                    "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
                    "bbox": [
                        13.822174072265625,
                        45.85080395917834,
                        14.55963134765625,
                        46.29191774991382,
                    ],
                },
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "timeRange": {
                                "from": f"{year}-10-01T00:00:00Z",
                                "to": f"{year}-10-31T00:00:00Z",
                            },
                            "maxCloudCoverage": 10,  # Set cloud coverage threshold
                        },
                    }
                ],
            },
            "output": {
                "width": 512,
                "height": 512,
            },
            "evalscript": evalscript,
        }

        # Send request to Sentinel Hub API
        response = oauth.post(url, json=request)

        if response.status_code == 200:
            # Save image for the current year
            file_path = f"output_image_{year}.jpg"
            image_data = BytesIO(response.content)
            image = Image.open(image_data)
            image.save(file_path)
            print(f"Image for year {year} saved successfully at {file_path}")
        else:
            print(f"Failed to retrieve image for year {year}. Status code: {response.status_code}")


# Generate images from 2015 to 2025 (example range)
generate_images_for_years(2015, 2025)
