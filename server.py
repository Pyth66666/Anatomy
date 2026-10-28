import http.server
import os

PORT = 8092
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows registries often map .js to text/plain, which browsers reject
    # for ES modules. Pin the types the app needs.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.glb': 'model/gltf-binary',
        '.css': 'text/css',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    # Local dev server: never let the browser reuse a stale copy.
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

# Threaded: a single-threaded server stalls when the browser opens an idle
# preconnect socket, leaving the page stuck on the loading screen.
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Serving at http://127.0.0.1:{PORT}")
    httpd.serve_forever()
