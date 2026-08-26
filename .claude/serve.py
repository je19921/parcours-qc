import http.server
import socketserver

FORCE = {".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css"}

class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        for ext, ctype in FORCE.items():
            if path.endswith(ext):
                return ctype
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", 5500), Handler) as httpd:
        httpd.serve_forever()
