(()=>{'use strict';if(document.getElementById('study-tools'))return;
const api=window.htmlAudAnnotations,article=document.querySelector('article'),blocks=[...api.blocks],$=id=>document.getElementById(id);const key='htmlaud.study.v2:'+document.title;let state={cards:[],crops:{},legends:{},read:[]},fileHandle=null,saveTimer,writes=Promise.resolve(),selected=null;
const embedded=document.getElementById('htmlaud-state');let embeddedState=null;try{embeddedState=JSON.parse(embedded?.textContent||'null');state=JSON.parse(localStorage.getItem(key)||'null')||embeddedState?.study||state;if(embeddedState?.annotations){const rev=Number(localStorage.getItem('html_aud.annotations.v1:'+document.title+':revision')||0);if((embeddedState.study?.updated||0)>rev)api.set(embeddedState.annotations)}}catch(e){}
const tools=document.createElement('div');tools.id='study-tools';tools.innerHTML='<button id="save-connect">Enable HTML autosave</button><button id="save-html">Download saved HTML</button><button id="notes-toggle">Show pinned notes</button><label class="switch"><input id="study-toggle" type="checkbox"> Figure-study view</label><button id="anki-new">Selection → Anki</button><button id="anki-toggle">Anki cards</button><label class="switch"><input id="raw-pdf-toggle" type="checkbox"> Original PDF</label><span id="study-status" role="status">Annotations save in this browser.</span>';document.querySelector('.toolbar').append(tools);
// Generate notes only when requested; authenticated Google Docs stays in its own tab.
const notesButton=document.createElement('button');
notesButton.id='google-notes-open';
notesButton.type='button';
notesButton.textContent='New Google Doc notes';
notesButton.title='Create this paper’s notes template, copy it, and open Google Docs. Paste once in the new document.';
tools.append(notesButton);
const notesDialog=document.createElement('dialog');
notesDialog.id='google-notes-dialog';
notesDialog.setAttribute('aria-label','Google Docs notes template');
notesDialog.innerHTML='<h2>Article notes template</h2><p id="google-notes-message" role="status"></p><textarea id="google-notes-text" aria-label="Article notes template" rows="15" readonly></textarea><div class="google-notes-actions"><button id="google-notes-copy" type="button">Copy template</button><button id="google-notes-launch" type="button">Open Google Docs</button><button id="google-notes-close" type="button">Close</button></div>';
document.body.append(notesDialog);
function articleNotes(){
 let config=null;
 try{config=JSON.parse(document.getElementById('article-notes-template')?.textContent||'null')}catch(e){}
 const title=config?.title||document.getElementById('article-title')?.textContent?.trim()||document.title;
 const citation=config?.citation||document.querySelector('header')?.textContent?.trim()||title;
 const doi=config?.doi||document.querySelector('header a[href^="https://doi.org/"]')?.href||'';
 const figures=config?.figures||[...document.querySelectorAll('article figure')].map((f,i)=>({title:f.querySelector('figcaption')?.textContent?.trim()||'Figure '+(i+1)}));
 const headings=['Abstract','Introduction',...figures.map(f=>f.title),'Discussion','Additional'];
 const parts=[{tag:'h1',text:title+' — Article notes'},{tag:'h2',text:'Full bibliographic citation'},{tag:'p',text:citation},{tag:'p',text:'DOI: '+doi}];
 if(config?.version)parts.push({tag:'p',text:'Source version: '+config.version});
 for(const title of headings){parts.push({tag:'h2',text:title},{tag:'p',text:'Notes: '});if(/^Fig(?:ure)?\b/i.test(title))parts.push({tag:'p',text:'Question / experiment: '},{tag:'p',text:'Main result and interpretation: '},{tag:'p',text:'Limitations / relevance to Fig5: '})}
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return {text:parts.map(p=>p.text).join('\n\n'),html:'<!doctype html><html><meta charset="utf-8"><body>'+parts.map(p=>'<'+p.tag+'>'+escape(p.text)+'</'+p.tag+'>').join('')+'</body></html>'};
}
let generatedNotes=null;
async function copyArticleNotes(){
 const template=generatedNotes||(generatedNotes=articleNotes());
 document.getElementById('google-notes-text').value=template.text;
 let copied=false;
 try{
  if(navigator.clipboard?.write&&window.ClipboardItem){
   await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([template.html],{type:'text/html'}),'text/plain':new Blob([template.text],{type:'text/plain'})})]);copied=true;
  }else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(template.text);copied=true}
 }catch(e){}
 if(!copied){
  const input=document.getElementById('google-notes-text');input.focus();input.select();
  try{copied=document.execCommand('copy')}catch(e){}
 }
 document.getElementById('google-notes-message').textContent=copied?'Template copied. In your new Google Doc, paste once (Ctrl+V or Cmd+V). The reader cannot write directly into your Google account.':'Your template is ready below. Select and copy it, then paste it into a new Google Doc. Clipboard permission was unavailable.';
 return copied;
}
notesButton.onclick=()=>{
 const nativeTemplate=document.getElementById('google-notes-template')?.getAttribute('href');
 if(nativeTemplate&&/^https:\/\/docs\.google\.com\/document\/d\/[A-Za-z0-9_-]+\/(?:copy|edit)(?:[?#].*)?$/.test(nativeTemplate)){
  const copyUrl=nativeTemplate.replace(/\/edit(?=[?#]|$)/,'/copy');
  window.open(copyUrl,'_blank','noopener,noreferrer');
  status('Google Docs template opened. Choose Make a copy to create your notes.');
  return;
 }

 generatedNotes=articleNotes();
 document.getElementById('google-notes-text').value=generatedNotes.text;
 if(!notesDialog.open)notesDialog.showModal();
 // Open synchronously so popup blocking does not depend on an awaited clipboard call.
 window.open('https://docs.google.com/document/create','_blank','noopener,noreferrer');
 copyArticleNotes();
};
document.getElementById('google-notes-copy').onclick=()=>copyArticleNotes();
document.getElementById('google-notes-launch').onclick=()=>window.open('https://docs.google.com/document/create','_blank','noopener,noreferrer');
document.getElementById('google-notes-close').onclick=()=>notesDialog.close();

const figureBank=document.createElement('section');figureBank.id='figure-bank';const title=document.createElement('h2');title.textContent='Figures & original pages';figureBank.append(title);const figures=[...article.querySelectorAll('figure')].filter(f=>!f.closest('details')||!f.closest('details').querySelector('summary')?.textContent.includes('Original page'));
const originals=[...article.children].filter(e=>e.tagName==='DETAILS'&&e.querySelector('summary')?.textContent.includes('Original page'));
figures.forEach((f,i)=>{const slot=document.createElement('span');slot.id='figure-slot-'+i;f.before(slot);f.dataset.originalSlot=slot.id;figureBank.append(f)});originals.forEach(f=>figureBank.append(f));if(figures.length||originals.length)article.append(figureBank);
const study=document.createElement('section');study.id='figure-study';study.hidden=true;document.querySelector('main').after(study);
const side=document.createElement('aside');side.id='anki-panel';side.hidden=true;side.innerHTML='<div class="panel-title"><h2>Anki cards</h2><button id="anki-close">Close</button></div><div class="anki-actions"><button id="anki-add">Add</button><button id="anki-generate">Automatically generate</button><button id="anki-export">Export TSV</button></div><label>Generate from <select id="anki-scope"><option value="section">Current section</option><option value="article">Whole article</option></select></label><label>Batch size <input id="anki-limit" type="number" min="1" max="100" value="20"></label><p id="anki-count"></p><p>Click any card to edit it. Drafts and saved cards stay in this scrollable library.</p><div id="anki-list"></div>';document.body.append(side);
const editor=document.createElement('dialog');editor.id='anki-editor';editor.innerHTML='<div class="panel-title"><h2>Edit Anki card</h2><button id="anki-editor-close">Back to cards</button></div><p id="anki-editor-source"></p><label for="anki-editor-text">Text</label><textarea id="anki-editor-text" rows="7"></textarea><button id="anki-cloze">Cloze selected term</button><label for="anki-editor-extra">Extra</label><textarea id="anki-editor-extra" rows="3"></textarea><label for="anki-editor-tags">Tags</label><input id="anki-editor-tags"><p id="anki-editor-status" role="status"></p><div class="anki-actions"><button id="anki-save" class="primary">Save card</button><button id="anki-delete">Delete card</button></div>';document.body.append(editor);let editingId=null;
function status(t){$('study-status').textContent=t}
function save(){state.updated=Date.now();try{localStorage.setItem(key,JSON.stringify(state))}catch(e){status('Browser storage unavailable. Save or download HTML to keep your work.')}if(fileHandle){clearTimeout(saveTimer);saveTimer=setTimeout(()=>writeFile(),900)}}
window.addEventListener('htmlaud-change',save);
function cleanClone(){const clone=document.documentElement.cloneNode(true);for(const id of ['voice','rate','section','captions','refs','follow']){const original=document.getElementById(id),copy=clone.querySelector('#'+id);if(!original||!copy)continue;if(original.tagName==='SELECT'){[...copy.options].forEach(o=>o.toggleAttribute('selected',o.value===original.value))}else if(original.type==='checkbox'){copy.toggleAttribute('checked',original.checked)}else copy.setAttribute('value',original.value)}for(const id of ['reader-settings','reader-help']){const el=clone.querySelector('#'+id);if(el){if(id==='reader-settings'){const body=el.querySelector('.reader-setting-fields');if(body)el.replaceWith(...body.childNodes);else el.remove()}else{const hint=el.querySelector('.hint');if(hint)el.replaceWith(hint);else el.remove()}}}['annotation-tools','annotation-notes','annotation-ink','ann-dialog','study-tools','study-pins','figure-study','anki-panel','study-crop','reading-progress','htmlaud-state','text-reading-time','anki-editor','anki-celebration','raw-pdf-view','google-notes-dialog','reader-sidebar','reader-sidebar-toggle','study-fullfigure','figure-network'].forEach(id=>clone.querySelector('#'+id)?.remove());clone.querySelectorAll('.ann-pin').forEach(n=>n.remove());clone.querySelectorAll('.readable.speaking').forEach(e=>e.classList.remove('speaking'));clone.querySelectorAll('nav a').forEach(e=>e.classList.remove('reading-current','reading-done'));clone.querySelector('body').classList.remove('figure-mode','anki-open','raw-pdf-mode','reader-tools-open','network-mode');const bank=clone.querySelector('#figure-bank');if(bank){[...bank.children].filter(e=>e.tagName!=='H2').forEach(e=>{const slot=e.dataset.originalSlot?clone.querySelector('#'+e.dataset.originalSlot):null;if(slot){slot.replaceWith(e);delete e.dataset.originalSlot}else bank.before(e)});bank.remove()}const data=document.createElement('script');data.type='application/json';data.id='htmlaud-state';data.textContent=JSON.stringify({version:2,annotations:api.get(),study:state}).replace(/</g,'\u003c');clone.querySelector('head').append(data);return '<!doctype html>\n'+clone.outerHTML}
async function writeFile(){saveTimer=null;if(!fileHandle)return;const html=cleanClone();writes=writes.catch(()=>{}).then(async()=>{try{const stream=await fileHandle.createWritable();await stream.write(html);await stream.close();status('Saved into HTML · '+new Date().toLocaleTimeString())}catch(e){status('HTML save failed. Use Download saved HTML to keep your work.')}});return writes}
$('save-connect').onclick=async()=>{if(!window.showSaveFilePicker){status('Direct autosave requires Edge/Chrome with file access. Use Download saved HTML.');return}try{fileHandle=await showSaveFilePicker({suggestedName:decodeURIComponent(location.pathname.split('/').pop()||'Article Reader.html'),types:[{description:'HTML audio reader',accept:{'text/html':['.html']}}]});await writeFile();$('save-connect').textContent='HTML autosave enabled'}catch(e){if(e.name!=='AbortError')status('File access unavailable. Use Download saved HTML.')}};
$('save-html').onclick=()=>download(cleanClone(),'text/html',document.title.replace(/[<>:"/\|?*]/g,'')+' - saved.html');
function download(text,type,name){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
$('notes-toggle').onclick=()=>{document.body.classList.toggle('hide-sticky-notes')};
const links=[...document.querySelectorAll('nav a[href^="#"]')],progress=document.createElement('div');progress.id='reading-progress';progress.innerHTML='<strong>Reading progress</strong><progress max="100" value="0"></progress><span></span>';document.querySelector('nav').prepend(progress);
const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const index=blocks.indexOf(e.target);if(!state.read.includes(index)){state.read.push(index);save()}links.forEach(l=>{const target=document.getElementById(decodeURIComponent(l.hash.slice(1))),j=blocks.indexOf(target);l.classList.toggle('reading-done',j>=0&&state.read.includes(j))});let active=null;for(const l of links){const t=document.getElementById(decodeURIComponent(l.hash.slice(1)));if(t&&blocks.indexOf(t)<=index)active=l}links.forEach(l=>l.classList.toggle('reading-current',l===active));const percentage=Math.round(state.read.length/Math.max(1,blocks.length)*100);progress.querySelector('progress').value=percentage;progress.querySelector('span').textContent=percentage+'% visited'}} ,{rootMargin:'-10% 0px -40% 0px',threshold:.1});blocks.forEach(b=>observer.observe(b));
let quoteSelection=null;document.addEventListener('selectionchange',()=>{const sel=getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;const range=sel.getRangeAt(0);const active=$('study-toggle').checked?study:article;if(!active.contains(range.startContainer)||!active.contains(range.endContainer))return;const selected=sel.toString().trim();if(selected){const single=blocks.find(b=>b.contains(range.startContainer)&&b.contains(range.endContainer));let context='';if(single&&selected.split(/\s+/).length<=5){const before=document.createRange();before.selectNodeContents(single);before.setEnd(range.startContainer,range.startOffset);const start=before.toString().length;context=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(single.textContent)].find(x=>start>=x.index&&start<x.index+x.segment.length)?.segment.trim()||''}quoteSelection={quote:selected,context}}});
const articleTitle=document.getElementById('article-title')?.textContent.trim()||document.querySelector('article h1')?.textContent.trim()||document.title;
const articleTag=articleTitle.replace(/\s+/g,'_');
// Local card-edit preferences. No chat access, network calls, or factual inference.
state.learning??={enabled:true,edits:[],disabled:[]};
const learning=state.learning;
if(!Array.isArray(learning.edits))learning.edits=[];
if(!Array.isArray(learning.disabled))learning.disabled=[];
const preferenceTypes={
 shorter:{label:'Shorter cloze deletions',applies:true},
 fewer:{label:'Fewer deletions per card',applies:true},
 hints:{label:'Add targeted hints',applies:false},
 extra:{label:'Add explanations in Extra',applies:false}
};
const preferencesButton=document.createElement('button');preferencesButton.id='anki-preferences';preferencesButton.textContent='Learned preferences';preferencesButton.setAttribute('aria-expanded','false');side.querySelector('.anki-actions').append(preferencesButton);
const preferenceView=document.createElement('section');preferenceView.id='anki-preference-view';preferenceView.hidden=true;
preferenceView.innerHTML='<h3>Learned preferences</h3><p class="learning-skill-note">update the skill with this to get better card performance</p><label><input id="anki-learn-enabled" type="checkbox"> Learn from my saved card edits</label><p>Local to this reader. Patterns need edits to at least 3 different cards. This does not read chats or verify scientific corrections. Only shorter/fewer cloze preferences adjust future drafts; hints and Extra preferences are recorded for review.</p><div class="anki-actions"><button id="anki-preferences-copy">Copy skill update report</button><button id="anki-preferences-export">Export preference log</button><button id="anki-preferences-reset">Reset learning log</button><button id="anki-preferences-back">Back to cards</button></div><p id="anki-learning-status" role="status"></p><div id="anki-preference-list"></div><h4>Saved edit examples</h4><div id="anki-edit-log"></div>';
side.append(preferenceView);
const cardView=[...side.children].filter(e=>e!==preferenceView&&!e.classList.contains('panel-title'));
const clozes=t=>[...String(t||'').matchAll(/\{\{c\d+::([^{}]*?)(?:::([^{}]*?))?\}\}/g)];
const plainCard=t=>String(t||'').replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/g,'$1');
const normalizeCard=t=>String(t||'').replace(/\s+/g,' ').trim();
function preferenceEvidence(type){return learning.edits.filter(e=>e.patterns.includes(type))}
function learnedPreference(type){const evidence=preferenceEvidence(type);return learning.enabled&&evidence.length>=3&&!learning.disabled.includes(type)}
function clozeProfile(){
 const short=learnedPreference('shorter'),few=learnedPreference('fewer');
 const counts=preferenceEvidence('fewer').map(e=>clozes(e.after.text).length).sort((a,b)=>a-b);
 return {short,max:few?Math.max(1,counts[Math.floor(counts.length/2)]||3):3};
}
function recordCardLearning(c){
 if(!learning.enabled){c.learningBaseline={text:c.text,extra:c.extra||'',tags:c.tags||''};return;}
 const after={text:c.text,extra:c.extra||'',tags:c.tags||''};
 const baseline=c.learningBaseline;if(!baseline||!baseline.text?.trim()){c.learningBaseline={...after};return;}
 if(JSON.stringify(baseline)===JSON.stringify(after))return;
 const prior=learning.edits.find(e=>e.cardId===c.id);
 if(prior&&JSON.stringify(prior.after)===JSON.stringify(after))return;
 const a=clozes(baseline.text),b=clozes(after.text),patterns=[];
 const sourceTextChanged=normalizeCard(plainCard(baseline.text))!==normalizeCard(plainCard(after.text));
 if(!sourceTextChanged&&a.length&&b.length){
  const avg=xs=>xs.reduce((n,m)=>n+m[1].trim().length,0)/xs.length;
  if(avg(b)<avg(a)*.8)patterns.push('shorter');
  if(b.length<a.length)patterns.push('fewer');
  if(b.filter(m=>m[2]?.trim()).length>a.filter(m=>m[2]?.trim()).length)patterns.push('hints');
 }
 if(!sourceTextChanged&&(after.extra||'').trim().length>(baseline.extra||'').trim().length)patterns.push('extra');
 const entry={cardId:c.id,date:new Date().toISOString(),source:c.quote||'',before:{...baseline},after,patterns,sourceTextChanged};
 learning.edits=learning.edits.filter(e=>e.cardId!==c.id);learning.edits.push(entry);
 if(learning.edits.length>200)learning.edits.splice(0,learning.edits.length-200);
 renderLearning();
}
function learningReport(){
 const lines=['Card-edit preferences for '+articleTitle,'update the skill with this to get better card performance','Evidence comes from saved card edits in this reader, not chats. Scientific wording changes require separate source review.',''];
 for(const [key,value] of Object.entries(preferenceTypes)){
  const evidence=preferenceEvidence(key);
  if(!evidence.length)continue;
  lines.push(value.label+': '+evidence.length+' different cards; '+(evidence.length>=3?'repeated pattern':'not enough evidence yet')+(learning.disabled.includes(key)?'; disabled':''));
  for(const e of evidence.slice(-3))lines.push('Before: '+e.before.text,'After: '+e.after.text,...(key==='extra'?['Extra before: '+e.before.extra,'Extra after: '+e.after.extra]:[]));
  lines.push('');
 }
 if(!learning.edits.length)lines.push('No edited-card evidence recorded yet.');
 return lines.join('\n');
}
function renderLearning(){
 $('anki-learn-enabled').checked=learning.enabled;
 const list=$('anki-preference-list');list.replaceChildren();
 for(const [key,value] of Object.entries(preferenceTypes)){
  const evidence=preferenceEvidence(key),row=document.createElement('section');row.className='learning-pattern';
  const label=document.createElement('strong');label.textContent=value.label;
  const count=document.createElement('p');count.textContent=evidence.length+' different edited cards · '+(evidence.length<3?'Collecting evidence':learning.disabled.includes(key)?'Disabled':value.applies&&learning.enabled?'Applied to new drafts':'Recorded for review');
  const toggle=document.createElement('button');toggle.textContent=learning.disabled.includes(key)?'Enable preference':'Disable preference';toggle.onclick=()=>{learning.disabled=learning.disabled.includes(key)?learning.disabled.filter(x=>x!==key):[...learning.disabled,key];save();renderLearning()};
  const remove=document.createElement('button');remove.textContent='Delete evidence';remove.onclick=()=>{for(const e of learning.edits)e.patterns=e.patterns.filter(x=>x!==key);save();renderLearning()};
  row.append(label,count,toggle,remove);list.append(row);
 }
 const log=$('anki-edit-log');log.replaceChildren();
 if(!learning.edits.length){const p=document.createElement('p');p.textContent='No saved edit comparisons yet. Edit a suggested card and choose Save card to begin.';log.append(p)}
 for(const e of learning.edits.slice().reverse()){
  const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent=new Date(e.date).toLocaleString()+' · '+(e.sourceTextChanged?'Wording changed — source review required':e.patterns.map(k=>preferenceTypes[k].label).join(', ')||'Other edit');
  const before=document.createElement('pre'),after=document.createElement('pre');before.textContent='Before\n'+e.before.text+'\nExtra: '+(e.before.extra||'');after.textContent='After\n'+e.after.text+'\nExtra: '+(e.after.extra||'');
  const remove=document.createElement('button');remove.textContent='Delete this example';remove.onclick=()=>{learning.edits=learning.edits.filter(x=>x.cardId!==e.cardId);save();renderLearning()};detail.append(summary,before,after,remove);log.append(detail);
 }
}
function showLearning(show){for(const e of cardView)e.hidden=show;preferenceView.hidden=!show;preferencesButton.setAttribute('aria-expanded',String(show));if(show)renderLearning()}
preferencesButton.onclick=()=>showLearning(true);
$('anki-preferences-back').onclick=()=>showLearning(false);
$('anki-learn-enabled').onchange=e=>{learning.enabled=e.target.checked;save();renderLearning()};
$('anki-preferences-reset').onclick=()=>{learning.edits=[];learning.disabled=[];save();renderLearning();$('anki-learning-status').textContent='Learning log reset. Cards and notes were kept.'};
$('anki-preferences-export').onclick=()=>download(JSON.stringify({version:1,article:articleTitle,learning},null,2),'application/json','card-edit-preferences.json');
$('anki-preferences-copy').onclick=async()=>{
 const report=learningReport();try{await navigator.clipboard.writeText(report);$('anki-learning-status').textContent='Report copied. Paste it into a chat and ask to update the skill.'}catch(e){let area=$('anki-learning-report');if(!area){area=document.createElement('textarea');area.id='anki-learning-report';area.setAttribute('aria-label','Skill update report');preferenceView.append(area)}area.value=report;area.focus();area.select();$('anki-learning-status').textContent='Select and copy the report below to request a skill update.'}
};
renderLearning();

function autoCloze(text){
 const dictionary=['programmed cell death','gasdermin E','cell cycle','cell membrane','amino acids','amino acid','fatty acid oxidation','fatty acids','fatty acid','oxidative phosphorylation','substrate-level phosphorylation','electron transport chain','cellular respiration','oxidative stress','activation energy','negative feedback','positive feedback','membrane potential','action potential','concentration gradient','electrochemical gradient','active transport','passive transport','facilitated diffusion','simple diffusion','mitochondrial membrane','mitochondria','transcription factors','transcription factor','transcription','translation','DNA replication','apoptosis','pyroptosis','ferroptosis','necrosis','fibroinflammation','fibrosis','inflammation','fibroblasts','hepatocytes','glycolysis','gluconeogenesis','lipolysis','hydrolysis','phosphorylation','dephosphorylation','acetylation','methylation','ubiquitination','oxidation','reduction','diffusion','osmosis','homeostasis','insulin','glucagon','epinephrine','cortisol','enzymes','enzyme','catalyst','competitive inhibition','noncompetitive inhibition','allosteric','immunosuppression','immunosuppressive','cytotoxic','immunotherapy','fenofibrate','collagen','caspase-3','GSDME','PPARα','PPARalpha','PD-1','CD8','T cells','macrophages'];
 let candidates=[];for(const term of dictionary){const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp('(?<![\\p{L}\\p{N}])'+escaped+'(?![\\p{L}\\p{N}])','giu');for(const m of text.matchAll(re))candidates.push({start:m.index,end:m.index+m[0].length,score:term.length+10})}
 for(const m of text.matchAll(/\b(?:[A-Z][A-Z0-9αβγκ-]{2,}|\d+(?:\.\d+)?\s*(?:mM|μM|nM|mg|μg|ng|mL|μL|mm|μm|%|°C|hours?|days?|minutes?))\b/gu))candidates.push({start:m.index,end:m.index+m[0].length,score:12});
 if(!candidates.length){const stop=new Set('these those their there which where while could would should because between through during therefore however although include includes including result results study studies showed shows shown observed suggest suggests demonstrate demonstrated significantly associated respectively compared using further following potential effects effect'.split(' '));for(const m of text.matchAll(/\b[\p{L}][\p{L}-]{5,}\b/gu))if(!stop.has(m[0].toLowerCase()))candidates.push({start:m.index,end:m.index+m[0].length,score:m[0].length})}
 const profile=clozeProfile();candidates.sort((a,b)=>profile.short?(a.end-a.start)-(b.end-b.start)||b.score-a.score:b.score-a.score);const chosen=[];for(const c of candidates){if(chosen.length>=profile.max)break;if(chosen.reduce((n,x)=>n+x.end-x.start,0)+c.end-c.start>text.length*.4||chosen.some(x=>c.start<x.end&&c.end>x.start))continue;chosen.push(c)}chosen.sort((a,b)=>a.start-b.start);let output='',cursor=0,concepts=new Map();for(const c of chosen){const term=text.slice(c.start,c.end),key=term.toLowerCase();if(!concepts.has(key))concepts.set(key,concepts.size+1);output+=text.slice(cursor,c.start)+'{{c'+concepts.get(key)+'::'+term+'}}';cursor=c.end}return output+text.slice(cursor)
}
function openCards(){side.hidden=false;document.body.classList.add('anki-open');showLearning(false)}
function celebrate(){const old=document.getElementById('anki-celebration');old?.remove();const root=document.createElement('div');root.id='anki-celebration';const message=document.createElement('div');message.className='celebrate-message';message.setAttribute('role','status');message.textContent='Way to Go! ♥ Knowledge is Power';root.append(message);if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)for(let i=0;i<44;i++){const heart=document.createElement('span');heart.textContent=['♥','♡','💗'][i%3];heart.className='confetti-heart';heart.setAttribute('aria-hidden','true');heart.style.left=Math.random()*100+'vw';heart.style.setProperty('--heart-drift',(Math.random()-.5)*300+'px');heart.style.animationDelay=Math.random()*.5+'s';heart.style.color=['#d774ac','#9b7bc5','#61bfae'][i%3];root.append(heart)}document.body.append(root);setTimeout(()=>root.remove(),3200)}
function renderCards(){const list=$('anki-list'),scroll=list.scrollTop;list.replaceChildren();$('anki-count').textContent=state.cards.length+' cards · '+state.cards.filter(c=>c.draft).length+' drafts';if(!state.cards.length){const empty=document.createElement('p');empty.textContent='Your cards will appear here. Use Add, Automatically generate, or Selection → Anki.';list.append(empty)}for(const [index,c]of state.cards.entries()){const card=document.createElement('section');card.className='anki-card';card.dataset.cardId=c.id;const edit=document.createElement('button');edit.className='anki-card-preview';edit.setAttribute('aria-label','Edit card '+(index+1));const label=document.createElement('strong');label.textContent='Card '+(index+1)+(c.draft?' · Draft':'');const preview=document.createElement('p');preview.textContent=c.text?c.text.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/g,'[$1]'):'Empty card — click to write';const tags=document.createElement('small');tags.textContent=c.tags||articleTag;edit.append(label,preview,tags);edit.onclick=()=>openEditor(c.id);const del=document.createElement('button');del.textContent='Delete';del.setAttribute('aria-label','Delete card '+(index+1));del.onclick=()=>deleteCard(c.id);card.append(edit,del);list.append(card)}list.scrollTop=scroll}
function openEditor(id){const c=state.cards.find(c=>c.id===id);if(!c)return;c.learningBaseline??={text:c.text,extra:c.extra||'',tags:c.tags||''};editingId=id;$('anki-editor-text').value=c.text;$('anki-editor-extra').value=c.extra||'';$('anki-editor-tags').value=c.tags||articleTag;$('anki-editor-source').textContent=c.quote?'Source: '+c.quote:'New card';$('anki-editor-status').textContent='Edits are kept as a draft. Save card adds the finished card to your library.';openCards();if(!editor.open)editor.showModal();$('anki-editor-text').focus()}
function currentCard(){return state.cards.find(c=>c.id===editingId)}
function storeEditor(){const c=currentCard();if(!c)return;c.text=$('anki-editor-text').value;c.extra=$('anki-editor-extra').value;c.tags=$('anki-editor-tags').value;c.draft=true;save()}
for(const id of ['anki-editor-text','anki-editor-extra','anki-editor-tags'])$(id).addEventListener('input',storeEditor);
function deleteCard(id){state.cards=state.cards.filter(c=>c.id!==id);if(editingId===id){editingId=null;editor.close()}save();renderCards()}
$('anki-delete').onclick=()=>deleteCard(editingId);$('anki-editor-close').onclick=()=>{storeEditor();editor.close();renderCards()};editor.addEventListener('cancel',()=>{storeEditor();renderCards()});
$('anki-cloze').onclick=()=>{const text=$('anki-editor-text'),a=text.selectionStart,b=text.selectionEnd;if(a===b){$('anki-editor-status').textContent='Select an essential term in Text first.';return}const answer=text.value.slice(a,b);if(answer.includes('{{')||answer.includes('}}'))return;const nums=[...text.value.matchAll(/\{\{c(\d+)::/g)].map(m=>+m[1]),n=nums.length?Math.max(...nums)+1:1;const hint=prompt('Optional hint (blank for none):','');if(hint===null)return;text.value=text.value.slice(0,a)+'{{c'+n+'::'+answer+(hint?'::'+hint:'')+'}}'+text.value.slice(b);storeEditor()};
$('anki-save').onclick=()=>{storeEditor();const c=currentCard();if(!c||!c.text.trim()){ $('anki-editor-status').textContent='Write the card text before saving.';return}if(!/\{\{c1::[^{}]+\}\}/.test(c.text)){ $('anki-editor-status').textContent='Add a c1 cloze before saving. Select a key term and choose Cloze selected term.';return}recordCardLearning(c);c.draft=false;save();editor.close();renderCards();openCards();listCard(c.id);celebrate()};
function listCard(id){const el=[...$('anki-list').children].find(el=>el.dataset.cardId===id);el?.scrollIntoView({block:'nearest'})}
function makeCards(selected,limit=Infinity){const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(selected)].map(s=>s.segment.trim()).filter(Boolean),known=new Set(state.cards.map(c=>c.quote)),made=[];for(const sentence of sentences){if(made.length>=limit)break;if(known.has(sentence))continue;const text=autoCloze(sentence);if(!text.includes('{{c1::'))continue;const c={id:crypto.randomUUID(),text,extra:'',tags:articleTag,quote:sentence,draft:true,learningBaseline:{text,extra:'',tags:articleTag}};state.cards.push(c);made.push(c);known.add(sentence)}save();renderCards();openCards();return made}
$('anki-new').onclick=()=>{if(!quoteSelection){status('Select the section or sentence you want to turn into cards.');return}const made=makeCards(quoteSelection.context||quoteSelection.quote);if(made.length)openEditor(made[0].id);status(made.length+' editable cloze drafts created in your card library.')};
$('anki-add').onclick=()=>{const c={id:crypto.randomUUID(),text:'',extra:'',tags:articleTag,quote:'',draft:true};state.cards.push(c);save();renderCards();openEditor(c.id)};
$('anki-generate').onclick=()=>{let start=0,end=blocks.length;if($('anki-scope').value==='section'){const href=document.querySelector('nav a.reading-current')?.hash;const target=document.getElementById(href?decodeURIComponent(href.slice(1)):$('section').value);start=Math.max(0,blocks.indexOf(target));if(blocks[start]?.id==='article-title')start=Math.max(0,blocks.findIndex(b=>b.id==='abstract'));const heading=blocks[start];if(/^H[234]$/.test(heading?.tagName||'')){const next=blocks.findIndex((b,i)=>i>start&&/^H[234]$/.test(b.tagName)&&Number(b.tagName[1])<=Number(heading.tagName[1]));if(next>=0)end=next}}
const text=blocks.slice(start,end).filter(b=>b.tagName==='P'&&(!b.dataset.kind||b.dataset.kind==='text')&&!b.closest('figure')).map(b=>b.textContent).join('\n\n');const limit=Math.min(100,Math.max(1,Number($('anki-limit').value)||20)),made=makeCards(text,limit);status(made.length?made.length+' automatic cloze drafts added. Click any card to review, edit, and Save card.':'No new cards found in this scope; try Whole article. Existing cards were kept.');if(made.length){listCard(made[0].id);celebrate()}};
$('anki-toggle').onclick=openCards;$('anki-close').onclick=()=>{side.hidden=true;document.body.classList.remove('anki-open')};
function tsvField(s){return /[\t\n\r"]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
$('anki-export').onclick=()=>{const valid=state.cards.filter(c=>!c.draft&&/\{\{c1::[^{}]+\}\}/.test(c.text));if(!valid.length){status('Add at least one c1 cloze before exporting.');return}const rows=valid.map(c=>[c.text,c.extra,c.tags].map(tsvField).join('\t'));download('#separator:Tab\n#html:false\n#notetype:Cloze\n#columns:Text\tExtra\tTags\n'+rows.join('\n'),'text/tab-separated-values;charset=utf-8','MCAT-cloze-notes.tsv');status(valid.length+' notes exported; '+(state.cards.length-valid.length)+' incomplete drafts skipped.')};
// Automatic crops always retain the immutable full-figure image as their source.
state.cropRects??={};
let panelMap={};try{panelMap=JSON.parse($('figure-panel-map')?.textContent||'{}')}catch(e){}
const figureImages=new Map(),trimBoxes=new Map();
function loadFigure(src){if(!figureImages.has(src))figureImages.set(src,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Figure image could not be loaded'));im.src=src}));return figureImages.get(src)}
function boundRect(r){const x=Math.max(0,Math.min(.99,Number(r.x)||0)),y=Math.max(0,Math.min(.99,Number(r.y)||0));return {x,y,w:Math.max(.01,Math.min(1-x,Number(r.w)||1)),h:Math.max(.01,Math.min(1-y,Number(r.h)||1))}}
function unionBoxes(rectangles){const x=Math.min(...rectangles.map(r=>r.x)),y=Math.min(...rectangles.map(r=>r.y));return boundRect({x,y,w:Math.max(...rectangles.map(r=>r.x+r.w))-x,h:Math.max(...rectangles.map(r=>r.y+r.h))-y})}
function panelLetters(value){const letters=[];for(const m of value.toLowerCase().replace(/and/g,',').matchAll(/([a-z])\s*[–−-]\s*([a-z])|([a-z])/g)){if(m[3])letters.push(m[3]);else{const a=m[1].charCodeAt(0),b=m[2].charCodeAt(0);if(b>=a&&b-a<26)for(let i=a;i<=b;i++)letters.push(String.fromCharCode(i))}}return [...new Set(letters)]}
async function whitespaceTrim(src){
 if(trimBoxes.has(src))return trimBoxes.get(src);
 const im=await loadFigure(src),c=document.createElement('canvas'),scale=Math.min(1,650/im.naturalWidth,650/im.naturalHeight);c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,c.width,c.height);let rect={x:0,y:0,w:1,h:1};
 try{const pixels=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(pixels[i+3]>50&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<242){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}}if(x1>x0&&y1>y0){const pad=5;rect=boundRect({x:Math.max(0,x0-pad)/c.width,y:Math.max(0,y0-pad)/c.height,w:(Math.min(c.width,x1+pad+1)-Math.max(0,x0-pad))/c.width,h:(Math.min(c.height,y1+pad+1)-Math.max(0,y0-pad))/c.height})}}catch(e){}
 trimBoxes.set(src,rect);return rect;
}
async function autoCrop(number,panel,src){const letters=panelLetters(panel),map=panelMap.figures?.[number];if(letters.length&&map&&letters.every(l=>map.panels?.[l]))return {rect:unionBoxes(letters.map(l=>map.panels[l])),label:'Automatic panel crop · Figure '+number+panel+' · check or adjust',mapped:true};return {rect:await whitespaceTrim(src),label:(letters.length?'Automatic whole-figure trim · panel boundary not mapped':'Automatic whole-figure trim')+' · adjust if needed',mapped:false}}
function cropData(im,r){r=boundRect(r);const c=document.createElement('canvas');c.width=Math.max(1,Math.round(r.w*im.naturalWidth));c.height=Math.max(1,Math.round(r.h*im.naturalHeight));c.getContext('2d').drawImage(im,r.x*im.naturalWidth,r.y*im.naturalHeight,r.w*im.naturalWidth,r.h*im.naturalHeight,0,0,c.width,c.height);return c.toDataURL('image/png')}

const fullFigure=document.createElement('dialog');fullFigure.id='study-fullfigure';fullFigure.innerHTML='<div class="crop-dialog-head"><h2>Original full figure</h2><button id="fullfigure-close">Close</button></div><p id="fullfigure-info"></p><div class="crop-actions"><button id="fullfigure-fit">Fit window</button><button id="fullfigure-native">100% size</button><button id="fullfigure-double">200% size</button></div><div class="fullfigure-scroll"><img id="fullfigure-image" alt="Original full figure"></div>';document.body.append(fullFigure);
async function viewFullFigure(src,label){const im=await loadFigure(src),target=$('fullfigure-image');target.src=src;target.alt=label+' · original full figure';target.style.width=im.naturalWidth+'px';target.style.maxWidth='none';$('fullfigure-info').textContent=label+' · original embedded image: '+im.naturalWidth+' × '+im.naturalHeight+' pixels. Scroll to inspect; the original is never replaced by a crop.';if(!fullFigure.open)fullFigure.showModal()}
$('fullfigure-close').onclick=()=>fullFigure.close();$('fullfigure-fit').onclick=()=>{$('fullfigure-image').style.width='100%';$('fullfigure-image').style.maxWidth='100%'};$('fullfigure-native').onclick=()=>{$('fullfigure-image').style.width=$('fullfigure-image').naturalWidth+'px';$('fullfigure-image').style.maxWidth='none'};$('fullfigure-double').onclick=()=>{$('fullfigure-image').style.width=($('fullfigure-image').naturalWidth*2)+'px';$('fullfigure-image').style.maxWidth='none'};

const cropDialog=document.createElement('dialog');cropDialog.id='study-crop';cropDialog.innerHTML='<div class="crop-dialog-head"><h2>Adjust figure crop</h2><button id="crop-cancel">Cancel</button></div><p>Drag a corner to resize, drag inside to move, or draw a new rectangle. The whole original figure remains visible.</p><div class="crop-canvas-scroll"><canvas aria-label="Full figure with adjustable crop rectangle"></canvas></div><div class="crop-fields"><label>Left % <input id="crop-x" type="number" min="0" max="99" step="0.1"></label><label>Top % <input id="crop-y" type="number" min="0" max="99" step="0.1"></label><label>Width % <input id="crop-w" type="number" min="1" max="100" step="0.1"></label><label>Height % <input id="crop-h" type="number" min="1" max="100" step="0.1"></label></div><p id="crop-selection-info" role="status"></p><div class="crop-actions"><button id="crop-save">Save adjusted crop</button><button id="crop-auto">Use automatic crop</button><button id="crop-whole">Select whole figure</button><button id="crop-original">View original full size</button></div>';document.body.append(cropDialog);
const canvas=cropDialog.querySelector('canvas'),ctx=canvas.getContext('2d');let cropTarget=null,cropImage=null,rect=null,initialCrop=null,drag=null,cropSource='',cropLabel='';
function syncCropFields(){if(!rect)return;for(const [name,key]of [['x','x'],['y','y'],['w','w'],['h','h']])$('crop-'+name).value=(rect[key]*100).toFixed(1);$('crop-selection-info').textContent='Selected '+Math.round(rect.w*cropImage.naturalWidth)+' × '+Math.round(rect.h*cropImage.naturalHeight)+' pixels from the original image.'}
function paint(){if(!cropImage||!rect)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(cropImage,0,0,canvas.width,canvas.height);const x=rect.x*canvas.width,y=rect.y*canvas.height,w=rect.w*canvas.width,h=rect.h*canvas.height;ctx.fillStyle='#102a4366';ctx.fillRect(0,0,canvas.width,y);ctx.fillRect(0,y+h,canvas.width,canvas.height-y-h);ctx.fillRect(0,y,x,h);ctx.fillRect(x+w,y,canvas.width-x-w,h);ctx.strokeStyle='#d946ef';ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#ffffff';for(const [a,b]of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){ctx.fillRect(a-5,b-5,10,10);ctx.strokeRect(a-5,b-5,10,10)}syncCropFields()}
async function crop(id,src,number,panel){cropTarget=id;cropSource=src;cropLabel='Figure '+number+panel;cropImage=await loadFigure(src);initialCrop=await autoCrop(number,panel,src);rect=boundRect(state.cropRects[id]||initialCrop.rect);const scale=Math.min(1,1050/cropImage.naturalWidth,640/cropImage.naturalHeight);canvas.width=Math.round(cropImage.naturalWidth*scale);canvas.height=Math.round(cropImage.naturalHeight*scale);paint();if(!cropDialog.open)cropDialog.showModal()}
function cp(e){const b=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))]}
canvas.onpointerdown=e=>{e.preventDefault();const [x,y]=cp(e),b=canvas.getBoundingClientRect(),corners=[['nw',rect.x,rect.y],['ne',rect.x+rect.w,rect.y],['sw',rect.x,rect.y+rect.h],['se',rect.x+rect.w,rect.y+rect.h]],handle=corners.find(c=>Math.abs(c[1]-x)*b.width<13&&Math.abs(c[2]-y)*b.height<13);drag={x,y,start:{...rect},mode:handle?.[0]||(x>=rect.x&&x<=rect.x+rect.w&&y>=rect.y&&y<=rect.y+rect.h?'move':'new')};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!drag)return;const [x,y]=cp(e),a=drag.start;if(drag.mode==='move')rect={...a,x:Math.max(0,Math.min(1-a.w,a.x+x-drag.x)),y:Math.max(0,Math.min(1-a.h,a.y+y-drag.y))};else{let x0,y0,x1,y1;if(drag.mode==='new'){x0=drag.x;y0=drag.y;x1=x;y1=y}else{x0=drag.mode.includes('w')?x:a.x;y0=drag.mode.includes('n')?y:a.y;x1=drag.mode.includes('e')?x:a.x+a.w;y1=drag.mode.includes('s')?y:a.y+a.h}rect=boundRect({x:Math.min(x0,x1),y:Math.min(y0,y1),w:Math.abs(x1-x0),h:Math.abs(y1-y0)})}paint()};canvas.onpointerup=()=>drag=null;canvas.onpointercancel=()=>drag=null;
for(const name of ['x','y','w','h'])$('crop-'+name).oninput=()=>{rect=boundRect({x:Number($('crop-x').value)/100,y:Number($('crop-y').value)/100,w:Number($('crop-w').value)/100,h:Number($('crop-h').value)/100});paint()};
$('crop-cancel').onclick=()=>cropDialog.close();$('crop-original').onclick=()=>viewFullFigure(cropSource,cropLabel);$('crop-whole').onclick=()=>{rect={x:0,y:0,w:1,h:1};paint()};$('crop-auto').onclick=()=>{rect={...initialCrop.rect};paint()};
function refreshStudyAt(id){if(id.startsWith('network-')){renderNetworkDetail();return;}const old=$('figure-study').querySelector('[data-study-id="'+CSS.escape(id)+'"]'),top=old?.getBoundingClientRect().top;buildStudy();const row=$('figure-study').querySelector('[data-study-id="'+CSS.escape(id)+'"]');if(row&&Number.isFinite(top))window.scrollBy(0,row.getBoundingClientRect().top-top)}
$('crop-save').onclick=()=>{if(!rect||!cropTarget)return;state.cropRects[cropTarget]={...boundRect(rect)};delete state.crops[cropTarget];save();cropDialog.close();refreshStudyAt(cropTarget)};

function figureCitations(text){const matches=[...text.matchAll(/\bFig(?:ure)?s?\.?\s*(\d+)\s*(?:\(?([a-z](?:\s*(?:,|and|&|[–−-])\s*[a-z])*)\)?)?(?![a-z])/gi)],out=[];for(const m of matches){if(/(?:Supplementary|Supplemental|Extended Data)\s*$/i.test(text.slice(Math.max(0,m.index-30),m.index)))continue;const p=(m[2]||'').replace(/and/gi,',').replace(/&/g,',').replace(/\s+/g,'').toLowerCase();if(!out.some(c=>c.number===m[1]&&c.panel===p))out.push({number:m[1],panel:p})}return out}
async function fillStudyImage(right,id,number,panel,image,label){
 const img=document.createElement('img'),caption=document.createElement('p'),buttons=document.createElement('div');buttons.className='crop-actions';img.alt='Loading crop for Figure '+number+panel;caption.className='crop-status';caption.textContent='Preparing automatic crop…';right.append(caption,img,buttons);
 const original=document.createElement('button');original.textContent='View original full figure';original.onclick=()=>viewFullFigure(image.src,'Figure '+number);const adjust=document.createElement('button');adjust.textContent='Adjust crop';adjust.onclick=()=>crop(id,image.src,number,panel);const reset=document.createElement('button');reset.textContent='Reset to automatic';reset.onclick=()=>{delete state.cropRects[id];delete state.crops[id];save();refreshStudyAt(id)};buttons.append(original,adjust,reset);
 try{const im=await loadFigure(image.src);if(state.cropRects[id]){img.src=cropData(im,state.cropRects[id]);caption.textContent='Your adjusted crop · Figure '+number+panel}else if(state.crops[id]){img.src=state.crops[id];caption.textContent='Your saved crop (kept from the earlier reader)'}else{const initial=await autoCrop(number,panel,image.src);img.src=cropData(im,initial.rect);caption.textContent=initial.label;img.dataset.cropMode=initial.mapped?'mapped-panel':'whole-figure-trim'}img.alt=caption.textContent;img.onclick=()=>viewFullFigure(image.src,'Figure '+number);img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','View original full figure '+number);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')viewFullFigure(image.src,'Figure '+number)}}catch(e){caption.textContent='Automatic crop unavailable; use the original image.';img.src=image.src;img.alt=label}
}
function buildStudy(){study.replaceChildren();const h=document.createElement('h2');h.textContent='Figure study · automatic crops';study.append(h);const hint=document.createElement('p');hint.textContent='Cited panels are cropped from checked panel maps when available. Otherwise only outer whitespace is trimmed. View the original full figure at any time, then adjust or reset the crop. The original image is always preserved.';study.append(hint);let count=0;
 for(const [bi,b]of blocks.entries()){if(b.dataset.kind==='caption'||b.dataset.kind==='reference'||b.closest('figure'))continue;const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(b.textContent)];for(const [si,seg]of sentences.entries()){const citations=figureCitations(seg.segment);for(const [ci,citation]of citations.entries()){
  const {number,panel}=citation,id=bi+'-'+si+(ci?'-figure-'+number+'-'+panel:'');let fig=figures.find(f=>(f.id||'').match(new RegExp('(?:Fig|fig|F)'+number+'$'))||new RegExp('Fig(?:ure)?\\.?\\s*'+number+'\\b','i').test(f.querySelector('figcaption')?.textContent||'')),image=fig?.querySelector('img'),label='Whole figure '+number;
  let legend=fig?.querySelector('details')?.textContent||fig?.querySelector('figcaption')?.textContent||'';if(panel&&legend){const letters=panelLetters(panel),parts=legend.replace(/^Figure caption/,'').split(/(?<=[.!?])\s+(?=\(?[a-z](?:[–-][a-z])?\)?[\s,.])/iu),relevant=parts.filter(p=>letters.some(l=>new RegExp('^\\(?'+l+'(?:[–-][a-z])?\\)?[\\s,.]','i').test(p.trim())));if(relevant.length)legend=relevant.join(' ')}
  if(!image){const page=originals.find(o=>{const m=o.querySelector('summary')?.textContent.match(/page (\d+)/i);if(!m)return false;const start=blocks.findIndex(x=>x.textContent==='Article page '+m[1]),end=blocks.findIndex((x,j)=>j>start&&x.tagName==='H2');return start>=0&&blocks.slice(start+1,end>start?end:undefined).some(x=>new RegExp('Fig\\.?\\s*'+number+'\\b','i').test(x.textContent))});image=page?.querySelector('img');if(image){label='Original page';legend='Original page fallback. Select the relevant figure-legend excerpt from the source.'}}
  const row=document.createElement('div');row.className='study-row';row.dataset.studyId=id;const left=document.createElement('div'),q=document.createElement('blockquote');q.textContent=seg.segment.trim();const tag=document.createElement('strong');tag.textContent='Figure '+number+panel;const legendBox=document.createElement('textarea');legendBox.setAttribute('aria-label','Relevant legend excerpt');legendBox.rows=5;legendBox.value=state.legends[id]??legend.trim();legendBox.oninput=()=>{state.legends[id]=legendBox.value;save()};q.dataset.annKey=id+'-quote';left.dataset.annKey=id+'-text';left.append(tag,q,legendBox);const right=document.createElement('div');right.dataset.annKey=id+'-image';if(image)fillStudyImage(right,id,number,panel,image,label);else{right.className='figure-unavailable';right.textContent='Figure image unavailable in the supplied source. Its caption remains available; no crop can be created.'}row.append(left,right);study.append(row);count++;
 }}}
 if($('study-toggle').checked)api.useSurface(study);if(!count){const p=document.createElement('p');p.textContent='No figure citations were detected in the available text.';study.append(p)}
}

