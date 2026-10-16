from pathlib import Path
import argparse,re

def enhance(path):
 path=Path(path);s=path.read_text(encoding='utf-8');assets=Path(__file__).resolve().parents[1]/'assets'
 # Remove earlier bundled modules without changing article markup or embedded saved state.
 s=re.sub(r'<style id="html-aud-(?:annotations|study)"[^>]*>.*?</style>','',s,flags=re.S)
 s=re.sub(r'<script(?: id="htmlaud-(?:annotations|study)-script")?>\s*\(\(\)=>\{[\s\S]*?</script>',lambda m:'' if ('annotation-tools' in m[0] or 'study-tools' in m[0]) else m[0],s)
 for name in ['annotations','study']:
  css=(assets/(name+'.css')).read_text(encoding='utf-8');js=(assets/(name+'.js')).read_text(encoding='utf-8')
  s=s.replace('</head>','<style id="html-aud-'+name+'">'+css+'</style></head>')
  s=s.replace('</body>','<script id="htmlaud-'+name+'-script">'+js+'</script></body>')
 path.write_text(s,encoding='utf-8')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('html',nargs='+');a=p.parse_args()
 for f in a.html:enhance(f)
