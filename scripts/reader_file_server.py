"""Loopback-only saves for explicitly registered Power Annotate readers."""
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote,urlparse
import json,secrets,re,tempfile,os,threading,zipfile,io
BASE=Path(__file__).resolve().parent
REGISTRY=json.loads((BASE/'readers.json').read_text(encoding='utf-8'))
LOCK=threading.Lock()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def headers_out(self,status=200,kind='application/json'):
  self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Access-Control-Allow-Origin','null');self.send_header('Access-Control-Allow-Headers','Content-Type,X-PowerAnnotate-Token,X-Reader-Url,X-File-Name');self.send_header('Access-Control-Allow-Methods','POST,OPTIONS');self.send_header('Access-Control-Allow-Private-Network','true');self.end_headers()
 def reply(self,data,status=200):self.headers_out(status);self.wfile.write(json.dumps(data).encode())
 def do_OPTIONS(self):self.headers_out(204)
 def do_POST(self):
  try:
   if self.headers.get('Host') not in ['127.0.0.1:13580','localhost:13580']:raise ValueError('Invalid host')
   if self.headers.get('Origin','null')!='null':raise ValueError('Only local readers may save')
   url=unquote(self.headers.get('X-Reader-Url','')).split('#')[0].split('?')[0]
   entry=next((r for r in json.loads((BASE/'readers.json').read_text(encoding='utf-8')) if r['url'].lower()==url.lower()),None)
   if not entry or not secrets.compare_digest(self.headers.get('X-PowerAnnotate-Token',''),entry['token']):raise ValueError('Reader is not paired with this save helper')
   reader=Path(entry['path']).resolve(strict=True);folder=reader.parent
   length=int(self.headers.get('Content-Length','0'))
   if length<0 or length>150_000_000:raise ValueError('File is too large')
   if self.path=='/context':self.reply({'path':str(reader),'directory':str(folder),'name':reader.name});return
   payload=self.rfile.read(length)
   with LOCK:
    if self.path=='/save-html':
     text=payload.decode('utf-8')
     if not text.lower().startswith('<!doctype html') or 'htmlaud-study-script' not in text:raise ValueError('Expected a complete Power Annotate reader')
     old_title=re.search(r'<title[^>]*>(.*?)</title>',reader.read_text(encoding='utf-8'),re.S|re.I);new_title=re.search(r'<title[^>]*>(.*?)</title>',text,re.S|re.I)
     if not old_title or not new_title or old_title[1]!=new_title[1]:raise ValueError('Reader identity changed; save a separate copy instead')
     fd,tmp=tempfile.mkstemp(prefix='.power-annotate-',suffix='.tmp',dir=folder)
     try:
      with os.fdopen(fd,'wb') as f:f.write(payload)
      os.replace(tmp,reader)
     finally:
      if os.path.exists(tmp):os.unlink(tmp)
     target=reader
    elif self.path=='/save-pptx':
     name=unquote(self.headers.get('X-File-Name',''))
     if not name.lower().endswith('.pptx') or re.search(r'[<>:"/\\|?*\x00-\x1f]',name) or len(name)>160:raise ValueError('Invalid presentation name')
     with zipfile.ZipFile(io.BytesIO(payload)) as z:
      if 'ppt/presentation.xml' not in z.namelist():raise ValueError('Not a PowerPoint presentation')
     stem=Path(name).stem[:max(35,230-len(str(folder)))];name=stem+'.pptx';target=folder/name;n=1
     while True:
      try:
       with target.open('xb') as f:f.write(payload)
       break
      except FileExistsError:n+=1;target=folder/(stem+' ('+str(n)+').pptx')
    else:raise ValueError('Unknown save operation')
   self.reply({'path':str(target),'directory':str(folder)})
  except (ValueError,UnicodeError,OSError,zipfile.BadZipFile) as e:self.reply({'error':str(e)},400)
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',13580),Handler).serve_forever()
