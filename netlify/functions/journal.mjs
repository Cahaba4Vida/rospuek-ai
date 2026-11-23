/** Zach's Dream Journal — server-side publish gate.
 * Public methods never mutate content. Editors authenticate with a server-only
 * high-entropy token stored in Netlify's JOURNAL_ADMIN_TOKEN environment variable.
 * No other identity or endpoint grants write access.
 */
import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

const ROOT='https://zachs-dream-journal.netlify.app';
const SUPPORTED = new Set(['Dreams','Spiritual Revelations','Personal Experiences','Scripture & Theology','Reflections','Recurring Themes','Uncategorized','Faith & Reflection','Business & Ambition','Personal Growth','Relationships & People','Training & Discipline','Life Events','Ideas & Dreams']);
const response = (payload,status=200,headers={}) => new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const plain = (content,contentType='text/html; charset=utf-8',status=200) => new Response(content,{status,headers:{'Content-Type':contentType,'Cache-Control':'public, max-age=30, s-maxage=60','X-Content-Type-Options':'nosniff',...(status===200?{'X-Robots-Tag':'index, follow'}:{'X-Robots-Tag':'noindex'})}});
const safeText = (str) => String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const slugOk = (v) => /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(v||'');
const isAuthenticated = (req) => {
  const secret = Netlify.env.get('JOURNAL_ADMIN_TOKEN');
  if(!secret || secret.length < 32) return false;
  const incoming=req.headers.get('Authorization')||'';
  if(!incoming.startsWith('Bearer ')) return false;
  const supplied=incoming.slice(7);
  const a=Buffer.from(supplied),b=Buffer.from(secret);
  return a.length===b.length && timingSafeEqual(a,b);
};
const publishedStore = () => getStore({name:'journal-published',consistency:'strong'});
const draftsStore = () => getStore({name:'journal-drafts',consistency:'strong'});
const mediaStore = () => getStore({name:'journal-media',consistency:'strong'});

