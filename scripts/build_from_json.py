from pathlib import Path
import json,argparse,html
from lxml import html as H, etree
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args()
d=json.loads(Path(a.input).read_text(encoding='utf-8'));r=H.fromstring((Path(__file__).resolve().parents[1]/'assets/reader_template.html').read_bytes())
r.find('.//title').text=d['title']+' - Audio Reader'
header=r.xpath('//header')[0];header.text=d.get('citation','');link=etree.SubElement(header,'a',href=d['url']);link.text=' Original article'
article=r.xpath('//article')[0];nav=r.xpath('//nav')[0];select=r.xpath('//*[@id="section"]')[0]
h=etree.SubElement(article,'h1',id='article-title');h.set('class','readable');h.text=d['title']
opt=etree.SubElement(select,'option',value='article-title');opt.text='Start of article'
if d.get('notice'):
 n=etree.SubElement(article,'p');n.set('role','note');n.text=d['notice']
for i,b in enumerate(d['blocks']):
 tag=b.get('tag','p');e=etree.SubElement(article,tag);e.set('class','readable');e.set('data-kind',b.get('kind','text'));e.set('tabindex','0');e.set('id','block-'+str(i));e.text=b['text']
 if tag in ['h2','h3']:
  o=etree.SubElement(select,'option',value=e.get('id'));o.text=b['text'];l=etree.SubElement(nav,'a',href='#'+e.get('id'));l.text=b['text']
for image in d.get('page_images',[]):
 detail=etree.SubElement(article,'details');summary=etree.SubElement(detail,'summary');summary.text=image['label'];fig=etree.SubElement(detail,'figure');etree.SubElement(fig,'img',src=image['src'],alt=image['label'],tabindex='0')
r.xpath('//footer')[0].text=d.get('footer','Reading-format adaptation. Consult the original article for publication and rights information.')
Path(a.output).write_text('<!doctype html>'+H.tostring(r,encoding='unicode'),encoding='utf-8')
print(a.output)

from add_annotations import enhance
enhance(a.output)
