"""Validate article-section navigation before delivering a Power Annotate reader."""
from pathlib import Path
from lxml import html
import re,json,argparse

def validate_reader(path):
 d=html.fromstring(Path(path).read_bytes());errors=[];nav=d.xpath('//nav//a[@href]');options=d.xpath('//select[@id="section"]/option');ids={}
 for node in d.xpath('//*[@id]'):ids.setdefault(node.get('id'),[]).append(node)
 if len(ids.get('section',[]))!=1:errors.append('Exactly one section selector with id="section" is required for Listen.')
 if not ids.get('play'):errors.append('Listen button is missing.')
 labels=[' '.join(n.text_content().split()) for n in nav];generic=lambda t:bool(re.fullmatch(r'(?:Article\s+)?pages?\s*\d*(?:\s*[–-]\s*\d+)?',t,re.I))
 if not labels or not any(t and not generic(t) for t in labels):errors.append('Page-only or empty navigation: recover real article headings from the source before delivery.')
 if any(generic(t) for t in labels):errors.append('PDF page labels must not appear as article-section navigation.')
 for n in nav:
  target=n.get('href','').lstrip('#')
  if len(ids.get(target,[]))!=1:errors.append('Navigation target missing or duplicated: '+target)
  elif 'readable' not in ids[target][0].get('class','').split():errors.append('Section target is not a narrated source block: '+target)
 for opt in options:
  if len(ids.get(opt.get('value'),[]))!=1:errors.append('Listen section target missing or duplicated: '+str(opt.get('value')))
 if errors:raise ValueError(str(path)+'\n'+'\n'.join(errors))
 return {'file':str(path),'sections':labels,'section_count':len(labels),'status':'passed'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('readers',nargs='+');a=p.parse_args()
 for path in a.readers:print(json.dumps(validate_reader(path),ensure_ascii=True))
