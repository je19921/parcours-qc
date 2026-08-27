import http.server

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
    # ThreadingHTTPServer, not plain TCPServer: the single-threaded version
    # blocks on any kept-alive connection (normal HTTP/1.1 browser behavior),
    # so it serves a handful of requests fine then silently stops accepting
    # new ones until that connection times out. Threading avoids the
    # head-of-line block entirely.
    with http.server.ThreadingHTTPServer(("", 5500), Handler) as httpd:
        httpd.daemon_threads = True
        httpd.serve_forever()
