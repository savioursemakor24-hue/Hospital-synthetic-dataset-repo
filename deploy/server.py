import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

# Import the Vercel serverless handler from api/index.py
sys.path.insert(0, os.path.join(BASE_DIR, "api"))
from index import handler as ApiHandler

class CombinedHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_OPTIONS(self):
        if self.path.startswith('/api'):
            ApiHandler.do_OPTIONS(self)
        else:
            self.send_response(200)
            self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api'):
            ApiHandler.do_GET(self)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api'):
            ApiHandler.do_POST(self)
        else:
            self.send_response(405)
            self.end_headers()

def run(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CombinedHandler)
    print(f"=======================================================")
    print(f" CardioSense AI - Hospital Classification Local Server")
    print(f" Running at: http://localhost:{port}")
    print(f" REST API:   http://localhost:{port}/api/predict")
    print(f" Press Ctrl+C to stop.")
    print(f"=======================================================")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port)