$('study-toggle').onchange=e=>{study.hidden=!e.target.checked;document.body.classList.toggle('figure-mode',e.target.checked);if(e.target.checked){buildStudy();study.scrollIntoView({block:'start'})}else{api.useSurface(article);document.querySelector('main').scrollIntoView({block:'start'})}};
const timeEstimate=document.createElement('span');timeEstimate.id='text-reading-time';timeEstimate.setAttribute('role','status');$('rateLabel').parentElement.after(timeEstimate);
const rawPdf=document.createElement('section');rawPdf.id='raw-pdf-view';rawPdf.hidden=true;rawPdf.innerHTML='<h2>Original PDF · layout check</h2><p>The original article, preserved for comparison with the reading and figure-study views.</p>';const pdfSource=document.getElementById('original-pdf-source');let originalPdfUrl=null;function getOriginalPdfUrl(){if(!originalPdfUrl){const data=pdfSource.getAttribute('href');if(data.startsWith('data:application/pdf;base64,')){const binary=atob(data.split(',')[1]),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));originalPdfUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}))}else originalPdfUrl=data}return originalPdfUrl}if(pdfSource?.getAttribute('href')){const link=document.createElement('a');link.href='#';link.onclick=e=>{e.preventDefault();window.open(getOriginalPdfUrl(),'_blank')};link.textContent='Open original PDF separately';link.target='_blank';rawPdf.append(link);const frame=document.createElement('iframe');frame.title='Original article PDF';frame.dataset.originalPdf='true';rawPdf.append(frame)}else{const p=document.createElement('p');p.textContent='No original PDF is embedded in this reader. Choose your source PDF to glance at it.';const choose=document.createElement('input');choose.type='file';choose.accept='application/pdf';choose.onchange=()=>{if(!choose.files[0])return;rawPdf.querySelector('iframe')?.remove();const f=document.createElement('iframe');f.title='Original article PDF';f.src=URL.createObjectURL(choose.files[0]);rawPdf.append(f)};rawPdf.append(p,choose)}document.querySelector('main').after(rawPdf);$('raw-pdf-toggle').onchange=e=>{rawPdf.hidden=!e.target.checked;document.body.classList.toggle('raw-pdf-mode',e.target.checked);if(e.target.checked){const frame=rawPdf.querySelector('iframe[data-original-pdf]');if(frame&&!frame.getAttribute('src'))frame.src=getOriginalPdfUrl();rawPdf.scrollIntoView({block:'start'})}};
const textWords=blocks.filter(b=>b.tagName==='P'&&(!b.dataset.kind||b.dataset.kind==='text')&&!b.closest('figure')).reduce((total,b)=>{const copy=b.cloneNode(true);copy.querySelectorAll('[data-citation]').forEach(e=>e.remove());return total+[...new Intl.Segmenter('en',{granularity:'word'}).segment(copy.textContent)].filter(s=>s.isWordLike).length},0);
function readingTime(){const speed=Number($('rate').value)||1,seconds=Math.round(textWords/(180*speed)*60),minutes=Math.floor(seconds/60);timeEstimate.textContent='Text only: ~'+(minutes?minutes+'m ':'')+(seconds%60)+'s · '+speed.toFixed(2)+'×';timeEstimate.title=textWords.toLocaleString()+' words, estimated at 180 words/minute at 1×. Figures, captions and references excluded.'}
$('rate').addEventListener('input',readingTime);readingTime();
new ResizeObserver(()=>{const h=document.querySelector('.toolbar').getBoundingClientRect().height;document.documentElement.style.setProperty('--toolbar-height',h+'px')}).observe(document.querySelector('.toolbar'));
window.addEventListener('beforeunload',e=>{if(fileHandle&&saveTimer){e.preventDefault();e.returnValue=''}});renderCards();api.refresh();
// Keep the reading surface broad and the top bar limited to reading controls.
const sidebar=document.createElement('aside');sidebar.id='reader-sidebar';sidebar.setAttribute('aria-label','Annotation and study tools');
const sidebarHead=document.createElement('div');sidebarHead.className='reader-sidebar-head';sidebarHead.innerHTML='<h2>Annotate & study</h2><button id="reader-sidebar-hide" type="button">Hide</button>';
sidebar.append(sidebarHead);
const annotationBar=$('annotation-tools');if(annotationBar)sidebar.append(annotationBar);
const studyHeading=document.createElement('h3');studyHeading.textContent='Study & save';sidebar.append(studyHeading,tools);
const noteList=$('annotation-notes');if(noteList)sidebar.append(noteList);
document.body.append(sidebar);
const controls=document.querySelector('.controls');
const sidebarToggle=document.createElement('button');sidebarToggle.id='reader-sidebar-toggle';sidebarToggle.textContent='Annotate & study';sidebarToggle.setAttribute('aria-controls','reader-sidebar');controls.insertBefore(sidebarToggle,$('status'));
state.ui??={};
function setSidebar(open,persist=true){state.ui.sidebarOpen=open;sidebar.hidden=!open;document.body.classList.toggle('reader-tools-open',open);sidebarToggle.setAttribute('aria-expanded',String(open));if(persist)save();api.refresh()}
sidebarToggle.onclick=()=>setSidebar(sidebar.hidden);$('reader-sidebar-hide').onclick=()=>{setSidebar(false);sidebarToggle.focus()};
setSidebar(state.ui.sidebarOpen??window.matchMedia('(min-width:1100px)').matches,false);
const readingSettings=document.createElement('details');readingSettings.id='reader-settings';const settingSummary=document.createElement('summary');settingSummary.textContent='Reading settings';readingSettings.append(settingSummary);
const settingBody=document.createElement('div');settingBody.className='reader-setting-fields';readingSettings.append(settingBody);
for(const el of [...controls.children])if((el.tagName==='LABEL'&&!el.querySelector('#section'))||el.id==='text-reading-time'||el.id==='font')settingBody.append(el);
controls.insertBefore(readingSettings,$('status'));
const help=document.querySelector('.toolbar > .hint');
if(help){const helpDetails=document.createElement('details');helpDetails.id='reader-help';const summary=document.createElement('summary');summary.textContent='Listening help';helpDetails.append(summary,help);document.querySelector('.toolbar').append(helpDetails)}

