from pathlib import Path
import xml.etree.ElementTree as E,html,re,base64,json
import argparse
ap=argparse.ArgumentParser();ap.add_argument('--xml',required=True);ap.add_argument('--assets-dir',required=True);ap.add_argument('--output',required=True);args=ap.parse_args()
out=Path(args.assets_dir);r=E.parse(args.xml).getroot();xl='{http://www.w3.org/1999/xlink}href'
def esc(t):return html.escape(t or '',quote=True)
def plain(e):return ' '.join(''.join(e.itertext()).split()) if e is not None else ''
blocks=[];toc=[];counts={'figures':0,'paragraphs':0}
def inline(e):
 if e is None:return ''
 s=esc(e.text)
 for c in e:
  t=c.tag.split('}')[-1];v=inline(c)
  if t=='xref':
   target=c.get('rid','').split()[0];attrs=' class="citation" data-citation="true"' if c.get('ref-type')=='bibr' else '';v=f'<a href="#{esc(target)}"{attrs}>{v}</a>'
  elif t in ['italic','bold','sup','sub']:v=f'<{dict(italic="em",bold="strong",sup="sup",sub="sub")[t]}>{v}</{dict(italic="em",bold="strong",sup="sup",sub="sub")[t]}>'
  elif t in ['ext-link','uri']:
   u=c.get(xl) or plain(c);v=f'<a href="{esc(u)}" rel="noreferrer">{v}</a>' if u.startswith(('https://','http://')) else v
  elif t in ['graphic','inline-graphic','fig']:v=''
  s+=v+esc(c.tail)
 return s
counter=0
def readable(content,tag='p',kind='text',id=None):
 global counter
 counter+=1;counts['paragraphs']+=tag=='p';attrs=f' id="{esc(id)}"' if id else ''
 return f'<{tag}{attrs} class="readable" data-kind="{kind}" data-block="{counter}" tabindex="0">{content}</{tag}>'
def render(e,depth=2):
 t=e.tag.split('}')[-1];eid=e.get('id');s=''
 if t=='sec':
  title=e.find('title');label=plain(title);sid=eid or 'section-'+str(counter)
  if title is not None:
   toc.append((sid,label,depth));s+=readable(inline(title),'h'+str(min(depth,4)),'heading',sid)
  for c in e:
   if c.tag!='title':s+=render(c,depth+1)
 elif t=='p':s+=readable(inline(e))+''.join(render(f,depth) for f in e.findall('.//fig'))
 elif t=='fig':
  counts['figures']+=1;g=e.find('graphic');name=g.get(xl) if g is not None else '';img=out/name
  title=plain(e.find('label'))+' · '+plain(e.find('caption/title'))
  uri='data:image/webp;base64,'+base64.b64encode(img.read_bytes()).decode() if img.exists() else ''
  s+=f'<figure id="{esc(eid)}"><figcaption>{readable(esc(title),"h3","caption")}</figcaption><img class="zoomable" src="{uri}" alt="{esc(title)}" loading="lazy" tabindex="0" role="button" aria-label="Enlarge {esc(title)}"><details><summary>Figure caption</summary>'
  cap=e.find('caption')
  if cap is not None:
   for c in cap:
    if c.tag!='title':s+=readable(inline(c),'p','caption')
  s+='</details></figure>'
 elif t in ['list','list-item']:
  tag='li' if t=='list-item' else ('ol' if e.get('list-type')=='order' else 'ul');s+=f'<{tag}>'+''.join(render(c,depth) for c in e)+f'</{tag}>'
 elif t=='ref-list':
  s+='<details class="references"><summary>References</summary>'
  for ref in e.findall('ref'):s+=readable(inline(ref),'p','reference',ref.get('id'))
  s+='</details>'
 elif t in ['title','label']:pass
 elif t in ['supplementary-material','media']:
  name=e.get(xl);s+=readable(inline(e))
  if name:s+=f'<p class="supp-link"><a href="https://doi.org/">Open supplementary materials on PMC</a></p>'
 else:
  if len(e):s+=''.join(render(c,depth) for c in e)
  elif plain(e):s+=readable(esc(plain(e)))
 return s
front=r.find('front/article-meta');title=plain(front.find('title-group/article-title'));author_names=[]
for c in front.findall('contrib-group/contrib'):
 n=c.find('name')
 if n is not None:author_names.append(plain(n.find('given-names'))+' '+plain(n.find('surname')))
content=readable(esc(title),'h1','heading','article-title')
abslist=front.findall('abstract')
for a in abslist:
 if a.get('abstract-type') in ['graphical','toc','teaser']:continue
 content+=readable('Abstract','h2','heading','abstract');toc.append(('abstract','Abstract',2))
 for c in a:
  if c.tag!='title':content+=render(c,3)
 break
