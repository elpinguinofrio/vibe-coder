#!/usr/bin/env python3
"""Dev server for Vibe Coder Simulator: static files with caching off (so edits always show up).
Usage: python3 serve.py [port]   (default 8137)"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8137
    print(f"Vibe Coder Simulator → http://127.0.0.1:{port}/")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
