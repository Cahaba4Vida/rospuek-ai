(() => {
  'use strict';
  const CATEGORIES = [
    { name: 'Dreams', color: '#b6a8ff', icon: '☾' },
    { name: 'Spiritual Revelations', color: '#c9b5ff', icon: '✧' },
    { name: 'Faith & Scripture', color: '#b0b7ff', icon: '✝' },
    { name: 'Personal Experiences', color: '#e3b7d9', icon: '◷' },
    { name: 'Reflections & Growth', color: '#e0afcd', icon: '✦' },
    { name: 'People & Relationships', color: '#f0adba', icon: '♡' },
    { name: 'Ideas & Symbols', color: '#97cbdc', icon: '✳' },
    { name: 'Uncategorized', color: '#afa9c0', icon: '○' }
  ];
  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => [...root.querySelectorAll(q)];
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const encode = (v) => encodeURIComponent(String(v));
  const stored = (key, fallback) => { try {return JSON.parse(localStorage.getItem(key)) ?? fallback} catch {return fallback} };
  const save = (key,val) => {try {localStorage.setItem(key,JSON.stringify(val))} catch {}};
  const state = { real: [], demo: [], demoMode:stored('rospuek.demo',false), favorites:stored('rospuek.favorites',[]), progress:stored('rospuek.progress',{}), textSize:stored('rospuek.font-size',19), search:'', filterCat:'All categories', filterYear:'All years', sort:'newest', loadError:false };
  const GALAXY_BACKGROUNDS = [
    '/assets/galaxies/violet_and_blue_nebula_panorama.webp',
    '/assets/galaxies/golden_teal_spiral_galaxy.webp',
    '/assets/galaxies/crimson_pillars_of_a_distant_galaxy.webp',
    '/assets/galaxies/icy_blue_spiral_galaxy_nebula.webp',
    '/assets/galaxies/cyan_and_rose_nebula_dreams.webp',
    '/assets/galaxies/diagonal_milky_way_core_panorama.webp',
    '/assets/galaxies/emerald_amber_galaxy_nebula.webp',
    '/assets/galaxies/dreamy_pastel_spiral_galaxy_nebula.webp'
  ];
  const view = $('#view');
  const mainNav = $('#mainNav');
  const categoryNav = $('#categoryNav');
  const searchDialog = $('#searchDialog');
  const settingsDialog = $('#settingsDialog');
  const entries = () => [...(state.demoMode ? state.demo : state.real)].sort((a,b)=>(b.date||'').localeCompare(a.date||'') || String(a.id).localeCompare(String(b.id)));
  const categoryFor = c => CATEGORIES.find(x=>x.name===c) || CATEGORIES[CATEGORIES.length-1];
  const dateObj = date => /^\d{4}-\d{2}-\d{2}$/.test(date||'') ? new Date(`${date}T12:00:00`) : null;
  const formatDate = date => dateObj(date)?.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) || 'Undated';
  const formatDateShort = date => dateObj(date)?.toLocaleDateString('en-US',{month:'short',year:'numeric'}) || 'Undated';
  const dateParts = date => dateObj(date) ? { day:dateObj(date).toLocaleDateString('en-US',{day:'2-digit'}), month:dateObj(date).toLocaleDateString('en-US',{month:'short'}).toUpperCase()} : {day:'—',month:'N/D'};
  const pageCount = data => data.reduce((sum,e)=>sum+(Array.isArray(e.pages)?e.pages.length:0),0);
  const categoryCounts = (data) => CATEGORIES.map(c=>({...c,count:data.filter(e=>(e.category||'Uncategorized')===c.name).length}));
  const eUrl = (e,page=0) => `#/entry/${encode(e.id)}/page/${page+1}`;
  const anchor = (href, txt, klass='') => `<a class="${klass}" href="${href}">${txt}</a>`;
  const demoNotice = () => state.demoMode ? '<div class="notice"><strong>Sample mode:</strong> These three fictional entries only demonstrate the design. They are not part of your journal. <button class="scan-link" data-action="demo-off">Exit sample mode</button></div>' : '';
  function setBreadcrumb(section) {$('#breadcrumb').innerHTML=`ZACH'S DREAM JOURNAL <span class="crumb-slash">/</span> ${escapeHTML(section).toUpperCase()}`;}
  function renderNav(active='home',category='') {
    $$('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.nav===active));
    const data=entries();$('#entryCount').textContent=data.length;
    categoryNav.innerHTML=categoryCounts(data).map(c=>`<a class="category-link ${active==='category'&&category===c.name?'active':''}" href="#/category/${encode(c.name)}"><span class="category-dot" style="--dot:${c.color}"></span><span>${escapeHTML(c.name)}</span><span class="category-count">${c.count}</span></a>`).join('');
  }
  function emptyState(title, text, isHome=false) {
    return `<div class="empty-note ${isHome?'':'archive-empty'}"><div class="empty-illustration" aria-hidden="true">✧</div><strong>${escapeHTML(title)}</strong>${escapeHTML(text)}${!state.demoMode?'<div><button class="btn btn-outline" data-action="demo-on">Preview with sample entries ↗</button></div>':''}</div>`;
  }
  function miniEntry(e) {
    const dp=dateParts(e.date),pc=Array.isArray(e.pages)?e.pages.length:0;
    const snippet=(e.pages?.[0]?.text || '').replace(/\s+/g,' ').slice(0,155);
    return `<a class="entry-card" href="${eUrl(e)}"><div class="entry-date"><span class="entry-day">${escapeHTML(dp.day)}</span><span class="entry-month">${escapeHTML(dp.month)}</span></div><div class="entry-detail"><div class="entry-meta"><span>${escapeHTML(e.category||'Uncategorized')}</span><span>${pc} ${pc===1?'page':'pages'}</span>${e.status==='demo'?'<span>DESIGN SAMPLE</span>':''}</div><h3>${escapeHTML(e.title||'Untitled entry')}</h3><p>${escapeHTML(snippet||'A journal entry.')}</p></div><span class="entry-arrow">↗</span></a>`;
  }
  function home() {
    setBreadcrumb('Overview'); renderNav('home'); const data=entries();
    const years=new Set(data.map(e=>(e.date||'').slice(0,4)).filter(x=>/^\d{4}$/.test(x))).size;
    view.innerHTML=`
      ${demoNotice()}
      <section class="hero"><div class="hero-planet" aria-hidden="true"></div><div class="hero-content"><div class="eyebrow">A PUBLIC ARCHIVE OF DREAMS & REFLECTIONS</div><h1>Zach's Dream<br><em>Journal.</em></h1><p class="hero-copy">A growing record of dreams, spiritual experiences, questions, and reflections — preserved faithfully and explored thoughtfully.</p><div class="hero-actions">${anchor('#/archive','Explore the journal <span aria-hidden="true">↗</span>','btn btn-primary')}${anchor('#/timeline','Follow the timeline <span aria-hidden="true">↗</span>','btn btn-outline')}</div></div></section>
      <div class="overview-stats"><div class="stat"><span class="stat-icon">✧</span><div class="stat-label">Journal entries</div><div class="stat-num">${data.length}</div></div><div class="stat"><span class="stat-icon">▤</span><div class="stat-label">Pages preserved</div><div class="stat-num">${pageCount(data)}</div></div><div class="stat"><span class="stat-icon">◷</span><div class="stat-label">Years recorded</div><div class="stat-num">${years}</div></div></div>
      <section><div class="section-head"><h2 class="section-title">Browse by chapter</h2>${anchor('#/archive','View entire archive ↗','text-link')}</div><div class="categories-grid">${CATEGORIES.slice(0,6).map(c=>`<a class="category-card" style="--cat:${c.color}" href="#/category/${encode(c.name)}"><div class="category-symbol">${c.icon}</div><h3>${escapeHTML(c.name)}</h3><span>${data.filter(e=>(e.category||'Uncategorized')===c.name).length} entries ↗</span></a>`).join('')}</div></section>
      <section><div class="section-head"><h2 class="section-title">Recent pages</h2>${anchor('#/archive','All entries ↗','text-link')}</div>${data.length?`<div class="entry-list">${data.slice(0,3).map(miniEntry).join('')}</div>`:emptyState('The archive is ready for its first page.','We can add handwritten scans, transcriptions, dates, and categories as each journal batch is reviewed.',true)}</section>
      <section><div class="section-head"><h2 class="section-title">How this archive grows</h2></div><div class="workflow"><div class="workflow-step"><span class="workflow-number">01</span><h3>Capture the original</h3><p>Photograph or scan a journal page and keep it linked to its transcription.</p></div><div class="workflow-step"><span class="workflow-number">02</span><h3>Transcribe faithfully</h3><p>Preserve wording and line breaks. Flag anything hard to read instead of guessing.</p></div><div class="workflow-step"><span class="workflow-number">03</span><h3>Organize and revisit</h3><p>Add dates, categories, tags, and chapters while preserving the source text.</p></div></div></section>`;
  }
  function archive(title='All entries', items=entries(), special='archive') {
    setBreadcrumb(title); renderNav(special, special==='category'?title:'');
    const years=[...new Set(items.map(e=>(e.date||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort().reverse();
    const categoryOptions=['All categories',...CATEGORIES.map(c=>c.name)];
    view.innerHTML=`${demoNotice()}<div class="page-head"><div><div class="eyebrow">THE COLLECTION</div><h1>${escapeHTML(title)}</h1><p>Find a moment by date, topic, or a few remembered words.</p></div><span class="pill"><i></i> ${items.length} ${items.length===1?'ENTRY':'ENTRIES'}</span></div>
      <div class="archive-toolbar"><input class="filter-search" id="inlineSearch" type="search" placeholder="Search this collection..." aria-label="Search this collection" value="${escapeHTML(state.search)}" />
      <select class="filter-select" id="categorySelect" aria-label="Filter category">${categoryOptions.map(c=>`<option ${state.filterCat===c?'selected':''}>${escapeHTML(c)}</option>`).join('')}</select>
      <select class="filter-select" id="yearSelect" aria-label="Filter year"><option>All years</option>${years.map(y=>`<option ${state.filterYear===y?'selected':''}>${y}</option>`).join('')}</select>
      <select class="filter-select" id="sortSelect" aria-label="Sort order"><option value="newest" ${state.sort==='newest'?'selected':''}>Newest first</option><option value="oldest" ${state.sort==='oldest'?'selected':''}>Oldest first</option></select></div>
      <div id="filteredList"></div><p class="note-footer">Entries retain their original transcription. Categories and titles are organizational metadata.</p>`;
    const inlineSearch=$('#inlineSearch');
    inlineSearch.addEventListener('input',ev=>{state.search=ev.target.value;updateFiltered(items)});
    $('#categorySelect').addEventListener('change',ev=>{state.filterCat=ev.target.value;updateFiltered(items)});
    $('#yearSelect').addEventListener('change',ev=>{state.filterYear=ev.target.value;updateFiltered(items)});
    $('#sortSelect').addEventListener('change',ev=>{state.sort=ev.target.value;updateFiltered(items)});
    updateFiltered(items);
  }
  function updateFiltered(source) {
    let list=source.filter(e=>{
      const haystack=[e.title,e.category,e.date,e.journal,...(e.tags||[]),...(e.pages||[]).map(p=>p.text)].join(' ').toLowerCase();
      return (state.filterCat==='All categories'||(e.category||'Uncategorized')===state.filterCat) && (state.filterYear==='All years'||e.date?.startsWith(state.filterYear)) && (!state.search||haystack.includes(state.search.toLowerCase().trim()));
    });
    if(state.sort==='oldest') list=[...list].reverse();
    $('#filteredList').innerHTML=list.length?`<p class="count-banner">SHOWING ${list.length} OF ${source.length} ENTRIES</p><div class="entry-list" style="margin-top:17px">${list.map(miniEntry).join('')}</div>`:emptyState(source.length?'No matching entries':'No journal pages yet',source.length?'Try another search term, category, or year.':'Send the first journal pages when you are ready.');
  }
  function timeline() {
    setBreadcrumb('Timeline');renderNav('timeline');const data=entries(),groups={};
    data.forEach(e=>{const y=/^\d{4}/.test(e.date||'')?e.date.slice(0,4):'Undated';(groups[y]||=[]).push(e)});
    view.innerHTML=`${demoNotice()}<div class="page-head"><div><div class="eyebrow">THROUGH THE YEARS</div><h1>Timeline</h1><p>Travel chronologically through the pages that shaped each chapter.</p></div><span class="pill"><i></i> ${data.length} ENTRIES</span></div>${data.length?Object.entries(groups).map(([year,es])=>`<section class="timeline-group"><h2 class="year-heading">${year}</h2><div class="entry-list">${es.map(miniEntry).join('')}</div></section>`).join(''):emptyState('A timeline waiting to be written','The years will appear here as transcribed pages are added.')}`;
  }
  function reader(id,requestedPage=1) {
    const data=entries(),i=data.findIndex(e=>e.id===id),e=data[i];
    if(!e){notFound();return}
    const pages=Array.isArray(e.pages)?e.pages:[],pageIndex=Math.min(Math.max(0,Number(requestedPage)-1||0),Math.max(pages.length-1,0));
    const p=pages[pageIndex]||{number:'—',text:'No transcription has been added for this page.'};
    state.progress[e.id]=pageIndex;save('rospuek.progress',state.progress);
    setBreadcrumb(`Reading / ${e.title||'Untitled'}`);renderNav('archive');
    const bookmarked=state.favorites.includes(e.id);
    const date=formatDate(e.date),dateTitle=e.date?date:'Date not recorded';
    const prev=eUrl(data[i+1]||e),next=eUrl(data[i-1]||e);
    const hasScan=typeof p.scan==='string' && /^media\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/.test(p.scan);
    view.innerHTML=`${demoNotice()}<div class="reader-wrap"><div class="reader-nav">${anchor('#/archive','← Back to all entries','back-link')}<div class="reader-actions"><button class="mini-action ${bookmarked?'selected':''}" data-action="favorite" data-id="${escapeHTML(e.id)}" aria-pressed="${bookmarked}">${bookmarked?'★ Saved':'☆ Save'}</button><button class="mini-action" data-action="share" data-id="${escapeHTML(e.id)}" aria-label="Copy link to entry">↗ Share</button></div></div>
      <div class="reader-heading"><div class="reader-kicker">${escapeHTML(e.category||'Uncategorized')}${e.status==='demo'?'<span class="demo-label">FICTIONAL SAMPLE</span>':''}</div><h1 class="reader-title">${escapeHTML(e.title||'Untitled entry')}</h1><div class="reader-subtitle"><span>${escapeHTML(dateTitle)}</span><span class="bullet">✧</span><span>${pages.length} ${pages.length===1?'PAGE':'PAGES'}</span>${e.journal?`<span class="bullet">✧</span><span>${escapeHTML(e.journal)}</span>`:''}</div>${(e.tags||[]).length?`<div class="tag-line" style="justify-content:center;margin-top:18px">${e.tags.map(tag=>`<span class="tag">#${escapeHTML(tag)}</span>`).join('')}</div>`:''}</div>
      <article class="reader-paper"><div class="paper-top"><span>${escapeHTML(e.journal||'The Written Archive')}</span><span>PAGE ${pageIndex+1} OF ${pages.length||1}</span></div><div class="paper-body">${escapeHTML(p.text||'')}</div><div class="paper-bottom"><span>ORIGINAL PAGE ${escapeHTML(p.number??pageIndex+1)}</span>${hasScan?'<button class="scan-link" data-action="toggle-scan">View original scan ↗</button>':'<span>TRANSCRIBED COPY</span>'}</div>${hasScan?`<div class="scan-frame" id="scanFrame" hidden><img src="/${escapeHTML(p.scan)}" alt="Original handwritten scan for page ${escapeHTML(p.number??pageIndex+1)}" loading="lazy"></div>`:''}</article>
      ${(p.refined||p.context)?`<section class="reader-annotations" aria-label="Additional editorial layers"><h2>Explore this page</h2>${p.refined?`<details><summary>Refined narrative (editorial adaptation)</summary><div class="editorial-text">${escapeHTML(p.refined)}</div></details>`:''}${p.context?`<details><summary>Context &amp; possible interpretations</summary><div class="editorial-text">${escapeHTML(p.context)}</div></details>`:''}<p>Editorial additions are interpretations or restatements, not part of the original transcription.</p></section>`:''}
      <nav class="reader-pager" aria-label="Page navigation"><button class="page-step" data-action="page-prev" ${pageIndex===0?'disabled':''}>← Previous</button><div class="page-pills">${pages.map((pg,j)=>`<a aria-label="Go to page ${j+1}" class="page-pill ${j===pageIndex?'active':''}" href="${eUrl(e,j)}">${j+1}</a>`).join('')}</div><button class="page-step" data-action="page-next" ${pageIndex>=pages.length-1?'disabled':''}>Next →</button></nav>
      ${e.expandedNarrative?`<section class="reader-extra"><div class="reader-kicker">EDITORIAL EXPANSION</div><h2>Expanded narrative</h2><div class="paper-body">${escapeHTML(e.expandedNarrative)}</div></section>`:''}${e.interpretation?`<section class="reader-extra"><div class="reader-kicker">INTERPRETATION & CONTEXT</div><h2>What it might mean</h2><div class="paper-body">${escapeHTML(e.interpretation)}</div></section>`:''}${(e.artwork||[]).length?`<section class="reader-extra"><div class="reader-kicker">VISUAL EXPLORATION</div><h2>Symbolic artwork</h2><div class="art-gallery">${e.artwork.filter(x=>/^media\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/.test(x)).map(x=>`<img loading="lazy" src="/${escapeHTML(x)}" alt="Symbolic artwork for ${escapeHTML(e.title)}"/>`).join('')}</div></section>`:''}
      <div class="end-entry"><div>${i<data.length-1?anchor(prev,`<small>OLDER ENTRY</small>${escapeHTML(data[i+1].title||'Untitled')}`):''}</div><div style="text-align:right">${i>0?anchor(next,`<small>NEWER ENTRY</small>${escapeHTML(data[i-1].title||'Untitled')}`):''}</div></div></div>`;
    view.dataset.entryId=id;view.dataset.pageIndex=pageIndex;
  }
  function favorites() {const filtered=entries().filter(e=>state.favorites.includes(e.id));archive('Bookmarks',filtered,'favorites')}
  function notFound(){setBreadcrumb('Not found');renderNav('');view.innerHTML=`<div class="page-head"><div><div class="eyebrow">MISSING PAGE</div><h1>Not found.</h1><p>That journal entry is not in this archive.</p></div></div><p style="margin-top:30px">${anchor('#/archive','← Return to all entries','btn btn-outline')}</p>`}
  function route(){
    state.search='';state.filterCat='All categories';state.filterYear='All years';state.sort='newest';
    delete view.dataset.entryId; delete view.dataset.pageIndex;
    const path=decodeURIComponent((location.hash||'#/').slice(2)).split('/');
    const [section,thing,pageWord,pageNum]=path;
    if(!section)home();else if(section==='archive')archive();else if(section==='timeline')timeline();else if(section==='favorites')favorites();else if(section==='category')archive(thing||'Uncategorized',entries().filter(e=>(e.category||'Uncategorized')===thing),'category');else if(section==='entry')reader(thing,pageWord==='page'?pageNum:1);else notFound();
    closeMobile();window.scrollTo({top:0,behavior:'auto'});
  }
  function closeMobile(){ $('#sidebar').classList.remove('open');$('#scrim').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false') }
  function openSearch(){
    if(searchDialog.open)return;
    searchDialog.showModal();$('#searchInput').value='';updateSearchResults('');$('#searchInput').focus();
  }
  function updateSearchResults(query) {
    const q=query.toLowerCase().trim();const list=entries().filter(e=>[e.title,e.category,e.date,e.journal,...(e.tags||[]),...(e.pages||[]).map(p=>p.text)].join(' ').toLowerCase().includes(q)).slice(0,20);
    $('#searchResults').innerHTML=list.length?list.map(e=>`<a class="search-hit" href="${eUrl(e)}"><strong>${escapeHTML(e.title||'Untitled entry')}</strong><span>${escapeHTML(formatDate(e.date))} · ${escapeHTML(e.category||'Uncategorized')}</span></a>`).join(''):`<div style="text-align:center;color:#9b92b6;padding:28px">${q?'No matching entries yet.':'Your search begins here.'}</div>`;
  }
  function demoToggle(on){state.demoMode=on;save('rospuek.demo',on);location.hash='#/';route()}
  document.addEventListener('click',async ev=>{
    const action=ev.target.closest('[data-action]')?.dataset.action;
    if(action==='demo-on')demoToggle(true);
    if(action==='demo-off')demoToggle(false);
    if(action==='favorite'){
      const id=ev.target.closest('[data-id]')?.dataset.id;
      state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save('rospuek.favorites',state.favorites);route();
    }
    if(action==='share'){
      try{await navigator.clipboard.writeText(location.href);ev.target.textContent='✓ Copied';setTimeout(()=>{if(ev.target.isConnected)ev.target.textContent='↗ Share'},1800)}catch{ev.target.textContent='Copy URL from browser'}
    }
    if(action==='toggle-scan'){const el=$('#scanFrame');if(el){el.hidden=!el.hidden;ev.target.textContent=el.hidden?'View original scan ↗':'Hide original scan ↑'}}
    if(action==='page-prev'||action==='page-next'){
      const entry=entries().find(e=>e.id===view.dataset.entryId);if(!entry)return;
      const page=Number(view.dataset.pageIndex||0)+(action==='page-next'?1:-1);
      if(page>=0&&page<entry.pages.length)location.hash=eUrl(entry,page);
    }
    if(ev.target.closest('.search-hit'))searchDialog.close();
  });
  $('#menuToggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#scrim').hidden=!open;$('#menuToggle').setAttribute('aria-expanded',open)});
  $('#scrim').addEventListener('click',closeMobile);
  $('#searchTrigger').addEventListener('click',openSearch);
  $('#closeSearch').addEventListener('click',()=>searchDialog.close());
  $('#searchInput').addEventListener('input',ev=>updateSearchResults(ev.target.value));
  $('#themeHint').addEventListener('click',()=>settingsDialog.showModal());
  $('#closeSettings').addEventListener('click',()=>settingsDialog.close());
  $('#fontSlider').value=state.textSize;$('#fontValue').textContent=`${state.textSize}px`;
  document.documentElement.style.setProperty('--reader-size',`${state.textSize}px`);
  $('#fontSlider').addEventListener('input',ev=>{state.textSize=Number(ev.target.value);save('rospuek.font-size',state.textSize);$('#fontValue').textContent=`${state.textSize}px`;document.documentElement.style.setProperty('--reader-size',`${state.textSize}px`)});
  document.addEventListener('keydown',ev=>{
    if((ev.metaKey||ev.ctrlKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();openSearch()}
    if(ev.key==='/'&&!ev.target.matches('input,textarea,select')&&!searchDialog.open&&!settingsDialog.open){ev.preventDefault();openSearch()}
    if(['ArrowLeft','ArrowRight'].includes(ev.key)&&!ev.target.matches('input,textarea,select')&&!searchDialog.open&&!settingsDialog.open){
      const id=view.dataset.entryId;if(!id)return;const entry=entries().find(e=>e.id===id);if(!entry)return;
      const next=Number(view.dataset.pageIndex||0)+(ev.key==='ArrowRight'?1:-1);
      if(next>=0&&next<entry.pages.length)location.hash=eUrl(entry,next);
    }
  });
  function initCosmosSlideshow(){
    const primary = document.querySelector('.cosmos');
    if(!primary) return;
    if(primary.dataset.galleryReady==='true') return;
    primary.dataset.galleryReady='true';
    const parent = primary.parentElement || document.body;
    const secondary = document.createElement('div');
    secondary.className = 'cosmos cosmos-alt';
    secondary.setAttribute('aria-hidden','true');
    parent.insertBefore(secondary, primary.nextSibling);
    const pool = [...GALAXY_BACKGROUNDS];
    const pick = (exclude='') => {
      const options = pool.filter(src => src !== exclude);
      return options[Math.floor(Math.random() * options.length)] || pool[0];
    };
    let front = primary;
    let back = secondary;
    front.style.backgroundImage = `url('${pick()}')`;
    back.style.backgroundImage = `url('${pick(front.style.backgroundImage)}')`;
    const advance = () => {
      const current = front.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || '';
      back.style.backgroundImage = `url('${pick(current)}')`;
      back.classList.add('visible');
      front.classList.remove('visible');
      const oldFront = front;
      front = back;
      back = oldFront;
      window.setTimeout(() => {
        back.classList.remove('visible');
      }, 1800);
    };
    front.classList.add('visible');
    window.setInterval(advance, 12000);
  }

  async function init(){
    try{
      const [real,demo]=await Promise.all([fetch('/api/journal',{cache:'no-store'}).then(r=>{if(r.status===404)return fetch('/data/entries.json').then(x=>x.json());if(!r.ok)throw new Error(`Archive API HTTP ${r.status}`);return r.json()}),fetch('/data/demo.json').then(r=>r.json())]);
      state.real=Array.isArray(real.entries)?real.entries:[];state.demo=Array.isArray(demo.entries)?demo.entries:[];
      if(state.real.length)state.real=state.real.filter(e=>e&&typeof e.id==='string'&&Array.isArray(e.pages));
    }catch(err){console.error('Failed to load journal archive',err);state.loadError=true}
    initCosmosSlideshow();
    window.addEventListener('hashchange',route);route();
    if(state.loadError)view.insertAdjacentHTML('afterbegin','<div class="notice">The archive data could not load. Please open this site through a local web server or deployed domain, not directly as a file.</div>');
  }
  init();
})();