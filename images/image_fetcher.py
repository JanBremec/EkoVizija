from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session
from PIL import Image
from io import BytesIO


class SentinelImageFetcher:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
        self.api_url = "https://sh.dataspace.copernicus.eu/api/v1/process"
        self.evalscript = self._get_evalscript()
        self.oauth = self._authenticate()

    def _authenticate(self):
        client = BackendApplicationClient(client_id=self.client_id)
        oauth = OAuth2Session(client=client)
        oauth.fetch_token(
            token_url=self.token_url,
            client_secret=self.client_secret,
            include_client_id=True
        )
        return oauth

    def _get_evalscript(self):
        return """
        //VERSION=3
        function setup() {
          return {
            input: ["B02", "B03", "B04"],
            output: {
              bands: 3,
              sampleType: "AUTO",
            },
          }
        }

        function evaluatePixel(sample) {
          return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
        }
        """

    def generate_images_for_years(self, start_year, end_year):
        for year in range(start_year, end_year + 1):
            request = self._create_request(year)
            response = self.oauth.post(self.api_url, json=request)

            if response.status_code == 200:
                self._save_image(response.content, year)
            else:
                print(f"Failed to retrieve image for year {year}. Status code: {response.status_code}")

    def _create_request(self, year):
        return {
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
                            "maxCloudCoverage": 10,
                        },
                    }
                ],
            },
            "output": {
                "width": 512,
                "height": 512,
            },
            "evalscript": self.evalscript,
        }

    def _save_image(self, image_content, year):
        file_path = f"output_image_{year}.jpg"
        image_data = BytesIO(image_content)
        image = Image.open(image_data)
        image.save(file_path)
        print(f"Image for year {year} saved successfully at {file_path}")


# Example usage
if __name__ == "__main__":
    CLIENT_ID = "CLIENT_ID"
    CLIENT_SECRET = "CLIENT_SECRET"

    fetcher = SentinelImageFetcher(CLIENT_ID, CLIENT_SECRET)
    fetcher.generate_images_for_years(2015, 2025)
