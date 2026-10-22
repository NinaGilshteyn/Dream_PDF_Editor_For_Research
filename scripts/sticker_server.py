"""Loopback-only Power Annotate image-generation bridge. API keys stay in memory."""
import argparse, base64, hmac, io, json, os, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
API_URL = 'https://api.openai.com/v1/images/generations'
MODEL = os.environ.get('POWER_ANNOTATE_IMAGE_MODEL', 'gpt-image-2.5-flare')
KEY = os.environ.get('OPENAI_API_KEY', '')
LOCK = threading.Lock()
CONFIG = {}

def generate(prompt):
    body = {'model': MODEL, 'prompt': 'Create one polished illustrated sticker on a truly transparent background. Center the subject, with a clean cutout silhouette and no surrounding scene, no badge, no caption, no text unless explicitly requested. User description: '+prompt,
            'n': 1, 'size': '1024x1024', 'quality': 'low', 'background': 'transparent', 'output_format': 'png'}
    req = Request(API_URL, data=json.dumps(body).encode(), headers={'Authorization': 'Bearer '+KEY, 'Content-Type': 'application/json'})
    with urlopen(req, timeout=180) as result:
        raw = result.read(24_000_001)
    if len(raw) > 24_000_000:
        raise ValueError('Image response was too large.')
    data = json.loads(raw)
    png = base64.b64decode(data['data'][0]['b64_json'], validate=True)
    if not png.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('The service returned an unsupported image.')
    from PIL import Image
    with Image.open(io.BytesIO(png)) as image:
        image = image.convert('RGBA')
        image.thumbnail((384,384))
        out = io.BytesIO(); image.save(out, format='PNG', optimize=True)
    return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()

class Handler(BaseHTTPRequestHandler):
    server_version = 'PowerAnnotate/1'
    def log_message(self, *_): pass  # Never log prompts, tokens, or API keys.
    def allowed(self):
        host = self.headers.get('Host','')
        origins = {None, 'null', 'http://127.0.0.1:'+str(self.server.server_port)}
        return host in {'127.0.0.1:'+str(self.server.server_port), 'localhost:'+str(self.server.server_port)} and self.headers.get('Origin') in origins
    def authorized(self):
        return self.allowed() and hmac.compare_digest(self.headers.get('X-PowerAnnotate-Token',''),CONFIG['token'])
    def reply(self, code, obj):
        raw = json.dumps(obj).encode(); self.send_response(code)
        if self.allowed() and self.headers.get('Origin'):
            self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
            self.send_header('Vary','Origin')
        self.send_header('Cache-Control','no-store'); self.send_header('Content-Type','application/json')
        self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Content-Length',str(len(raw)))
        self.end_headers(); self.wfile.write(raw)
    def do_OPTIONS(self):
        if not self.allowed(): return self.reply(403, {'error':'Origin not allowed.'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',self.headers.get('Origin','null'))
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type, X-PowerAnnotate-Token')
        self.send_header('Access-Control-Allow-Private-Network','true')
        self.send_header('Vary','Origin'); self.end_headers()
    def do_GET(self):
        if self.path=='/setup' and self.allowed():
            setup=ROOT/'setup.html';setup=setup if setup.exists() else ROOT.parent/'assets'/'sticker_setup.html';raw=setup.read_bytes(); self.send_response(200)
            self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Cache-Control','no-store')
            self.send_header('Referrer-Policy','no-referrer'); self.send_header('X-Frame-Options','DENY')
            self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'")
            self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw); return
        if not self.authorized(): return self.reply(403,{'error':'The reader is not paired with this sticker service.'})
        if self.path=='/health': return self.reply(200,{'ready':bool(KEY),'model':MODEL})
        self.reply(404,{'error':'Not found.'})
    def do_POST(self):
        global KEY
        if not self.authorized(): return self.reply(403,{'error':'The reader is not paired with this sticker service.'})
        if self.headers.get('Content-Type','').split(';')[0]!='application/json': return self.reply(415,{'error':'JSON required.'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<2 or length>12000: raise ValueError()
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict): raise ValueError()
        except (ValueError,TypeError): return self.reply(400,{'error':'Invalid request.'})
        if self.path=='/configure':
            if self.headers.get('Origin')!='http://127.0.0.1:'+str(self.server.server_port): return self.reply(403,{'error':'Enter the API key on the local setup page.'})
            key=data.get('apiKey','')
            if not isinstance(key,str) or not key.startswith('sk-') or len(key)>500 or any(c.isspace() for c in key): return self.reply(400,{'error':'Enter a valid OpenAI API key.'})
            KEY=key; return self.reply(200,{'ready':True})
        if self.path!='/generate': return self.reply(404,{'error':'Not found.'})
        prompt=data.get('prompt')
        if not isinstance(prompt,str) or not 1<=len(prompt.strip())<=2000: return self.reply(400,{'error':'Describe your sticker in 1–2000 characters.'})
        if not KEY: return self.reply(503,{'error':'Add your OpenAI API key using Open API setup, then generate again.'})
        if not LOCK.acquire(blocking=False): return self.reply(429,{'error':'A sticker is already being generated. Wait for it to finish.'})
        try:
            self.reply(200,{'imageData':generate(prompt.strip()),'model':MODEL})
        except HTTPError as err:
            messages={400:'The image request was rejected. Try a different description.',401:'The API key was rejected. Update it in Open API setup.',403:'This account cannot access the image model, or the request is not allowed.',429:'OpenAI reported a usage or rate limit. Check your API account and billing.'}
            self.reply(502,{'error':messages.get(err.code,'OpenAI image generation failed. Try again later.')})
        except (URLError,TimeoutError): self.reply(504,{'error':'Image generation timed out or could not connect. Check your connection. No automatic retry was made.'})
        except Exception: self.reply(502,{'error':'No valid sticker image was returned. No automatic retry was made.'})
        finally: LOCK.release()

def main():
    global CONFIG
    parser=argparse.ArgumentParser(); parser.add_argument('--config',default=str(ROOT/'bridge.json')); args=parser.parse_args()
    CONFIG=json.loads(Path(args.config).read_text(encoding='utf-8'))
    server=ThreadingHTTPServer(('127.0.0.1',CONFIG['port']),Handler)
    print('Power Annotate sticker service ready on localhost. API key configured:',bool(KEY),flush=True)
    server.serve_forever()
if __name__=='__main__': main()