function normalizeEntry(input){
  if(!input || typeof input!=='object' || !slugOk(input.id)) throw Error('Entry id must be a lowercase URL slug.');
  const title=String(input.title||'Untitled entry').trim().slice(0,180);
  const date=String(input.date||'').trim();
  if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Date should be YYYY-MM-DD or empty.');
  const category=SUPPORTED.has(input.category)?input.category:'Uncategorized';
  const pages=(input.pages||[]);
  if(!Array.isArray(pages)||pages.length<1||pages.length>300) throw Error('Entry needs 1–300 original pages.');
  const normalizedPages=pages.map((p,i)=>{
    const text=String(p?.text||'');
    if(text.length>60000) throw Error('Page transcription exceeds length limit.');
    const scan=String(p?.scan||'');
    if(scan && !/^media\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/.test(scan)) throw Error('Invalid scan reference.');
    return {number:Number.isInteger(p?.number)?p.number:i+1,text,scan};
  });
  const content={id:input.id,title,date,category,tags:Array.isArray(input.tags)?input.tags.map(x=>String(x).slice(0,48)).slice(0,30):[],journal:String(input.journal||'').slice(0,140),pages:normalizedPages,expandedNarrative:String(input.expandedNarrative||'').slice(0,250000),interpretation:String(input.interpretation||'').slice(0,200000),artwork:Array.isArray(input.artwork)?input.artwork.filter(x=>typeof x==='string'&&/^media\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/.test(x)).slice(0,20):[],privacyNotes:String(input.privacyNotes||'').slice(0,3000),review:{transcriptionApproved:input.review?.transcriptionApproved===true,privacyApproved:input.review?.privacyApproved===true,expansionApproved:input.review?.expansionApproved===true},status:'draft',updatedAt:new Date().toISOString()};
  if(JSON.stringify(content).length>800000) throw Error('Entry is too large.');
  return content;
}
async function listContent(store,prefix){
  const {blobs}=await store.list({prefix});
  const records=await Promise.all(blobs.filter(b=>b.key.startsWith(prefix)&&b.key.endsWith('.json')).map(b=>store.get(b.key,{type:'json'})));
  return records.filter(Boolean).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.id).localeCompare(String(b.id)));
}
const publicEntry=(e)=>{
  const {privacyNotes,review,...copy}=e;
  return {...copy,status:'published'};
};
async function handlePublic(req,url){
  const store=publishedStore();
  const path=url.pathname;
  if(path==='/journal/' || path==='/journal'){
    const entries=await listContent(store,'entry/');
    const cards=entries.length?'<ul>'+entries.map(e=>`<li><a href="/dream/${e.id}">${safeText(e.title)}</a><small> — ${safeText(e.category)} ${safeText(e.date)}</small></li>`).join('')+'</ul>':'<p>The archive is ready for its first public journal entry.</p>';
    return plain(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Public Dream Journal Entries | ZachsDreamJournal</title><meta name="description" content="Browse publicly reviewed dreams, personal experiences, spiritual revelations and interpretations from Zach's Dream Journal."><meta name="robots" content="index,follow"><link rel="canonical" href="${ROOT}/journal/"><style>body{background:#080914 url('/assets/galaxies/violet_and_blue_nebula_panorama.webp') center/cover fixed;color:#faf6ff;font:18px/1.7 Georgia,serif}main{max-width:830px;margin:4vh auto;padding:clamp(20px,5vw,60px);background:#090919f2;border-radius:16px}a{color:#d7c6ff}li{margin:14px 0}small{color:#c5b9dc}</style></head><body><main><p><a href="/">← Zach's Dream Journal</a></p><h1>Public journal entries</h1><p>Dreams, experiences, and spiritual reflections—original transcriptions are clearly separated from editorial expansions and interpretations.</p>${cards}<p><a href="/about/">About the archive</a></p></main></body></html>`);
  }
  if(path==='/api/journal'){
    const data=await listContent(store,'entry/');
    return response({archiveName:"Zach's Dream Journal",entries:data.map(publicEntry)},200,{'Cache-Control':'public, max-age=20, s-maxage=30'});
  }
  if(path.startsWith('/api/journal/')){
    const id=decodeURIComponent(path.split('/')[3]||'');
    if(!slugOk(id)) return response({error:'Not found'},404);
    const entry=await store.get(`entry/${id}.json`,{type:'json'});
    return entry?response(publicEntry(entry),200,{'Cache-Control':'public, max-age=20'}):response({error:'Not found'},404);
  }
  if(path.startsWith('/media/')){
    const match=path.match(/^\/media\/([a-z0-9-]+)\/([a-zA-Z0-9._-]+)$/);
    if(!match) return plain('Not found','text/plain',404);
    const [,entryId,filename]=match;
    if(!slugOk(entryId))return plain('Not found','text/plain',404);
    const entry=await store.get(`entry/${entryId}.json`,{type:'json'});
    if(!entry)return plain('Not found','text/plain',404);
    const allowed=new Set([...(entry.artwork||[]),...(entry.pages||[]).map(p=>p.scan)].filter(Boolean));
    if(!allowed.has(`media/${entryId}/${filename}`))return plain('Not found','text/plain',404);
    const blob=await mediaStore().get(`${entryId}/${filename}`,{type:'arrayBuffer'});
    if(!blob)return plain('Not found','text/plain',404);
    const mime=/\.png$/i.test(filename)?'image/png':/\.webp$/i.test(filename)?'image/webp':'image/jpeg';
    return new Response(blob,{headers:{'Content-Type':mime,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
  }
  if(path==='/sitemap.xml'){
    const entries=await listContent(store,'entry/');
    const urls=[ROOT+'/',ROOT+'/about/',ROOT+'/journal/',...entries.map(e=>`${ROOT}/dream/${e.id}`)];
    const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>`<url><loc>${safeText(u)}</loc></url>`).join('\n')+'\n</urlset>';
    return plain(xml,'application/xml; charset=utf-8');
  }
  if(path==='/llms.txt'){
    const entries=await listContent(store,'entry/');
    return plain('# ZachsDreamJournal\n\nPublic dreams, spiritual reflections, and personal experiences by Zach Edwards. Original transcriptions are distinct from expanded narratives and interpretations. Read approved entries only.\n\n- '+ROOT+'/\n- '+ROOT+'/journal/\n'+entries.map(e=>`- ${e.title}: ${ROOT}/dream/${e.id}`).join('\n'),'text/plain; charset=utf-8');
  }
  if(path.startsWith('/dream/')){
    const id=decodeURIComponent(path.split('/')[2]||'');
    if(!slugOk(id))return plain('Not found','text/plain',404);
    const entry=await store.get(`entry/${id}.json`,{type:'json'});
    if(!entry)return plain('Not found','text/plain',404);
    const description=entry.pages.map(p=>p.text).join(' ').replace(/\s+/g,' ').slice(0,180);
    const canonical=ROOT+'/dream/'+entry.id;
    const sections=entry.pages.map((p,i)=>`<section><h2>Original journal page ${safeText(p.number||i+1)}</h2><div class="verbatim">${safeText(p.text)}</div>${p.scan?`<img loading="lazy" alt="Original handwritten page ${i+1}" src="/${safeText(p.scan)}">`:''}</section>`).join('');
    const artworks=entry.artwork.length?'<section><h2>Symbolic artwork</h2>'+entry.artwork.map(x=>`<img loading="lazy" src="/${safeText(x)}" alt="Symbolic artwork associated with ${safeText(entry.title)}">`).join('')+'</section>':'';
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeText(entry.title)} | Zach's Dream Journal</title><meta name="description" content="${safeText(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${safeText(entry.title)}"><meta property="og:url" content="${canonical}"><meta property="og:description" content="${safeText(description)}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:entry.title,datePublished:entry.date||undefined,dateModified:entry.updatedAt,mainEntityOfPage:canonical,author:{'@type':'Person',name:'Zach Edwards'},description}).replace(/</g,'\\u003c')}</script><style>body{background:#080914 url('/assets/galaxies/violet_and_blue_nebula_panorama.webp') center/cover fixed;color:#f6f0ff;font:19px/1.8 Georgia,serif}main{max-width:820px;margin:4vh auto;padding:clamp(20px,5vw,65px);background:#090919f2;border:1px solid #ae9fff60;border-radius:18px}a{color:#c8b8ff}small{font:12px sans-serif;letter-spacing:.12em;color:#cbbafc}.verbatim{white-space:pre-wrap;overflow-wrap:anywhere}section{border-top:1px solid #c2b2e535;padding-top:18px;margin-top:30px}img{max-width:100%;height:auto;border-radius:12px}footer{font:12px/1.6 sans-serif;color:#ac9ebc;margin-top:50px}</style></head><body><main><a href="/">Zach's Dream Journal</a> · <a href="/journal/">Read more</a><p><small>${safeText(entry.category)} ${safeText(entry.date)}</small></p><h1>${safeText(entry.title)}</h1>${sections}${entry.expandedNarrative?`<section><h2>Expanded narrative</h2><div class="verbatim">${safeText(entry.expandedNarrative)}</div></section>`:''}${entry.interpretation?`<section><h2>Interpretation & context</h2><div class="verbatim">${safeText(entry.interpretation)}</div></section>`:''}${artworks}<footer>The original transcription is preserved separately from editorial expansions and possible interpretations. Interpretations reflect a personal perspective, not independently verified spiritual claims.</footer></main></body></html>`;
    return plain(html);
  }
  return response({error:'Not found'},404);
}

async function handleAdmin(req){
  if(!isAuthenticated(req))return response({error:'Unauthorized'},401);
  if(req.method==='GET'){
    const drafts=await listContent(draftsStore(),'entry/');
    const published=await listContent(publishedStore(),'entry/');
    return response({drafts,published:published.map(publicEntry)});
  }
  if(req.method!=='POST')return response({error:'Unsupported method'},405);
  const ct=req.headers.get('content-type')||'';
  if(ct.includes('multipart/form-data')){
    const form=await req.formData();
    if(form.get('action')!=='uploadMedia')return response({error:'Invalid media action'},400);
    const id=String(form.get('entryId')||'');
    if(!slugOk(id))return response({error:'Invalid entry id'},400);
    const file=form.get('file');
    if(!(file instanceof File))return response({error:'Missing file'},400);
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return response({error:'Image must be JPEG, PNG or WebP'},415);
    if(file.size>12_000_000)return response({error:'Image too large (12 MB maximum)'},413);
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const filename=`${crypto.randomUUID()}.${extension}`;
    await mediaStore().set(`${id}/${filename}`,await file.arrayBuffer(),{metadata:{contentType:file.type}});
    return response({path:`media/${id}/${filename}`,message:'Uploaded as private-until-published media'});
  }
  const payload=await req.json().catch(()=>null);
  const action=payload?.action;
  if(action==='saveDraft'){
    const entry=normalizeEntry(payload.entry);
    await draftsStore().setJSON(`entry/${entry.id}.json`,entry);
    return response({ok:true,id:entry.id,review:entry.review});
  }
  if(action==='batchDraft'){
    const items=payload.entries;
    if(!Array.isArray(items)||items.length<1||items.length>100)return response({error:'Batch should contain 1–100 entries'},400);
    const normalized=items.map(normalizeEntry);
    if(new Set(normalized.map(e=>e.id)).size!==normalized.length) return response({error:'Duplicate ids in batch'},400);
    for(const e of normalized)await draftsStore().setJSON(`entry/${e.id}.json`,e);
    return response({ok:true,created:normalized.map(e=>e.id)});
  }
  if(action==='publish'){
    const id=String(payload.id||'');
    if(!slugOk(id))return response({error:'Invalid entry id'},400);
    const draft=await draftsStore().get(`entry/${id}.json`,{type:'json'});
    if(!draft)return response({error:'Draft not found'},404);
    if(!(draft.review?.transcriptionApproved&&draft.review?.privacyApproved&&draft.review?.expansionApproved))return response({error:'Approve transcription, privacy and expansion before publishing'},409);
    const entry={...draft,status:'published',publishedAt:new Date().toISOString()};
    await publishedStore().setJSON(`entry/${id}.json`,entry);
    return response({ok:true,id,url:`${ROOT}/dream/${id}`});
  }
  if(action==='unpublish'){
    const id=String(payload.id||'');
    if(!slugOk(id))return response({error:'Invalid entry id'},400);
    await publishedStore().delete(`entry/${id}.json`);
    return response({ok:true,id,published:false});
  }
  return response({error:'Unsupported action'},400);
}

export default async function handler(req){
  try{
    const url=new URL(req.url);
    if(url.pathname==='/api/admin')return await handleAdmin(req);
    if(req.method!=='GET'&&req.method!=='HEAD')return response({error:'Method not allowed'},405);
    return await handlePublic(req,url);
  }catch(err){
    if(err instanceof SyntaxError||/Entry id|invalid|too large|page|Draft|Date should|Batch/.test(err?.message||''))return response({error:err.message},400);
    console.error('Journal API error',err);
    return response({error:'Journal API temporarily unavailable'},503);
  }
}
export const config={path:['/api/admin','/api/journal','/api/journal/*','/journal/','/journal','/dream/*','/sitemap.xml','/llms.txt','/media/*']};