// Offline figure → panel → evidence network. Text is always copied from the source.
const network=document.createElement('section');network.id='figure-network';network.hidden=true;
network.innerHTML='<h2>Figure network</h2><p>Follow a figure to its panels and the statements that explicitly cite them. Legends are shown separately. Whole-figure statements are not assigned to individual panels. Open the source paragraph for additional context.</p><div class="network-controls"><label>Figure <select id="network-figure"></select></label><label>Find statements <input id="network-search" type="search" placeholder="Search source text"></label><button id="network-close">Return to article</button></div><p id="network-count" role="status"></p><div class="network-graph"><svg aria-hidden="true"></svg><div id="network-root"></div><div id="network-panels" aria-label="Figure panels"></div><div id="network-statements" aria-label="Source statements"></div></div><section id="network-detail" aria-label="Selected panel image"></section>';
document.querySelector('main').after(network);
const networkSwitch=document.createElement('label');networkSwitch.className='switch';networkSwitch.innerHTML='<input id="network-toggle" type="checkbox"> Network view';$('study-toggle').closest('label').after(networkSwitch);
state.network??={figure:'1',panel:'all'};
const networkData=figures.map((fig,i)=>{
 const number=String(i+1),caption=(fig.querySelector('details')||fig.querySelector('figcaption'))?.textContent.trim()||'',panels=new Set(Object.keys(panelMap.figures?.[number]?.panels||{})),legends=[];
 // Parenthesized capital labels and sentence-initial lower-case labels are explicit caption markers.
 const markers=[...caption.matchAll(/(?:^|[.!?]\s+|\n\s*)(\(?([a-z](?:\s*[–−-]\s*[a-z])?)\)?[,.]?\s+)|\(([A-Z](?:\s*[–−-]\s*[A-Z])?)\)\s*/g)];
 for(let j=0;j<markers.length;j++){const m=markers[j],letters=panelLetters((m[2]||m[3]).toLowerCase());letters.forEach(p=>panels.add(p));legends.push({text:caption.slice(m.index,markers[j+1]?.index??caption.length).trim(),panels:letters,kind:'Legend',block:fig.querySelector('.readable')||fig})}
 if(!legends.length&&caption)legends.push({text:caption,panels:[],kind:'Legend',block:fig});
 return {number,fig,panels,statements:legends};
});
for(const b of blocks){if(b.dataset.kind==='caption'||b.dataset.kind==='reference'||b.closest('figure')||/^H[1-6]$/.test(b.tagName))continue;
 for(const seg of new Intl.Segmenter('en',{granularity:'sentence'}).segment(b.textContent)){for(const citation of figureCitations(seg.segment)){const f=networkData.find(f=>f.number===citation.number);if(!f)continue;const ps=panelLetters(citation.panel);ps.forEach(p=>f.panels.add(p));let entry=f.statements.find(s=>s.kind==='Article'&&s.block===b&&s.text===seg.segment.trim());if(entry)entry.panels=[...new Set([...entry.panels,...ps])];else f.statements.push({text:seg.segment.trim(),panels:ps,kind:'Article',block:b})}}
}
function netButton(text,click){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=click;return b}
function networkSource(b){$('network-toggle').checked=false;network.hidden=true;document.body.classList.remove('network-mode','figure-mode','raw-pdf-mode');$('study-toggle').checked=false;study.hidden=true;$('raw-pdf-toggle').checked=false;rawPdf.hidden=true;api.useSurface(article);b.closest('details')?.setAttribute('open','');b.scrollIntoView({block:'center'});b.classList.add('network-source-focus');setTimeout(()=>b.classList.remove('network-source-focus'),3500)}
function drawNetworkEdges(){const graph=network.querySelector('.network-graph'),svg=graph.querySelector('svg');svg.replaceChildren();const bounds=graph.getBoundingClientRect();svg.setAttribute('viewBox','0 0 '+graph.scrollWidth+' '+graph.scrollHeight);svg.style.width=graph.scrollWidth+'px';svg.style.height=graph.scrollHeight+'px';const root=$('network-root').firstElementChild;
 const line=(a,b)=>{if(!a||!b)return;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(),p=document.createElementNS('http://www.w3.org/2000/svg','path'),x1=x.right-bounds.left+graph.scrollLeft,y1=x.top+x.height/2-bounds.top,x2=y.left-bounds.left+graph.scrollLeft,y2=y.top+y.height/2-bounds.top;p.setAttribute('d',`M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`);svg.append(p)};
 for(const p of $('network-panels').children){line(root,p);for(const s of $('network-statements').children)if(JSON.parse(s.dataset.panels).includes(p.dataset.panel))line(p,s)}
}
function renderNetworkDetail(){const f=networkData.find(f=>f.number===state.network.figure),detail=$('network-detail');detail.replaceChildren();if(!f)return;const p=['all','whole'].includes(state.network.panel)?'':state.network.panel,h=document.createElement('h3');h.textContent='Figure '+f.number+(p?' · Panel '+p.toUpperCase():' · Full figure');detail.append(h);const im=f.fig.querySelector('img');if(im)fillStudyImage(detail,'network-'+f.number+'-'+(p||'whole'),f.number,p,im,h.textContent);else{const msg=document.createElement('p');msg.textContent='The source has no figure image. Statements and legends remain available; no panel crop is inferred.';detail.append(msg)}}
function renderNetwork(){const f=networkData.find(f=>f.number===state.network.figure)||networkData[0];if(!f){$('network-count').textContent='No figures are available in this source.';return}state.network.figure=f.number;$('network-figure').value=f.number;const selected=state.network.panel,query=$('network-search').value.toLowerCase(),list=f.statements.filter(s=>(selected==='all'||(selected==='whole'?!s.panels.length:s.panels.includes(selected)))&&s.text.toLowerCase().includes(query));
 $('network-root').replaceChildren(netButton('Figure '+f.number+' · all statements',()=>{state.network.panel='all';save();renderNetwork()}));$('network-panels').replaceChildren();
 for(const p of [...f.panels].sort().concat('whole')){const count=f.statements.filter(s=>p==='whole'?!s.panels.length:s.panels.includes(p)).length,b=netButton((p==='whole'?'Whole figure':'Panel '+p.toUpperCase())+' · '+count,()=>{state.network.panel=p;save();renderNetwork()});b.dataset.panel=p;b.setAttribute('aria-pressed',String(selected===p));$('network-panels').append(b)}
 $('network-statements').replaceChildren();for(const s of list){const card=document.createElement('div');card.className='network-statement';card.dataset.panels=JSON.stringify(s.panels.length?s.panels:['whole']);const label=document.createElement('strong');label.textContent=s.kind+' · '+(s.panels.length?s.panels.map(p=>p.toUpperCase()).join(', '):'whole figure');const quote=document.createElement('p');quote.textContent=s.text;card.append(label,quote,netButton('Read source context',()=>networkSource(s.block)));$('network-statements').append(card)}
 if(!list.length){const empty=document.createElement('p');empty.textContent='No matching explicit statements. Open another panel, clear the search, or check the full source context.';$('network-statements').append(empty);empty.dataset.panels='[]'}
 $('network-count').textContent=f.panels.size+' panels · '+list.length+' matching statements / legend excerpts · '+f.statements.filter(s=>s.kind==='Article').length+' article statements total';renderNetworkDetail();requestAnimationFrame(drawNetworkEdges);
}
for(const f of networkData){const option=document.createElement('option');option.value=f.number;option.textContent='Figure '+f.number;$('network-figure').append(option)}
$('network-figure').onchange=e=>{state.network.figure=e.target.value;state.network.panel='all';save();renderNetwork()};$('network-search').oninput=renderNetwork;
$('network-toggle').onchange=e=>{network.hidden=!e.target.checked;document.body.classList.toggle('network-mode',e.target.checked);if(e.target.checked){$('study-toggle').checked=false;study.hidden=true;document.body.classList.remove('figure-mode','raw-pdf-mode');$('raw-pdf-toggle').checked=false;rawPdf.hidden=true;api.useSurface(article);renderNetwork();network.scrollIntoView({block:'start'})}else{api.useSurface(article);document.querySelector('main').scrollIntoView({block:'start'})}};
$('network-close').onclick=()=>{$('network-toggle').checked=false;$('network-toggle').dispatchEvent(new Event('change'))};
const previousStudyChange=$('study-toggle').onchange;$('study-toggle').onchange=e=>{if(e.target.checked){network.hidden=true;$('network-toggle').checked=false;document.body.classList.remove('network-mode')}previousStudyChange(e)};
new ResizeObserver(()=>{if(!network.hidden)requestAnimationFrame(drawNetworkEdges)}).observe(network);

})();