content+=''.join(render(c) for c in r.find('body'))
back=r.find('back')
if back is not None:content+=''.join(render(c) for c in back)
options='<option value="article-title">Start of article</option>'+''.join(f'<option value="{esc(i)}">{esc(("  " if level>2 else "")+label)}</option>' for i,label,level in toc)
nav=''.join(f'<a href="#{esc(i)}" class="depth-{level}">{esc(label)}</a>' for i,label,level in toc)
styles='''
::highlight(spoken-word){background:#ffd45c;color:#161616;text-decoration:underline;text-decoration-thickness:2px}
dialog{max-width:96vw;max-height:96vh;padding:16px;border:1px solid #888;border-radius:10px}dialog img{display:block;max-width:100%;height:auto;margin-top:10px}dialog::backdrop{background:#000a}.zoomable{cursor:zoom-in}:root{color-scheme:light dark;--bg:#f7f6f2;--paper:#fff;--ink:#202a33;--sub:#536371;--line:#d9dfdf;--accent:#12665c;--active:#e1f3de}*{box-sizing:border-box}html{scroll-padding-top:200px;scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif}header{max-width:1100px;margin:auto;padding:30px 26px 12px}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:750}header p{font-size:14px;color:var(--sub);line-height:1.6}.toolbar{position:sticky;top:0;z-index:3;background:var(--paper);border-block:1px solid var(--line);padding:14px 24px;box-shadow:0 4px 12px #00000008}.controls{max-width:1100px;margin:auto;display:flex;flex-wrap:wrap;align-items:center;gap:9px}button,select,input{font:inherit}button,select{border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:7px;padding:8px 11px}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}button:hover:not(:disabled){filter:brightness(.95)}label{font-size:13px;display:flex;gap:7px;align-items:center}select{max-width:300px;font-size:13px}#section{max-width:420px}#status{width:100%;font-size:13px;color:var(--sub);margin:2px 0}progress{width:100%;height:4px;accent-color:var(--accent)}.layout{max-width:1200px;margin:28px auto;display:grid;grid-template-columns:225px minmax(0,800px);gap:30px;padding:0 24px}nav{position:sticky;top:200px;align-self:start;max-height:70vh;overflow:auto;font-size:13px}nav strong{display:block;padding:9px 0}nav a{display:block;padding:5px 0;text-decoration:none;color:var(--sub);line-height:1.4}nav .depth-3,nav .depth-4{padding-left:12px;font-size:12px}article{min-width:0;background:var(--paper);padding:36px 44px;border:1px solid var(--line);border-radius:10px}article h1{font-size:30px;line-height:1.25;margin:0 0 28px}h2{font-size:23px;margin:36px 0 15px}h3{font-size:18px;margin:27px 0 12px}h4{font-size:16px}article p,article li{font:18px/1.78 Georgia,serif;overflow-wrap:anywhere}.readable{border-radius:4px;transition:background .15s}.readable.speaking{background:var(--active);box-shadow:-5px 0 0 var(--accent)}.readable:focus-visible,button:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}figure{margin:30px 0;border-block:1px solid var(--line);padding:16px 0}figure img{width:100%;height:auto;display:block;margin:16px 0}figcaption h3{font-size:16px}details summary{cursor:pointer;color:var(--accent);font:600 14px/1.5 system-ui;padding:10px 0}details p{font-size:16px}a{color:var(--accent)}.citation{font:12px system-ui;vertical-align:super;text-decoration:none;margin-inline:1px}.references p{font-size:14px;line-height:1.7}.hint{max-width:1100px;margin:8px auto 0;font-size:12px;color:var(--sub)}footer{max-width:1100px;margin:30px auto;padding:16px 26px;font-size:13px;color:var(--sub);line-height:1.6}body.large article p{font-size:21px}@media(max-width:900px){.layout{display:block;max-width:850px}nav{position:static;max-height:180px;margin-bottom:20px}article{padding:25px}article h1{font-size:25px}.toolbar{position:relative}html{scroll-padding-top:15px}}@media(prefers-color-scheme:dark){:root{--bg:#151c20;--paper:#1d272c;--ink:#e5e9eb;--sub:#b3c1c5;--line:#3e4c51;--accent:#78cec0;--active:#253e35}button.primary{color:#10251f}}@media print{.toolbar,nav,.hint{display:none}.layout{display:block;margin:0;padding:0}article{border:0;padding:0}details{display:block}figure{break-inside:avoid}article h1{font-size:22px}}
'''
script='''
(()=>{'use strict';const $=id=>document.getElementById(id),synth=window.speechSynthesis;let voices=[],queue=[],idx=0,running=false,paused=false,token=0,current=null,utterance=null;const blocks=[...document.querySelectorAll('.readable')];
function mappedText(el){let text='',map=[];const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(n.parentElement.closest('[data-citation]'))continue;for(let i=0;i<n.length;i++){const c=n.data[i];if(/\s/.test(c)){if(text&&!text.endsWith(' ')){text+=' ';map.push([n,i])}}else{text+=c;map.push([n,i])}}}if(text.endsWith(' ')){text=text.slice(0,-1);map.pop()}return {text,map}}
function sentences(t){const out=[];let cursor=0;const parts=window.Intl&&Intl.Segmenter?[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(t)].map(x=>x.segment):t.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[t];for(const part of parts){const v=part.trim();let start=t.indexOf(v,cursor);cursor=start+v.length;let pos=0;while(pos<v.length){let end=Math.min(pos+220,v.length);if(end<v.length){const space=v.lastIndexOf(' ',end);if(space>pos)end=space}out.push({text:v.slice(pos,end),start:start+pos});pos=end;while(v[pos]===' ')pos++}}return out.filter(x=>x.text)}
function build(start){let begin=blocks.findIndex(b=>b.id===start);if(begin<0)begin=0;queue=[];blocks.slice(begin).forEach(el=>{if(el.dataset.kind==='caption'&&!$('captions').checked)return;if(el.dataset.kind==='reference'&&!$('refs').checked)return;const m=mappedText(el);sentences(m.text).forEach(x=>queue.push({el,text:x.text,start:x.start,map:m.map}))});idx=0}
function clearWord(){if(window.CSS&&CSS.highlights)CSS.highlights.delete('spoken-word')}
function wordAt(entry,event){if(!window.Highlight||!CSS.highlights)return;let i=Math.max(0,event.charIndex||0),end=i;while(i<entry.text.length&&!/[\p{L}\p{N}]/u.test(entry.text[i]))i++;end=i;while(end<entry.text.length&&/[\p{L}\p{N}\p{M}'’\-]/u.test(entry.text[end]))end++;const a=entry.map[entry.start+i],b=entry.map[entry.start+end-1];if(!a||!b)return;const range=document.createRange();range.setStart(a[0],a[1]);range.setEnd(b[0],b[1]+1);CSS.highlights.set('spoken-word',new Highlight(range))}
function status(t){$('status').textContent=t;$('progress').value=queue.length?idx/queue.length:0;$('pause').disabled=!running;$('stop').disabled=!running;$('prev').disabled=!running;$('next').disabled=!running;$('play').textContent=running?'Restart section':'Listen'}
function reset(){clearWord();token++;synth.cancel();running=false;paused=false;utterance=null;current=null;blocks.forEach(b=>b.classList.remove('speaking'));$('pause').textContent='Pause'}
function speak(){if(!running)return;if(idx>=queue.length){reset();$('progress').value=1;status('Finished reading.');$('progress').value=1;return}clearWord();const entry=queue[idx];entry.el.closest("details")?.setAttribute("open","");if(current!==entry.el){if(current)current.classList.remove('speaking');current=entry.el;current.classList.add('speaking');if($('follow').checked)current.scrollIntoView({block:'center',behavior:'smooth'})}const seq=token;utterance=new SpeechSynthesisUtterance(entry.text);utterance.rate=Number($('rate').value);const v=voices.find(v=>v.voiceURI===$('voice').value);if(v){utterance.voice=v;utterance.lang=v.lang}else utterance.lang='en-US';utterance.onboundary=e=>{if(seq===token&&running&&(!e.name||e.name==='word'))wordAt(entry,e)};utterance.onend=()=>{if(seq!==token||!running)return;idx++;speak()};utterance.onerror=e=>{if(seq!==token||e.error==='interrupted'||e.error==='canceled')return;reset();status('Playback stopped: '+e.error+'. Try another voice, then Listen.')};status('Reading '+(idx+1)+' of '+queue.length+' · '+entry.text.slice(0,105));synth.speak(utterance)}
function start(){reset();build($('section').value);running=true;speak()}
function skip(n){if(!running)return;const next=Math.max(0,Math.min(queue.length-1,idx+n));token++;synth.cancel();idx=next;paused=false;$('pause').textContent='Pause';speak()}
function loadVoices(){const old=$('voice').value;voices=synth.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang));$('voice').replaceChildren();const opt=document.createElement('option');opt.value='';opt.textContent='Browser default';$('voice').append(opt);voices.forEach(v=>{const o=document.createElement('option');o.value=v.voiceURI;o.textContent=v.name+' · '+v.lang;$('voice').append(o)});if(voices.some(v=>v.voiceURI===old))$('voice').value=old}
if(!synth){$('play').disabled=true;status('Read-aloud is unavailable in this browser. Open this file in Microsoft Edge or Chrome.');return}loadVoices();synth.addEventListener('voiceschanged',loadVoices);$('play').onclick=start;$('stop').onclick=()=>{reset();status('Stopped. Choose a section or press Listen to start again.')};$('pause').onclick=()=>{if(!running)return;if(paused){paused=false;synth.resume();$('pause').textContent='Pause';status('Reading '+(idx+1)+' of '+queue.length)}else{paused=true;synth.pause();$('pause').textContent='Resume';status('Paused · sentence '+(idx+1)+' of '+queue.length)}};$('prev').onclick=()=>skip(-1);$('next').onclick=()=>skip(1);$('rate').oninput=()=>{$('rateLabel').textContent=Number($('rate').value).toFixed(2)+'×'};$('rate').onchange=()=>{if(running)skip(0)};$('voice').onchange=()=>{if(running)skip(0)};$('font').onclick=()=>{document.body.classList.toggle('large');$('font').setAttribute('aria-pressed',document.body.classList.contains('large'))};
const viewer=$('figureViewer');document.querySelectorAll('figure img').forEach(img=>{const open=()=>{$('viewerImage').src=img.src;$('viewerImage').alt=img.alt;viewer.showModal()};img.onclick=open;img.onkeydown=e=>{if(e.key==='Enter')open()}});$('closeFigure').onclick=()=>viewer.close();
blocks.forEach((b,i)=>b.addEventListener('dblclick',()=>{reset();build('article-title');const first=queue.findIndex(q=>q.el===b);if(first<0){status('Enable figure captions or references to read this block.');return}idx=first;running=true;speak()}));window.addEventListener('beforeunload',()=>synth.cancel());status('Ready. Choose a section and press Listen.');
})();
'''
page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Article audio reader</title><style>'+styles+'</style></head><body>'
doi=next((plain(e) for e in front.findall('article-id') if e.get('pub-id-type')=='doi'),'')
page+='<header><div class="eyebrow">Article audio reader</div><p>'+esc(', '.join(author_names))+'<br><a href="https://doi.org/'+esc(doi)+'">Original article</a></p></header>'
page+='<div class="toolbar" aria-label="Read aloud controls"><div class="controls"><button id="play" class="primary">Listen</button><button id="pause" disabled>Pause</button><button id="stop" disabled>Stop</button><button id="prev" disabled aria-label="Previous sentence">Previous</button><button id="next" disabled aria-label="Next sentence">Next</button><label>Start at <select id="section">'+options+'</select></label><label>Voice <select id="voice"></select></label><label>Speed <input id="rate" type="range" min="0.65" max="1.8" step="0.05" value="1"><span id="rateLabel">1.00×</span></label><label><input id="captions" type="checkbox"> Read figure captions</label><label><input id="refs" type="checkbox"> Read references</label><label><input id="follow" type="checkbox" checked> Follow text</label><button id="font" aria-pressed="false">Larger text</button><p id="status" role="status" aria-live="polite">Loading reader…</p><progress id="progress" max="1" value="0" aria-label="Reading progress"></progress></div><div class="hint">The paragraph is highlighted in green; the spoken word is highlighted in gold when the selected voice provides word boundaries. Double-click a paragraph to listen from there. Narration uses your browser’s installed voices; no audio file is required. Open in Edge or Chrome for read-aloud.</div></div>'
page+='<main class="layout"><nav aria-label="Article sections"><strong>Contents</strong>'+nav+'</nav><article>'+content+'</article></main>'
page+='<dialog id="figureViewer"><button id="closeFigure">Close figure</button><img id="viewerImage" alt=""></dialog>'
page+='<footer>Reading-format adaptation of the supplied article, not a summary. Consult the original for citation, license, supplementary materials, and publication details. Reference markers are skipped in narration.</footer><script>'+script+'</script></body></html>'
Path(args.output).write_text(page,encoding='utf-8')
(out/'reader_checks.json').write_text(json.dumps({'title':title,'figures':counts['figures'],'readable_blocks':counter,'sections':len(toc),'references':len(r.findall('.//ref-list/ref')),'bytes':len(page.encode())},indent=2),encoding='utf-8')
assert counter>0
print(Path(args.output).resolve());print(counts,counter)

from add_annotations import enhance
enhance(args.output)
