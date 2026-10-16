from pathlib import Path
import argparse,re,base64,json
from lxml import html as H

def enhance(path,pdf=None):
 path=Path(path);s=path.open(encoding='utf-8',newline='').read();assets=Path(__file__).resolve().parents[1]/'assets'
 if pdf:
  payload=Path(pdf).read_bytes()
  if not payload.startswith(b'%PDF'):raise ValueError('Original source is not a PDF')
  s=re.sub(r'<link[^>]*id="original-pdf-source"[^>]*>','',s)
  s=s.replace('</head>','<link id="original-pdf-source" rel="alternate" type="application/pdf" href="data:application/pdf;base64,'+base64.b64encode(payload).decode()+'"></head>')
 # Embed article-specific notes metadata. Preserve supplied metadata and saved state.
 if not re.search(r'<script[^>]*id=[\"\']article-notes-template[\"\']',s):
  doc=H.fromstring(s);title=doc.xpath('//*[@id="article-title"]') or doc.xpath('//article/h1')
  title=' '.join(title[0].itertext()).strip() if title else (doc.findtext('.//title') or 'Article')
  headers=doc.xpath('//header');citation=' '.join(' '.join(headers[0].itertext()).split()) if headers else title
  links=doc.xpath('//header//a[starts-with(@href,"https://doi.org/")]/@href')
  figures=[]
  for i,f in enumerate(doc.xpath('//article//figure'),1):
   cap=f.xpath('./figcaption');name=' '.join(' '.join(cap[0].itertext()).split()) if cap else 'Figure '+str(i)
   figures.append({'id':f.get('id') or 'figure-'+str(i),'title':name})
  config={'title':title,'citation':citation,'doi':links[0] if links else '', 'figures':figures}
  payload=json.dumps(config,ensure_ascii=False).replace('<','\\u003c')
  s=s.replace('</head>','<script id="article-notes-template" type="application/json">'+payload+'</script></head>')
 # Remove earlier bundled modules without changing article markup or embedded saved state.
 s=re.sub(r'<style id="html-aud-(?:annotations|study)"[^>]*>.*?</style>','',s,flags=re.S)
 s=re.sub(r'<script(?: id="htmlaud-(?:annotations|study)-script")?>\s*\(\(\)=>\{[\s\S]*?</script>',lambda m:'' if ('annotation-tools' in m[0] or 'study-tools' in m[0]) else m[0],s)
 for name in ['annotations','study']:
  css=(assets/(name+'.css')).read_text(encoding='utf-8');js=(assets/(name+'.js')).read_text(encoding='utf-8')
  s=s.replace('</head>','<style id="html-aud-'+name+'">'+css+'</style></head>')
  s=s.replace('</body>','<script id="htmlaud-'+name+'-script">'+js+'</script></body>')
 with path.open('w',encoding='utf-8',newline='') as stream:stream.write(s)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('html',nargs='+');p.add_argument('--pdf');a=p.parse_args()
 for f in a.html:enhance(f,a.pdf)
