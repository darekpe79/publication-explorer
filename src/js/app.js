(() => {
        "use strict";
        const form=document.getElementById("search-form"),input=document.getElementById("doi-input"),searchButton=document.getElementById("search-button"),exampleButton=document.getElementById("example-button"),loading=document.getElementById("loading"),message=document.getElementById("message"),result=document.getElementById("result");


        let activeInfoButton=null;
        function getGlobalInfoTooltip(){
          return document.getElementById("global-info-tooltip")
        }

        function positionInfoTooltip(button){
          const globalInfoTooltip=getGlobalInfoTooltip();
          if(!globalInfoTooltip||!button)return;
          const r=button.getBoundingClientRect();
          globalInfoTooltip.classList.add("visible");
          globalInfoTooltip.style.left="0px";
          globalInfoTooltip.style.top="0px";
          const tr=globalInfoTooltip.getBoundingClientRect();
          const margin=10;
          let left=r.left+r.width/2-tr.width/2;
          left=Math.max(margin,Math.min(left,window.innerWidth-tr.width-margin));
          let top=r.top-tr.height-9;
          if(top<margin)top=r.bottom+9;
          top=Math.max(margin,Math.min(top,window.innerHeight-tr.height-margin));
          globalInfoTooltip.style.left=`${Math.round(left)}px`;
          globalInfoTooltip.style.top=`${Math.round(top)}px`
        }

        function showInfoTooltip(button){
          const globalInfoTooltip=getGlobalInfoTooltip();
          if(!globalInfoTooltip||!button)return;
          if(activeInfoButton&&activeInfoButton!==button){
            activeInfoButton.setAttribute("aria-expanded","false")
          }
          activeInfoButton=button;
          globalInfoTooltip.textContent=button.dataset.info||"";
          globalInfoTooltip.setAttribute("aria-hidden","false");
          button.setAttribute("aria-expanded","true");
          positionInfoTooltip(button)
        }

        function hideInfoTooltip(button=null){
          if(button&&activeInfoButton&&button!==activeInfoButton)return;
          if(activeInfoButton)activeInfoButton.setAttribute("aria-expanded","false");
          activeInfoButton=null;
          const globalInfoTooltip=getGlobalInfoTooltip();
          if(globalInfoTooltip){
            globalInfoTooltip.classList.remove("visible");
            globalInfoTooltip.setAttribute("aria-hidden","true")
          }
        }

        document.addEventListener("mouseover",event=>{
          const button=event.target.closest?.(".info-tip-button");
          if(button)showInfoTooltip(button)
        });

        document.addEventListener("mouseout",event=>{
          const button=event.target.closest?.(".info-tip-button");
          if(button&&!button.contains(event.relatedTarget))hideInfoTooltip(button)
        });

        document.addEventListener("focusin",event=>{
          const button=event.target.closest?.(".info-tip-button");
          if(button)showInfoTooltip(button)
        });

        document.addEventListener("focusout",event=>{
          const button=event.target.closest?.(".info-tip-button");
          if(button)hideInfoTooltip(button)
        });

        document.addEventListener("click",event=>{
          const button=event.target.closest?.(".info-tip-button");
          if(button){
            event.preventDefault();
            event.stopPropagation();
            const globalInfoTooltip=getGlobalInfoTooltip();
            const alreadyOpen=activeInfoButton===button&&globalInfoTooltip?.classList.contains("visible");
            if(alreadyOpen)hideInfoTooltip(button);
            else showInfoTooltip(button);
            return
          }
          if(activeInfoButton)hideInfoTooltip()
        });

        window.addEventListener("scroll",()=>{if(activeInfoButton)hideInfoTooltip()},{passive:true});
        window.addEventListener("resize",()=>{if(activeInfoButton)positionInfoTooltip(activeInfoButton)});

        const appTabs=[...document.querySelectorAll("[data-tab]")],tabPanels=[...document.querySelectorAll("[data-tab-panel]")];
        const journalSearchForm=document.getElementById("journal-search-form"),journalQuery=document.getElementById("journal-query"),journalSearchResults=document.getElementById("journal-search-results"),journalResult=document.getElementById("journal-result"),journalMessage=document.getElementById("journal-message"),journalLoading=document.getElementById("journal-loading");
        const finderForm=document.getElementById("finder-form"),disciplineSelect=document.getElementById("discipline-select"),pointsFrom=document.getElementById("points-from"),pointsTo=document.getElementById("points-to"),oaFilter=document.getElementById("oa-filter"),finderResults=document.getElementById("finder-results"),finderJournalResult=document.getElementById("finder-journal-result"),finderMessage=document.getElementById("finder-message");
        let activeJournalTarget=journalResult;
        const EXAMPLE_DOI="10.1002/14651858.CD010438";
        const statusLabels={gold:"Gold OA",green:"Green OA",hybrid:"Hybrid OA",bronze:"Bronze OA",diamond:"Diamond OA",closed:"brak potwierdzonego OA"};
        const typeLabels={"journal-article":"artykuł w czasopiśmie","book-chapter":"rozdział książki",book:"książka",proceedings:"materiały konferencyjne","proceedings-article":"artykuł konferencyjny",posted:"preprint / posted content",report:"raport",dissertation:"rozprawa",dataset:"zbiór danych",reference:"reference entry","reference-entry":"reference entry"};
        const relatedSourcesCache=new Map();

        const MINISTRY_DATA=window.MINISTRY_DATA;

        const MINISTRY_HISTORY_POINTS=window.MINISTRY_HISTORY_POINTS;
        const MINISTRY_HISTORY_META=window.MINISTRY_HISTORY_META;


        function setInlineMessage(el,text,isError=false){
          if(!el)return;
          el.textContent=text||"";
          el.className=`message${text?" visible":""}${isError?" error":""}`
        }
        function clearInlineMessage(el){setInlineMessage(el,"")}

        function setActiveTab(name){
          appTabs.forEach(button=>button.classList.toggle("active",button.dataset.tab===name));
          tabPanels.forEach(panel=>panel.hidden=panel.dataset.tabPanel!==name)
        }
        appTabs.forEach(button=>button.addEventListener("click",()=>setActiveTab(button.dataset.tab)));

        function ministryRecordFromIndex(index){
          const raw=MINISTRY_DATA.records[index];
          if(!raw)return null;
          const officialIssns=(raw[4]||[]).map(formatIssn);
          return{index,title1:raw[0]||"",title2:raw[1]||"",points:raw[2],disciplineCodes:raw[3]||[],disciplines:(raw[3]||[]).map(code=>({code,name:MINISTRY_DATA.disciplines[code]||code})),officialIssns,matchedBy:"local-list",matchedIssns:officialIssns}
        }

        function journalDisplayTitle(raw){return raw?.[0]||raw?.[1]||"Czasopismo bez tytułu"}
        function journalSearchLocal(query,limit=20){
          const rawQuery=String(query||"").trim();
          if(!rawQuery)return[];
          const q=normalizeJournalTitle(rawQuery);
          const rows=[];
          for(let i=0;i<MINISTRY_DATA.records.length;i++){
            const raw=MINISTRY_DATA.records[i],t1=normalizeJournalTitle(raw?.[0]),t2=normalizeJournalTitle(raw?.[1]);
            let score=0;
            for(const t of [t1,t2]){
              if(!t)continue;
              if(t===q)score=Math.max(score,100);
              else if(t.startsWith(q))score=Math.max(score,80);
              else if(t.includes(q))score=Math.max(score,55)
            }
            if(score)rows.push({index:i,score})
          }
          rows.sort((a,b)=>b.score-a.score||(Number(MINISTRY_DATA.records[b.index]?.[2])||0)-(Number(MINISTRY_DATA.records[a.index]?.[2])||0)||journalDisplayTitle(MINISTRY_DATA.records[a.index]).localeCompare(journalDisplayTitle(MINISTRY_DATA.records[b.index]),"pl"));
          return rows.slice(0,limit)
        }

        function journalResultRow(index,evidence=null){
          const raw=MINISTRY_DATA.records[index],title=journalDisplayTitle(raw),issns=(raw?.[4]||[]).map(formatIssn),points=raw?.[2]??"—";
          let oaBadge="";
          if(evidence){
            const labels=[];
            if(evidence.doaj)labels.push("DOAJ");
            if(evidence.openAlex)labels.push("OpenAlex OA");
            if(labels.length)oaBadge=`<span class="oa-evidence-badge">Fully OA: ${escapeHtml(labels.join(" + "))}</span>`
          }
          return `<div class="journal-result-item"><div><div class="journal-result-title">${escapeHtml(title)}</div><div class="journal-result-meta"><span>${escapeHtml(points)} pkt</span><span>${escapeHtml(issns.join(" · ")||"brak ISSN")}</span><span>${escapeHtml((raw?.[3]||[]).length)} dyscyplin</span>${oaBadge}</div></div><button class="journal-open" type="button" data-open-journal="${index}" title="Otwórz pełny profil czasopisma">Pokaż profil</button></div>`
        }

        function bindJournalRows(container,target){
          container.querySelectorAll("[data-open-journal]").forEach(button=>button.addEventListener("click",()=>loadJournalProfile(Number(button.dataset.openJournal),target)))
        }

        function populateDisciplines(){
          const entries=Object.entries(MINISTRY_DATA.disciplines).sort((a,b)=>a[1].localeCompare(b[1],"pl"));
          disciplineSelect.innerHTML=entries.map(([code,name])=>`<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`).join("")
        }
        populateDisciplines();

        function journalsForDisciplineRange(code,minPts=20,maxPts=200,limit=100){
          const rows=[];
          for(let i=0;i<MINISTRY_DATA.records.length;i++){
            const raw=MINISTRY_DATA.records[i];
            if(!(raw?.[3]||[]).includes(code))continue;
            const pts=Number(raw?.[2])||0;
            if(pts<minPts||pts>maxPts)continue;
            rows.push(i)
          }
          rows.sort((a,b)=>journalDisplayTitle(MINISTRY_DATA.records[a]).localeCompare(journalDisplayTitle(MINISTRY_DATA.records[b]),"pl",{sensitivity:"base"})||(Number(MINISTRY_DATA.records[b]?.[2])||0)-(Number(MINISTRY_DATA.records[a]?.[2])||0));
          return{total:rows.length,rows:rows.slice(0,limit)}
        }


        async function oaJournalsForDisciplineRange(code,minPts=20,maxPts=200,mode="oa_any",limit=20,scanLimit=60){
          const all=journalsForDisciplineRange(code,minPts,maxPts,Number.MAX_SAFE_INTEGER).rows;
          const candidates=all.slice(0,scanLimit);
          const accepted=[];
          const batchSize=5;
          let unverified=0;

          for(let start=0;start<candidates.length&&accepted.length<limit;start+=batchSize){
            const batch=candidates.slice(start,start+batchSize);
            const checks=await Promise.all(batch.map(async index=>{
              const raw=MINISTRY_DATA.records[index];
              const issns=(raw?.[4]||[]).map(formatIssn).filter(Boolean);
              let doajValue=null,doajError=false,openAlexValue=null,openAlexError=false;

              if(mode==="doaj"||mode==="oa_any"){
                const doaj=await fetchDoajByIssns(issns);
                doajValue=doaj?.found===true?true:(doaj?.error?null:false);
                doajError=Boolean(doaj?.error)
              }
              if(mode==="openalex"||mode==="oa_any"){
                const oaCheck=await checkOpenAlexOaByIssns(issns);
                openAlexValue=oaCheck.value;
                openAlexError=Boolean(oaCheck.error)
              }

              let passed=false,unknown=false;
              if(mode==="doaj"){passed=doajValue===true;unknown=doajValue===null}
              else if(mode==="openalex"){passed=openAlexValue===true;unknown=openAlexValue===null}
              else{passed=doajValue===true||openAlexValue===true;unknown=!passed&&(doajValue===null||openAlexValue===null)}

              return{hit:passed?{index,evidence:{doaj:doajValue===true,openAlex:openAlexValue===true}}:null,unknown,errors:{doaj:doajError,openAlex:openAlexError}}
            }));
            for(const check of checks){
              if(check.unknown)unverified++;
              if(check.hit&&accepted.length<limit)accepted.push(check.hit)
            }
          }
          return{rows:accepted,scanned:candidates.length,candidateCount:all.length,unverified}
        }


        function journalIssns(record){
          const vals=[
            ...(record?.verifiedIssns||[]),
            record?.issnL,
            ...(record?.ministry?.officialIssns||[])
          ].filter(Boolean);
          return uniqueIssnValues(vals).slice(0,3)
        }

        async function fetchOpenAlexSourceByIssns(issns){
          for(const issn of issns||[]){
            try{
              const payload=await fetchJson(`https://api.openalex.org/sources?filter=issn:${encodeURIComponent(formatIssn(issn))}&per_page=5`,"OpenAlex");
              const items=payload?.results||[];
              if(items.length){
                const wanted=normalizeIssn(issn);
                return items.find(x=>(x?.issn||[]).some(v=>normalizeIssn(v)===wanted))||items[0]
              }
            }catch(_){}
          }
          return null
        }

        async function checkOpenAlexOaByIssns(issns){
          let successfulQueries=0;
          let hadError=false;
          for(const issn of issns||[]){
            try{
              const payload=await fetchJson(`https://api.openalex.org/sources?filter=issn:${encodeURIComponent(formatIssn(issn))}&per_page=5`,"OpenAlex");
              successfulQueries++;
              const items=payload?.results||[];
              if(items.length){
                const wanted=normalizeIssn(issn);
                const source=items.find(x=>(x?.issn||[]).some(v=>normalizeIssn(v)===wanted))||items[0];
                return{value:source?.is_oa===true,error:false,source}
              }
            }catch(_){
              hadError=true
            }
          }
          if(hadError)return{value:null,error:true,source:null,partial:successfulQueries>0};
          return{value:false,error:false,source:null}
        }


        async function fetchIssnEssential(issn){
          const id=formatIssn(issn);
          const payload=await fetchJson(`https://portal.issn.org/resource/ISSN/${encodeURIComponent(id)}?format=json`,"ISSN Portal");
          const graph=payload?.["@graph"]||[];
          const key=normalizeIssn(id);
          const main=graph.find(item=>String(item?.["@id"]||"").toUpperCase().includes(`/ISSN/${key.slice(0,4)}-${key.slice(4)}`))||graph.find(item=>normalizeIssn(item?.issn)===key);
          const issnNode=graph.find(item=>String(item?.["@id"]||"").endsWith("#ISSN"));
          const lNode=graph.find(item=>String(item?.["@id"]||"").endsWith("#ISSN-L"));
          if(!main&&!issnNode)return null;
          const fmt=String(main?.format||"").split("#").pop();
          const status=String(issnNode?.status||"").split("#").pop();
          return{issn:id,title:main?.mainTitle||first(main?.name)||"",issnL:formatIssn(lNode?.value||""),format:fmt,status}
        }

        async function enrichIssnRegistry(record,target=document){
          const box=target.querySelector?.("#issn-registry-content")||document.querySelector("#issn-registry-content");
          if(!box)return;
          const ids=journalIssns(record).slice(0,2),rows=[];
          for(const issn of ids){
            try{const data=await fetchIssnEssential(issn);if(data)rows.push(data)}catch(_){}
          }
          if(!rows.length){box.innerHTML=`<div class="doaj-empty">Nie udało się pobrać publicznego JSON-LD w tej przeglądarce. Bezpośrednie linki do rekordów ISSN pozostają dostępne poniżej.</div>`;return}
          box.innerHTML=`<div class="registry-records">${rows.map(x=>`<div class="registry-record"><strong>${escapeHtml(x.title||x.issn)}</strong><div class="registry-meta"><span>ISSN ${escapeHtml(x.issn)}</span>${x.issnL?`<span>ISSN-L ${escapeHtml(x.issnL)}</span>`:""}${x.format?`<span>${escapeHtml(x.format)}</span>`:""}${x.status?`<span>status: ${escapeHtml(x.status)}</span>`:""}</div></div>`).join("")}</div>`
        }

        function issnRegistryPanel(record){
          const ids=journalIssns(record).slice(0,2);
          if(!ids.length)return"";
          return `<section class="registry-section"><h3>ISSN Registry</h3><p class="section-intro-small">Publiczne, podstawowe metadane JSON-LD z ISSN Portal. Jeśli zapytanie zostanie zablokowane przez przeglądarkę, nadal możesz otworzyć oficjalny rekord jednym kliknięciem.</p><div id="issn-registry-content"><div class="doaj-empty">Sprawdzam rekordy ISSN…</div></div></section>`
        }

        function serviceLinks(ids,urlBuilder){return ids.map(issn=>`<a class="external-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(urlBuilder(issn))}">${escapeHtml(issn)} ↗</a>`).join("")}
        function externalChecksPanel(record){
          const ids=journalIssns(record).slice(0,2);
          if(!ids.length)return"";
          const opf=i=>`https://openpolicyfinder.jisc.ac.uk/search?search=${encodeURIComponent(i)}`;
          const sjr=i=>`https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(i)}&tip=iss`;
          const iciTitle=String(record?.journal||"").trim();
          const iciUrl=iciTitle?`https://journals.indexcopernicus.com/search/form?search=${encodeURIComponent(iciTitle)}`:"https://journals.indexcopernicus.com/search/form";
          const ddh=i=>`https://ddh.edch.eu/en/search?q=${encodeURIComponent(i)}&scope=ALL&fullyDiamond=true&sort=SCORE_DESC`;
          const issn=i=>`https://portal.issn.org/resource/ISSN/${encodeURIComponent(i)}`;
          return `<section class="external-section"><h3>Sprawdź w innych źródłach</h3><p class="section-intro-small">Jeśli czasopismo ma dwa ISSN-y, generujemy osobny link dla każdego. Pozwala to sprawdzić oba warianty bez kopiowania identyfikatora.</p><div class="external-list">
            <div class="external-service"><div><span class="external-name">Open Policy Finder</span><span class="external-desc">self-archiving, polityka OA</span></div><div class="external-links">${serviceLinks(ids,opf)}</div></div>
            <div class="external-service"><div><span class="external-name">SCImago</span><span class="external-desc">SJR, kwartyle, H-index</span></div><div class="external-links">${serviceLinks(ids,sjr)}</div></div>
            <div class="external-service"><div><span class="external-name">Index Copernicus</span><span class="external-desc">ICI World of Journals · wyszukiwanie po tytule czasopisma</span></div><div class="external-links"><a class="external-link generic" target="_blank" rel="noopener noreferrer" href="${escapeHtml(iciUrl)}">Otwórz ICI ↗</a><span class="external-desc">${iciTitle?`Tytuł: ${escapeHtml(iciTitle)} · `:""}ISSN do ręcznego sprawdzenia: ${escapeHtml(ids.join(" / "))}</span></div></div>
            <div class="external-service"><div><span class="external-name">Diamond Discovery Hub</span><span class="external-desc">wyszukanie po ISSN · tylko rekordy spełniające komplet kryteriów „Fully diamond”</span></div><div class="external-links">${serviceLinks(ids,ddh)}</div></div>
            <div class="external-service"><div><span class="external-name">ISSN Portal ${infoTip("Oficjalny międzynarodowy rejestr ISSN. Służy przede wszystkim do potwierdzania tożsamości czasopisma i jego identyfikatorów.")}</span><span class="external-desc">oficjalny rekord identyfikatora</span></div><div class="external-links">${serviceLinks(ids,issn)}</div></div>
            <div class="external-service"><div><span class="external-name">JUFO</span><span class="external-desc">fińska klasyfikacja, APC, indeksowanie — wyszukaj po ISSN</span></div><div class="external-links"><a class="external-link generic" target="_blank" rel="noopener noreferrer" href="https://jfp.csc.fi/jufoportal">Otwórz JUFO ↗</a><span class="external-desc">ISSN: ${escapeHtml(ids.join(" / "))}</span></div></div>
            <div class="external-service"><div><span class="external-name">COPE</span><span class="external-desc">członkostwo i standardy etyki publikacyjnej</span></div><div class="external-links"><a class="external-link generic" target="_blank" rel="noopener noreferrer" href="https://publicationethics.org/">Otwórz COPE ↗</a><span class="external-desc">Sprawdź tytuł / ISSN; brak członkostwa nie jest oceną jakości.</span></div></div>
          </div></section>`
        }


        function infoTip(text){
          return `<span class="info-tip"><button class="info-tip-button" type="button" aria-label="Wyjaśnienie" aria-expanded="false" data-info="${escapeHtml(text)}">i</button></span>`
        }

        function sourceMetricsPanel(source){
          if(!source)return `<section class="source-metrics-section"><h3>OpenAlex · profil czasopisma</h3><div class="doaj-empty">Nie znaleziono jednoznacznego rekordu czasopisma w OpenAlex.</div></section>`;

          const stats=source?.summary_stats||{};
          const h=stats?.h_index??null;
          const i10=stats?.i10_index??null;
          const mean=stats?.["2yr_mean_citedness"]??null;
          const oaState=source?.is_oa===true
            ? "Fully Open Access"
            : source?.is_oa===false
              ? "nie jest w pełni OA"
              : "brak danych";

          const doajState=source?.is_in_doaj===true
            ? "tak"
            : source?.is_in_doaj===false
              ? "nie"
              : "brak danych";

          const coreState=source?.is_core===true
            ? "tak"
            : source?.is_core===false
              ? "nie"
              : "brak danych";

          const highOaState=source?.is_high_oa_rate===true
            ? "tak"
            : source?.is_high_oa_rate===false
              ? "nie"
              : "brak danych";

          const oaWorks=source?.oa_works_count??null;
          const works=source?.works_count??null;
          const oaShare=(oaWorks!=null&&works>0)?Math.round((Number(oaWorks)/Number(works))*100):null;

          const apcPrices=Array.isArray(source?.apc_prices)
            ?source.apc_prices.map(x=>{
              if(x==null)return"";
              if(typeof x==="string"||typeof x==="number")return String(x);
              const price=x.price??x.amount??"";
              const currency=x.currency??"";
              return [price,currency].filter(v=>v!==""&&v!=null).join(" ")
            }).filter(Boolean)
            :[];

          const publisher=source?.host_organization_name||source?.host_organization?.display_name||"";
          const country=source?.country_code||"";
          const firstYear=source?.first_publication_year??null;
          const lastYear=source?.last_publication_year??null;
          const flipYear=source?.oa_flip_year??null;

          return `<section class="source-metrics-section">
            <h3>OpenAlex · profil czasopisma</h3>
            <p class="section-intro-small">Dane na poziomie całego źródła/czasopisma. Status OA czasopisma jest czym innym niż status OA pojedynczego artykułu.</p>

            <div class="openalex-subsection">
              <h4>Open Access w OpenAlex</h4>
              <div class="journal-metric-grid">
                <div class="journal-metric"><span class="journal-metric-label">Status OA ${infoTip("Czy całe czasopismo jest obecnie w pełni Open Access według OpenAlex. To status czasopisma, nie pojedynczego artykułu.")}</span><span class="journal-metric-value ${source?.is_oa===true?"signal-good":""}">${escapeHtml(oaState)}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">W DOAJ wg OpenAlex ${infoTip("OpenAlex przechowuje informację, czy czasopismo znajduje się w Directory of Open Access Journals (DOAJ).")}</span><span class="journal-metric-value">${escapeHtml(doajState)}</span>${source?.is_in_doaj_since_year?`<span class="history-detail">od ${escapeHtml(source.is_in_doaj_since_year)}</span>`:""}</div>
                <div class="journal-metric"><span class="journal-metric-label">Wysoki udział OA ${infoTip("OpenAlex oznacza źródła, w których duża część publikacji jest dostępna Open Access. Nie oznacza to automatycznie, że wszystkie artykuły są otwarte.")}</span><span class="journal-metric-value">${escapeHtml(highOaState)}</span>${source?.is_high_oa_rate_since_year?`<span class="history-detail">od ${escapeHtml(source.is_high_oa_rate_since_year)}</span>`:""}</div>
                <div class="journal-metric"><span class="journal-metric-label">Prace OA ${infoTip("Liczba publikacji przypisanych do czasopisma, które OpenAlex rozpoznaje jako dostępne Open Access.")}</span><span class="journal-metric-value">${oaWorks!=null?escapeHtml(Number(oaWorks).toLocaleString("pl-PL")):"—"}</span>${oaShare!=null?`<span class="history-detail">ok. ${escapeHtml(oaShare)}% prac w OpenAlex</span>`:""}</div>
                <div class="journal-metric"><span class="journal-metric-label">OA flip year ${infoTip("Rok, w którym czasopismo miało przejść z modelu zamkniętego lub mieszanego na pełny Open Access, jeśli OpenAlex zna taką informację.")}</span><span class="journal-metric-value">${flipYear!=null?escapeHtml(flipYear):"—"}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">APC · cena katalogowa ${infoTip("Article Processing Charge: opłata, której wydawca może wymagać od autora lub instytucji za publikację artykułu. Pokazujemy ją tylko, jeśli źródło udostępnia taką informację.")}</span><span class="journal-metric-value">${apcPrices.length?escapeHtml(apcPrices.join(", ")):"—"}</span><span class="history-detail">jeśli dostępna w OpenAlex</span></div>
              </div>
            </div>

            <div class="openalex-subsection">
              <h4>Bibliometria czasopisma · OpenAlex</h4>
              <p class="section-intro-small">Wskaźniki źródłowe OpenAlex — nie są Journal Impact Factor firmy Clarivate.</p>
              <div class="journal-metric-grid">
                <div class="journal-metric"><span class="journal-metric-label">Publikacje ${infoTip("Liczba prac przypisanych przez OpenAlex do tego czasopisma. Może różnić się od danych wydawcy lub innych baz.")}</span><span class="journal-metric-value">${works!=null?escapeHtml(Number(works).toLocaleString("pl-PL")):"—"}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">Cytowania ${infoTip("Łączna liczba cytowań prac z tego czasopisma zarejestrowanych przez OpenAlex. Zakres bazy wpływa na wynik.")}</span><span class="journal-metric-value">${source.cited_by_count!=null?escapeHtml(Number(source.cited_by_count).toLocaleString("pl-PL")):"—"}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">H-index ${infoTip("Czasopismo ma h-index równy h, jeśli co najmniej h jego publikacji otrzymało co najmniej h cytowań. Łączy liczbę publikacji i ich cytowalność.")}</span><span class="journal-metric-value">${h!=null?escapeHtml(h):"—"}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">i10-index ${infoTip("Liczba publikacji czasopisma, które otrzymały co najmniej 10 cytowań w danych OpenAlex.")}</span><span class="journal-metric-value">${i10!=null?escapeHtml(i10):"—"}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">2-year mean citedness ${infoTip("Średnia liczba cytowań przypadająca na publikacje z ostatniego dwuletniego okna według OpenAlex. To nie jest Journal Impact Factor (JIF).")}</span><span class="journal-metric-value">${mean!=null?escapeHtml(Number(mean).toLocaleString("pl-PL",{maximumFractionDigits:2})):"—"}</span></div>
              </div>
            </div>

            <div class="openalex-subsection">
              <h4>Widoczność i metadane czasopisma</h4>
              <div class="journal-metric-grid">
                <div class="journal-metric"><span class="journal-metric-label">CWTS Core ${infoTip("Informacja OpenAlex o tym, czy źródło należy do zestawu CWTS Core używanego przez CWTS Leiden do analiz bibliometrycznych. Traktuj to jako informację o pokryciu, nie ocenę jakości.")}</span><span class="journal-metric-value">${escapeHtml(coreState)}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">Wydawca</span><span class="journal-metric-value journal-metric-small">${escapeHtml(publisher||"—")}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">Kraj</span><span class="journal-metric-value">${escapeHtml(country||"—")}</span></div>
                <div class="journal-metric"><span class="journal-metric-label">Zakres lat w OpenAlex ${infoTip("Najwcześniejszy i najpóźniejszy rok publikacji widoczny dla tego źródła w OpenAlex. Nie musi odpowiadać pełnej historii czasopisma.")}</span><span class="journal-metric-value">${firstYear!=null||lastYear!=null?escapeHtml(`${firstYear??"?"}–${lastYear??"?"}`):"—"}</span></div>
              </div>
            </div>

          </section>`
        }

        function journalIdentityPanel(record){
          const extra=record?.extraOpenAlexIssns||[];
          return `<section class="facts" aria-label="Identyfikacja czasopisma">
            ${fact("ISSN czasopisma",record?.verifiedIssnText||"brak informacji")}
            ${fact("ISSN-L",record?.issnLText||"brak informacji")}
          </section>
          ${extra.length?`<div class="issn-extra-note"><strong>Dodatkowe identyfikatory zwrócone przez OpenAlex:</strong> ${escapeHtml(extra.join(", "))}. Pokazujemy je dla transparentności, ale nie traktujemy automatycznie jako równorzędnych ISSN badanego czasopisma.</div>`:""}`
        }

        function journalOaStatus(record){
          const d=record?.doaj||{};
          const source=record?.openAlexSource||{};
          if(d.found){
            return{label:"Open Access",detail:"potwierdzone w DOAJ",good:true}
          }
          if(source?.is_oa===true||source?.is_in_doaj===true){
            return{label:"Open Access",detail:"wg OpenAlex",good:true}
          }
          if(source?.is_oa===false){
            return{label:"Brak potwierdzenia pełnego OA",detail:"wg OpenAlex",good:false}
          }
          return{label:"Status OA nieustalony",detail:"brak wystarczających danych",good:false}
        }

        function signalExternalLinks(ids,urlBuilder){
          return ids.slice(0,2).map(issn=>`<a class="signal-mini-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(urlBuilder(issn))}" title="Sprawdź ${escapeHtml(issn)}">${escapeHtml(issn)} ↗</a>`).join("")
        }

        function transparencySignalsPanel(record){
          const d=record.doaj||{};
          const source=record.openAlexSource||{};
          const ids=journalIssns(record).slice(0,2);

          const apcKnown=d.found&&(d.hasApc===true||d.hasApc===false||d.apcPrices?.length);
          const reviewKnown=d.found&&Boolean(d.review);
          const preservationKnown=d.found&&Boolean(d.preservation?.length);
          const oa=journalOaStatus(record);

          const oaWorks=source?.oa_works_count??null;
          const works=source?.works_count??null;
          const oaShare=(oaWorks!=null&&works>0)?Math.round((Number(oaWorks)/Number(works))*100):null;

          const openAlexApc=Array.isArray(source?.apc_prices)
            ?source.apc_prices.map(x=>{
              if(x==null)return"";
              if(typeof x==="string"||typeof x==="number")return String(x);
              const price=x.price??x.amount??"";
              const currency=x.currency??"";
              return [price,currency].filter(v=>v!==""&&v!=null).join(" ")
            }).filter(Boolean)
            :[];

          const ddh=i=>`https://ddh.edch.eu/en/search?q=${encodeURIComponent(i)}&scope=ALL&fullyDiamond=true&sort=SCORE_DESC`;
          const opf=i=>`https://openpolicyfinder.jisc.ac.uk/search?search=${encodeURIComponent(i)}`;

          return `<section class="signals-section">
            <h3>Open Access, koszty i transparentność</h3>
            <p class="section-intro-small"><strong>Ta sekcja dotyczy czasopisma i jego modelu wydawniczego, nie konkretnego artykułu.</strong> Zestawiamy informacje o Open Access, kosztach publikacji i podstawowych sygnałach transparentności. Pokazujemy źródła osobno i nie wyliczamy automatycznego score.</p>

            <div class="signal-grid">
              <div class="signal">
                <span class="signal-title">Status OA czasopisma ${infoTip("Czy całe czasopismo jest obecnie w pełni Open Access. Pokazujemy głównie informację OpenAlex i obecność w DOAJ.")}</span>
                <span class="signal-value ${oa.good?"signal-good":"signal-neutral"}">${escapeHtml(oa.label)}</span>
                <span class="history-detail">${escapeHtml(oa.detail)}</span>
              </div>

              <div class="signal">
                <span class="signal-title">Udział prac OA · OpenAlex ${infoTip("Jaki odsetek publikacji przypisanych do czasopisma OpenAlex rozpoznaje jako dostępne Open Access. To nie oznacza automatycznie, że całe czasopismo jest fully OA.")}</span>
                <span class="signal-value ${oaShare!=null&&oaShare>=80?"signal-good":"signal-neutral"}">${oaShare!=null?`${escapeHtml(oaShare)}%`:"brak informacji"}</span>
                ${oaWorks!=null?`<span class="history-detail">${escapeHtml(Number(oaWorks).toLocaleString("pl-PL"))} prac OA w OpenAlex</span>`:""}
              </div>

              <div class="signal">
                <span class="signal-title">APC · OpenAlex ${infoTip("Katalogowa opłata za publikację artykułu, jeśli OpenAlex ma taką informację. To może nie być ostateczna cena dla konkretnego autora.")}</span>
                <span class="signal-value ${openAlexApc.length?"signal-good":"signal-neutral"}">${openAlexApc.length?escapeHtml(openAlexApc.join(", ")):"brak informacji"}</span>
                <span class="history-detail">źródło: OpenAlex</span>
              </div>

              <div class="signal">
                <span class="signal-title">DOAJ</span>
                <span class="signal-value ${d.found?"signal-good":"signal-neutral"}">${d.found?"rekord znaleziony":"nie znaleziono / brak danych"}</span>
                ${d.found&&d.recordUrl?`<div class="signal-mini-links"><a class="signal-mini-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(d.recordUrl)}">rekord DOAJ ↗</a></div>`:""}
              </div>

              <div class="signal">
                <span class="signal-title">APC · DOAJ ${infoTip("Informacja o opłatach za publikację pochodząca z DOAJ. Jeśli DOAJ nie ma danych, nie oznacza to, że opłaty nie istnieją.")}</span>
                <span class="signal-value ${apcKnown?"signal-good":"signal-neutral"}">${apcKnown?(d.hasApc===false?"brak APC":(d.apcPrices?.length?escapeHtml(d.apcPrices.join(", ")):"APC: tak")):"brak informacji"}</span>
                <span class="history-detail">źródło: DOAJ</span>
              </div>

              <div class="signal">
                <span class="signal-title">MNiSW 2024</span>
                <span class="signal-value ${record.ministry?"signal-good":"signal-neutral"}">${record.ministry?`${escapeHtml(record.ministry.points)} pkt · rekord znaleziony`:"brak dopasowania"}</span>
              </div>

              <div class="signal">
                <span class="signal-title">Peer review w DOAJ ${infoTip("Rodzaj recenzji naukowej deklarowany w metadanych DOAJ, np. double anonymous peer review.")}</span>
                <span class="signal-value ${reviewKnown?"signal-good":"signal-neutral"}">${reviewKnown?escapeHtml(d.review):"brak informacji"}</span>
              </div>

              <div class="signal">
                <span class="signal-title">Preservation ${infoTip("Informacja o długoterminowym zabezpieczaniu treści czasopisma w systemach archiwizacyjnych, np. CLOCKSS, LOCKSS lub Portico.")}</span>
                <span class="signal-value ${preservationKnown?"signal-good":"signal-neutral"}">${preservationKnown?escapeHtml(d.preservation.join(", ")):"brak informacji"}</span>
              </div>

              <div class="signal signal-link-card">
                <span class="signal-title">Diamond OA ${infoTip("Diamond Open Access oznacza publikowanie bez obowiązkowych opłat dla autorów i czytelników. DDH dodatkowo sprawdza otwarte licencje, otwartość dla wszystkich autorów i community ownership.")}</span>
                <span class="signal-value signal-neutral">sprawdź Fully diamond w DDH</span>
                ${ids.length?`<div class="signal-mini-links">${signalExternalLinks(ids,ddh)}</div>`:""}
              </div>

              <a class="signal signal-link-card" target="_blank" rel="noopener noreferrer" href="https://publicationethics.org/">
                <span class="signal-title">COPE ${infoTip("Committee on Publication Ethics. Członkostwo jest jednym z sygnałów stosowania standardów etyki publikacyjnej, ale brak członkostwa nie oznacza, że czasopismo jest niewiarygodne.")}</span>
                <span class="signal-value signal-neutral">sprawdź członkostwo ↗</span>
                <span class="history-detail">brak członkostwa nie jest oceną jakości</span>
              </a>

              <div class="signal signal-link-card">
                <span class="signal-title">Polityka OA ${infoTip("Open Policy Finder opisuje m.in. zasady samoarchiwizacji różnych wersji artykułu, embargo i warunki Open Access.")}</span>
                <span class="signal-value signal-neutral">sprawdź w Open Policy Finder</span>
                ${ids.length?`<div class="signal-mini-links">${signalExternalLinks(ids,opf)}</div>`:""}
              </div>
            </div>

            <div class="method-note">
              <strong>Jak czytać koszty?</strong> OpenAlex i DOAJ mogą podawać różne wartości APC, ponieważ aktualizują dane w różnym czasie i z różnych źródeł. Aplikacja nie wybiera jednej „prawidłowej” kwoty — pokazuje obie wartości osobno.
            </div>
          </section>`
        }
        async function loadJournalProfile(index,target=journalResult){
          const m=ministryRecordFromIndex(index);if(!m)return;
          const title=m.title1||m.title2;activeJournalTarget=target;
          target.innerHTML=`<div class="journal-profile-head"><h2>${escapeHtml(title)}</h2><div class="journal-profile-sub">ISSN ${escapeHtml(m.officialIssns.join(" · ")||"—")} · pobieram dane zewnętrzne…</div></div>`;
          target.classList.add("visible");target.scrollIntoView({behavior:"smooth",block:"start"});
          const [source,doaj]=await Promise.all([fetchOpenAlexSourceByIssns(m.officialIssns),fetchDoajByIssns(m.officialIssns).catch(()=>({found:false,error:true}))]);
          const issnL=formatIssn(source?.issn_l||"");
          const verified=uniqueIssnValues(m.officialIssns);
          const sourceIssns=uniqueIssnValues(source?.issn||[]);
          const extraOpenAlexIssns=additionalOpenAlexIssns(sourceIssns,verified,issnL,m.officialIssns);
          const record={journal:title,ministry:m,verifiedIssns:verified,verifiedIssnText:verified.join(", ")||"brak zweryfikowanego ISSN",issnCandidates:verified,crossrefIssns:[],openAlexIssns:sourceIssns,extraOpenAlexIssns,openAlexIssnText:extraOpenAlexIssns.join(", ")||"brak dodatkowych identyfikatorów",issnL,issnLText:issnL||"brak informacji",doaj,openAlexSource:source,sourceOpenAlexId:shortOpenAlexId(source?.id)};
          window.__publicationExplorerCurrentRecord=record;
          const oaStatus=journalOaStatus(record);
          target.innerHTML=`<div class="journal-profile-head"><h2>${escapeHtml(title)}</h2><div class="journal-profile-sub">${escapeHtml(verified.join(" · "))}${issnL?` · ISSN-L ${escapeHtml(issnL)}`:""}</div><span class="journal-oa-badge ${oaStatus.good?"":"neutral"}">${escapeHtml(oaStatus.label)} · ${escapeHtml(oaStatus.detail)}</span></div>
            ${scopeBanner("journal","Pełny profil czasopisma","Wszystkie poniższe dane odnoszą się do czasopisma jako całości, nie do pojedynczego artykułu.")}
            ${journalIdentityPanel(record)}
            ${ministryPanel(record)}
            ${ministryHistoryPanel(record)}
            ${doajPanel(record)}
            ${sourceMetricsPanel(source)}
            ${journalTopicsPanel(source)}
            ${issnRegistryPanel(record)}
            ${transparencySignalsPanel(record)}
            ${externalChecksPanel(record)}`;
          target.querySelectorAll("[data-ministry-discipline]").forEach(button=>button.addEventListener("click",()=>{
            target.querySelectorAll("[data-ministry-discipline]").forEach(b=>b.classList.toggle("active",b===button));
            const list=target.querySelector("#ministry-related-list"),head=target.querySelector("#ministry-related-title"),box=target.querySelector("#ministry-related");
            if(list&&head&&box){const rows=ministryTopJournalsByDiscipline(button.dataset.ministryDiscipline,m.index,5);head.textContent=`Inne wysoko punktowane czasopisma · ${button.dataset.ministryDisciplineName}`;list.innerHTML=rows.map(ministryRelatedRow).join("");box.hidden=false}
          }));
          const firstDis=target.querySelector("[data-ministry-discipline]");if(firstDis)firstDis.click();
          bindTopicExplorers(target,record.sourceOpenAlexId);
          enrichIssnRegistry(record,target)
        }

        async function loadJournalByIssnOnly(issn,target=journalResult){
          const id=formatIssn(issn);activeJournalTarget=target;
          target.classList.add("visible");
          target.innerHTML=`<div class="journal-profile-head"><h2>${escapeHtml(id)}</h2><div class="journal-profile-sub">Brak dopasowania w aktualnym wykazie MNiSW · pobieram OpenAlex i DOAJ…</div></div>`;
          const [source,doaj]=await Promise.all([fetchOpenAlexSourceByIssns([id]),fetchDoajByIssns([id]).catch(()=>({found:false,error:true}))]);
          const title=source?.display_name||doaj?.title||id;
          const verified=[id];
          const sourceIssns=uniqueIssnValues(source?.issn||[]);
          const issnL=formatIssn(source?.issn_l||"");
          const extraOpenAlexIssns=additionalOpenAlexIssns(sourceIssns,verified,issnL,[]);
          const record={journal:title,ministry:null,verifiedIssns:verified,verifiedIssnText:id,issnCandidates:verified,crossrefIssns:[],openAlexIssns:sourceIssns,extraOpenAlexIssns,openAlexIssnText:extraOpenAlexIssns.join(", ")||"brak dodatkowych identyfikatorów",issnL,issnLText:issnL||"brak informacji",doaj,openAlexSource:source,sourceOpenAlexId:shortOpenAlexId(source?.id)};
          const oaStatus=journalOaStatus(record);
          target.innerHTML=`<div class="journal-profile-head"><h2>${escapeHtml(title)}</h2><div class="journal-profile-sub">ISSN ${escapeHtml(id)}${issnL?` · ISSN-L ${escapeHtml(issnL)}`:""}</div><span class="journal-oa-badge ${oaStatus.good?"":"neutral"}">${escapeHtml(oaStatus.label)} · ${escapeHtml(oaStatus.detail)}</span></div>
            ${scopeBanner("journal","Pełny profil czasopisma","Aktualny wykaz MNiSW może nie zawierać tego tytułu; nadal sprawdzamy historyczną punktację po ISSN i dane zewnętrzne.")}
            ${journalIdentityPanel(record)}
            ${ministryPanel(record)}
            ${ministryHistoryPanel(record)}
            ${doajPanel(record)}
            ${sourceMetricsPanel(source)}
            ${journalTopicsPanel(source)}
            ${issnRegistryPanel(record)}
            ${transparencySignalsPanel(record)}
            ${externalChecksPanel(record)}`;
          bindTopicExplorers(target,record.sourceOpenAlexId);
          enrichIssnRegistry(record,target)
        }

        journalSearchForm.addEventListener("submit",async event=>{
          event.preventDefault();
          journalResult.innerHTML="";
          journalResult.classList.remove("visible","show");
          journalSearchResults.innerHTML="";
          clearInlineMessage(journalMessage);

          const q=journalQuery.value.trim();
          if(!q){
            setInlineMessage(journalMessage,"Wpisz ISSN albo fragment tytułu.",true);
            return
          }

          const inputLooksLikeIssn=looksLikeIssnInput(q);
          if(inputLooksLikeIssn&&!isValidIssn(q)){
            setInlineMessage(journalMessage,`ISSN ${formatIssn(q)} ma nieprawidłową cyfrę kontrolną. Sprawdź identyfikator i spróbuj ponownie.`,true);
            return
          }

          // Spójna zasada UX: poprawny, dokładny ISSN zawsze otwiera pełny profil od razu.
          if(inputLooksLikeIssn&&isValidIssn(q)){
            const issnKey=normalizeIssn(q);
            journalLoading.classList.add("visible");
            try{
              if(Object.prototype.hasOwnProperty.call(MINISTRY_DATA.issnIndex,issnKey)){
                const index=MINISTRY_DATA.issnIndex[issnKey];
                setInlineMessage(journalMessage,`ISSN ${formatIssn(q)} rozpoznany — otwieram pełny profil czasopisma.`);
                await loadJournalProfile(index,journalResult)
              }else{
                setInlineMessage(journalMessage,`ISSN ${formatIssn(q)} nie występuje w wykazie MNiSW 2024 — sprawdzam OpenAlex, DOAJ i pozostałe źródła.`);
                await loadJournalByIssnOnly(q,journalResult)
              }
            }catch(error){
              setInlineMessage(journalMessage,error?.message||"Nie udało się pobrać profilu czasopisma. Spróbuj ponownie za chwilę.",true)
            }finally{
              journalLoading.classList.remove("visible")
            }
            return
          }

          // Tytuł / fragment tytułu: pokazujemy listę kandydatów.
          const rows=journalSearchLocal(q,20);
          if(rows.length){
            journalSearchResults.innerHTML=rows.map(x=>journalResultRow(x.index)).join("");
            bindJournalRows(journalSearchResults,journalResult);
            setInlineMessage(journalMessage,`Znaleziono ${rows.length}${rows.length===20?" pierwszych":""} pasujących rekordów w wykazie MNiSW 2024. Wybierz „Pokaż profil”.`);
            return
          }

          setInlineMessage(journalMessage,"Nie znaleziono tytułu w wykazie MNiSW 2024. W tym POC wyszukiwanie po tytule jest ograniczone do wykazu ministerialnego.")
        });


        finderForm.addEventListener("submit",async event=>{
          event.preventDefault();
          finderJournalResult.innerHTML="";
          finderJournalResult.classList.remove("visible","show");
          finderResults.innerHTML="";
          clearInlineMessage(finderMessage);

          const code=disciplineSelect.value;
          const minPts=Number(pointsFrom.value)||20;
          const maxPts=Number(pointsTo.value)||200;
          const oaMode=oaFilter?.value||"any";
          const name=MINISTRY_DATA.disciplines[code]||code;
          const button=finderForm.querySelector('button[type="submit"]');

          if(minPts>maxPts){
            setInlineMessage(finderMessage,`Nieprawidłowy zakres punktów: wartość „od” (${minPts}) jest większa niż „do” (${maxPts}).`,true);
            return
          }

          const rangeLabel=minPts===maxPts?`${minPts} pkt`:`${minPts}–${maxPts} pkt`;

          if(oaMode!=="any"){
            const modeLabel=oaMode==="oa_any"?"Fully OA — DOAJ lub OpenAlex":oaMode==="doaj"?"Tylko czasopisma w DOAJ":"Fully OA wg OpenAlex";
            if(button){button.disabled=true;button.textContent="Sprawdzam OA…"}
            setInlineMessage(finderMessage,`${name} · ${rangeLabel}: sprawdzam filtr „${modeLabel}”…`);

            try{
              const base=journalsForDisciplineRange(code,minPts,maxPts,Number.MAX_SAFE_INTEGER);
              const res=await oaJournalsForDisciplineRange(code,minPts,maxPts,oaMode,20,60);
              finderResults.innerHTML=res.rows.map(hit=>journalResultRow(hit.index,hit.evidence)).join("");
              bindJournalRows(finderResults,finderJournalResult);

              const degraded=res.unverified?` Nie udało się jednoznacznie zweryfikować statusu OA dla ${res.unverified} ${res.unverified===1?"czasopisma":"czasopism"} z powodu chwilowego braku odpowiedzi któregoś API; nie są one liczone jako „nie-OA”.`:"";
              const scanNote=base.total>60?` Ze względu na liczbę zapytań OA sprawdzono pierwsze 60 z ${base.total.toLocaleString("pl-PL")} czasopism w tym zakresie, w kolejności alfabetycznej.`:` Sprawdzono wszystkie ${base.total.toLocaleString("pl-PL")} czasopisma z tego zakresu.`;

              if(res.rows.length)setInlineMessage(finderMessage,`${name} · ${rangeLabel}: znaleziono ${res.rows.length} czasopism spełniających filtr „${modeLabel}”.${scanNote}${degraded}`);
              else setInlineMessage(finderMessage,`${name} · ${rangeLabel}: w sprawdzonej części listy nie znaleziono czasopism spełniających filtr „${modeLabel}”.${scanNote}${degraded}`)
            }catch(error){
              setInlineMessage(finderMessage,error?.message||"Nie udało się zakończyć sprawdzania statusu OA. Spróbuj ponownie za chwilę.",true)
            }finally{
              if(button){button.disabled=false;button.textContent="Pokaż"}
            }
            return
          }

          const res=journalsForDisciplineRange(code,minPts,maxPts,100);
          const suffix=res.total>100?` Pokazuję pierwsze 100 alfabetycznie.`:"";
          setInlineMessage(finderMessage,`${name} · ${rangeLabel}: ${res.total.toLocaleString("pl-PL")} czasopism spełnia wybrane kryteria.${suffix}`);
          finderResults.innerHTML=res.rows.map(index=>journalResultRow(index)).join("");
          bindJournalRows(finderResults,finderJournalResult)
        });


        function historicalPointsForRecord(record,year){
          const map=MINISTRY_HISTORY_POINTS[String(year)]||{};
          const candidates=[...(record.verifiedIssns||[]),record.issnL,...(record.crossrefIssns||[]),...(record.ministry?.officialIssns||[])].filter(Boolean);
          const seen=new Set();
          const hits=[];
          for(const issn of candidates){
            const key=normalizeIssn(issn);
            if(!key||seen.has(key))continue;
            seen.add(key);
            if(Object.prototype.hasOwnProperty.call(map,key)){
              hits.push({points:map[key],issn:formatIssn(key)})
            }
          }
          if(!hits.length)return null;
          const uniquePoints=[...new Set(hits.map(hit=>hit.points))];
          if(uniquePoints.length>1){
            return{points:null,conflict:true,hits,issn:hits.map(hit=>hit.issn).join(", ")}
          }
          return{
            points:uniquePoints[0],
            conflict:false,
            hits,
            issn:hits.map(hit=>hit.issn).join(", ")
          }
        }


        function normalizeDoi(value){let doi=String(value||"").trim().replace(/^doi\s*:\s*/i,"").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"");doi=doi.split(/[?#]/)[0].trim();try{doi=decodeURIComponent(doi)}catch(_){}return doi.replace(/[\s.]+$/,"")}
        function isDoi(value){return /^10\.\d{4,9}\/\S+$/i.test(value)}
        function plainText(value){const doc=new DOMParser().parseFromString(String(value||""),"text/html");return(doc.body.textContent||"").replace(/\s+/g," ").trim()}
        function escapeHtml(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
        function safeUrl(value){if(!value)return"";try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"?url.href:""}catch(_){return""}}
        function safePublicWebUrl(value){
          const href=safeUrl(value);
          if(!href)return"";
          try{
            const url=new URL(href);
            const host=String(url.hostname||"").trim();
            if(!host)return"";
            const ipv4=/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
            const ipv6=host.includes(":");
            if(!host.includes(".")&&!ipv4&&!ipv6)return"";
            return url.href
          }catch(_){return""}
        }
        function first(value){return Array.isArray(value)?value.find(Boolean)||"":value||""}
        function dateYear(record){const candidates=[record?.published?.["date-parts"],record?.issued?.["date-parts"],record?.["published-online"]?.["date-parts"],record?.["published-print"]?.["date-parts"]];for(const parts of candidates){if(Array.isArray(parts)&&Array.isArray(parts[0])&&parts[0][0])return parts[0][0]}return""}
        function crossrefAuthors(record){return(record?.author||[]).map(author=>[author.given,author.family].filter(Boolean).join(" ")||author.name).filter(Boolean)}
        function openAlexAuthors(record){return(record?.authorships||[]).map(item=>item?.author?.display_name).filter(Boolean)}

        async function fetchJson(url,sourceName){const response=await fetch(url,{headers:{Accept:"application/json"}});if(response.status===404)return null;if(!response.ok){const error=new Error(`${sourceName}: HTTP ${response.status}`);error.status=response.status;throw error}return response.json()}
        async function fetchOpenAlex(doi){const endpoint=`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`;return fetchJson(endpoint,"OpenAlex")}
        async function fetchOpenAlexSource(sourceId){if(!sourceId)return null;const shortId=String(sourceId).split("/").pop();if(!shortId)return null;return fetchJson(`https://api.openalex.org/sources/${encodeURIComponent(shortId)}`,"OpenAlex Source")}
        async function fetchRelatedSources(topicId){const shortId=String(topicId||"").split("/").pop();if(!shortId)return[];if(relatedSourcesCache.has(shortId))return relatedSourcesCache.get(shortId);const endpoint=`https://api.openalex.org/sources?filter=type:journal,topics.id:${encodeURIComponent(shortId)}&sort=works_count:desc&per_page=12`;const payload=await fetchJson(endpoint,"OpenAlex Sources");const rows=payload?.results||[];relatedSourcesCache.set(shortId,rows);return rows}
        async function fetchCrossref(doi){const endpoint=`https://api.crossref.org/works/${encodeURIComponent(doi)}`;const payload=await fetchJson(endpoint,"Crossref");return payload?.message||null}
        async function fetchDoajByIssns(issns){
          const candidates=[...new Set((issns||[]).map(formatIssn).filter(Boolean))];
          let hadError=false;
          let successfulQueries=0;
          for(const issn of candidates){
            try{
              const query=`issn:${issn}`;
              const payload=await fetchJson(`https://doaj.org/api/search/journals/${encodeURIComponent(query)}?pageSize=10`,"DOAJ");
              successfulQueries++;
              const results=payload?.results||[];
              if(!results.length)continue;
              const wanted=normalizeIssn(issn);
              const exact=results.find(item=>{
                const ids=item?.bibjson?.identifier||item?.bibjson?.identifiers||[];
                return ids.some(id=>normalizeIssn(id?.id||id?.value||id)===wanted)
              })||results[0];
              return normalizeDoajRecord(exact,issn)
            }catch(_){
              hadError=true
            }
          }
          if(hadError)return{found:false,error:true,partial:successfulQueries>0};
          return{found:false,error:false}
        }


        function doajText(value){
          if(value===null||value===undefined||value==="")return"brak informacji";
          if(typeof value==="boolean")return value?"tak":"nie";
          if(Array.isArray(value))return value.filter(Boolean).join(", ")||"brak informacji";
          return String(value)
        }

        function normalizeDoajRecord(raw,matchedIssn){
          if(!raw)return{found:false};
          const bib=raw.bibjson||raw;
          const links=bib.link||bib.links||[];
          const linkByType=type=>{
            const found=links.find(link=>String(link?.type||link?.label||"").toLowerCase().includes(type));
            return safeUrl(found?.url||found?.href)
          };
          const ids=(bib.identifier||bib.identifiers||[]).map(item=>formatIssn(item?.id||item?.value||item)).filter(Boolean);
          const licenses=(bib.license||bib.licenses||[]).map(item=>item?.type||item?.title||item?.name||item?.url).filter(Boolean);
          const review=bib?.editorial_review?.process||bib?.editorial?.review_process||bib?.editorial?.review?.process||bib?.review_process||"";
          const publicationTime=bib?.publication_time??bib?.editorial?.publication_time??null;
          const policies=bib?.archiving_policy?.policy||bib?.archiving_policy?.policies||bib?.preservation?.services||[];
          const preservation=(Array.isArray(policies)?policies:[policies]).map(item=>item?.name||item?.title||item).filter(Boolean);
          const apcObj=bib?.apc||{};
          const explicitApc=typeof apcObj?.has_apc==="boolean"?apcObj.has_apc:(typeof bib?.has_apc==="boolean"?bib.has_apc:null);
          const prices=[];
          const addPrice=(amount,currency)=>{
            if(amount===null||amount===undefined||amount==="")return;
            prices.push([amount,currency].filter(Boolean).join(" "))
          };
          if(Array.isArray(apcObj?.charges))apcObj.charges.forEach(ch=>addPrice(ch?.price??ch?.amount,ch?.currency));
          if(apcObj?.average_price!==undefined){
            if(typeof apcObj.average_price==="object"){
              Object.entries(apcObj.average_price).forEach(([currency,amount])=>addPrice(amount,currency))
            }else addPrice(apcObj.average_price,apcObj.currency)
          }
          const hasApc=explicitApc!==null?explicitApc:(prices.length?true:null);
          const waiverUrl=linkByType("waiver")||safeUrl(apcObj?.waiver_url||apcObj?.waiver?.url);
          const waiverFlag=typeof apcObj?.waiver==="boolean"?apcObj.waiver:(waiverUrl?true:null);
          const copyright=bib?.author_copyright?.copyright??bib?.author_copyright??bib?.copyright?.author_retains??null;
          const oaStart=bib?.oa_start?.year??bib?.oa_start??bib?.open_access_start??null;
          const recordIssn=ids[0]||formatIssn(matchedIssn);
          return{
            found:true,
            title:bib?.title||"",
            publisher:bib?.publisher?.name||bib?.publisher||"",
            country:bib?.publisher?.country||bib?.country||"",
            issns:ids,
            matchedIssn:formatIssn(matchedIssn),
            oaStart,
            hasApc,
            apcPrices:[...new Set(prices)],
            waiverFlag,
            waiverUrl,
            licenses:[...new Set(licenses)],
            review,
            publicationTime,
            preservation:[...new Set(preservation)],
            copyright,
            seal:raw?.admin?.seal===true,
            homepage:linkByType("homepage")||safeUrl(bib?.url),
            recordUrl:recordIssn?`https://doaj.org/toc/${encodeURIComponent(recordIssn)}`:"https://doaj.org/"
          }
        }
        function uniqueBy(items,keyFn){const seen=new Set();return items.filter(item=>{const key=keyFn(item);if(!key||seen.has(key))return false;seen.add(key);return true})}
        function oaLocations(openAlex){
          if(!openAlex)return[];
          const locations=[openAlex.best_oa_location,...(openAlex.locations||[])]
            .filter(location=>location&&location.is_oa)
            .map(location=>{
              const pdf=safePublicWebUrl(location.pdf_url);
              const landing=safePublicWebUrl(location.landing_page_url);
              const url=pdf||landing;
              if(!url)return null;
              return{
                title:location?.source?.display_name||"Otwarta kopia",
                url,
                pdfUrl:pdf,
                meta:[location.version,location.license].filter(Boolean).join(" · ")||"OpenAlex · OA",
                kind:"oa"
              }
            })
            .filter(Boolean);
          return uniqueBy(locations,item=>item.url)
        }

        function isTechnicalCrossrefLink(link){
          const intended=String(link?.["intended-application"]||"").toLowerCase();
          return intended==="similarity-checking"||intended==="text-mining"
        }

        function crossrefLocations(crossref){
          const rows=(crossref?.link||[])
            .filter(link=>!isTechnicalCrossrefLink(link))
            .map(link=>{
              const url=safePublicWebUrl(link?.URL);
              if(!url)return null;
              const contentType=String(link?.["content-type"]||"").toLowerCase();
              const isPdf=contentType.includes("pdf");
              return{
                title:isPdf?"Plik PDF wskazany przez wydawcę":"Pełny tekst / strona wskazana przez wydawcę",
                url,
                pdfUrl:isPdf?url:"",
                meta:["Crossref",link?.["content-version"],link?.["intended-application"]].filter(Boolean).join(" · "),
                kind:"crossref"
              }
            })
            .filter(Boolean);
          return uniqueBy(rows,item=>item.url)
        }

        function publicationAccessItems(record){
          const rows=[];
          const add=item=>{
            if(!item?.url)return;
            if(rows.some(existing=>existing.url===item.url))return;
            rows.push(item)
          };
          (record?.oaLocations||[]).forEach(add);
          (record?.crossrefLocations||[]).forEach(add);
          const publisher=safePublicWebUrl(record?.publisherUrl);
          if(publisher)add({title:"Strona publikacji u wydawcy",url:publisher,pdfUrl:"",meta:"Crossref · resource.primary",kind:"publisher"});
          return rows
        }
        function formatType(type){return typeLabels[type]||type||"brak informacji"}
        function formatLicense(openAlex,crossref){const oaLicense=openAlex?.best_oa_location?.license;if(oaLicense)return oaLicense;const license=first(crossref?.license);const crLicense=license?.URL;return crLicense?crLicense.replace(/^https?:\/\//,""):"brak informacji"}

        function normalizeIssn(value){return String(value||"").replace(/[^0-9Xx]/g,"").toUpperCase()}
        function formatIssn(value){const key=normalizeIssn(value);return key.length===8?`${key.slice(0,4)}-${key.slice(4)}`:String(value||"").trim()}
        function looksLikeIssnInput(value){return /^\s*\d{4}-?\d{3}[\dXx]\s*$/.test(String(value||""))}
        function isValidIssn(value){
          const key=normalizeIssn(value);
          if(!/^\d{7}[\dX]$/.test(key))return false;
          let sum=0;
          for(let i=0;i<7;i++)sum+=Number(key[i])*(8-i);
          const remainder=11-(sum%11);
          const expected=remainder===10?"X":remainder===11?"0":String(remainder);
          return key[7]===expected
        }
        function uniqueIssnValues(values){
          const out=[];
          for(const value of values||[]){
            const formatted=formatIssn(value),key=normalizeIssn(formatted);
            if(key.length===8&&!out.some(v=>normalizeIssn(v)===key))out.push(formatted)
          }
          return out
        }

        function collectIssnData(crossref,openAlexSource,openAlex){
          const crossrefIssns=uniqueIssnValues([
            ...(crossref?.ISSN||[]),
            ...(crossref?.["issn-type"]||[]).map(item=>item?.value)
          ]);
          const openAlexIssns=uniqueIssnValues([
            ...(openAlexSource?.issn||[]),
            ...(openAlex?.primary_location?.source?.issn||[])
          ]);
          const issnL=formatIssn(openAlexSource?.issn_l||openAlex?.primary_location?.source?.issn_l||"");
          const lookupCandidates=uniqueIssnValues([...crossrefIssns,issnL,...openAlexIssns]);
          return{crossrefIssns,openAlexIssns,issnL,lookupCandidates,candidates:lookupCandidates}
        }

        function additionalOpenAlexIssns(openAlexIssns,primaryIssns,issnL,ministryIssns=[]){
          const excluded=new Set([...primaryIssns,issnL,...ministryIssns].filter(Boolean).map(normalizeIssn));
          return uniqueIssnValues(openAlexIssns).filter(value=>!excluded.has(normalizeIssn(value)))
        }
        function normalizeJournalTitle(value){
          return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"")
        }
        function ministryRecordTitleMatches(idx,journalTitle){
          const raw=MINISTRY_DATA.records[idx];
          if(!raw)return false;
          const wanted=normalizeJournalTitle(journalTitle);
          if(!wanted)return false;
          return[raw[0],raw[1]].filter(Boolean).some(title=>normalizeJournalTitle(title)===wanted)
        }
        function ministryLookup(issnData,journalTitle){
          const titleKey=normalizeJournalTitle(journalTitle);
          const resolveCandidates=(values,requireTitleMatch=false)=>{
            const matches=[...new Set((values||[])
              .map(value=>MINISTRY_DATA.issnIndex[normalizeIssn(value)])
              .filter(value=>value!==undefined))];
            if(!matches.length)return null;
            if(matches.length===1){
              const idx=matches[0];
              if(requireTitleMatch&&titleKey&&!ministryRecordTitleMatches(idx,journalTitle))return null;
              return idx
            }
            if(titleKey){
              const titleMatches=matches.filter(idx=>ministryRecordTitleMatches(idx,journalTitle));
              if(titleMatches.length===1)return titleMatches[0]
            }
            return null
          };

          let idx=resolveCandidates(issnData?.crossrefIssns||[],false);
          let matchedBy=idx!==null?"crossref-issn":"";

          if(idx===null||idx===undefined){
            idx=resolveCandidates([issnData?.issnL].filter(Boolean),true);
            if(idx!==null&&idx!==undefined)matchedBy="issn-l+title"
          }

          if(idx===null||idx===undefined){
            idx=resolveCandidates(issnData?.openAlexIssns||[],true);
            if(idx!==null&&idx!==undefined)matchedBy="openalex-issn+title"
          }

          if((idx===null||idx===undefined)&&titleKey&&Object.prototype.hasOwnProperty.call(MINISTRY_DATA.titleIndex,titleKey)){
            idx=MINISTRY_DATA.titleIndex[titleKey];
            matchedBy="title"
          }

          if(idx===null||idx===undefined)return null;

          const raw=MINISTRY_DATA.records[idx];
          const officialIssns=(raw[4]||[]).map(formatIssn);
          const allCandidates=uniqueIssnValues([
            ...(issnData?.crossrefIssns||[]),
            issnData?.issnL,
            ...(issnData?.openAlexIssns||[])
          ]);
          const matchedIssns=allCandidates.filter(issn=>officialIssns.some(x=>normalizeIssn(x)===normalizeIssn(issn)));

          return{
            index:idx,
            title1:raw[0]||"",
            title2:raw[1]||"",
            points:raw[2],
            disciplineCodes:raw[3]||[],
            disciplines:(raw[3]||[]).map(code=>({code,name:MINISTRY_DATA.disciplines[code]||code})),
            officialIssns,
            matchedBy,
            matchedIssns
          }
        }

        function numericOrNull(value){
          const n=Number(value);
          return Number.isFinite(n)?n:null
        }
        function citationCountsByYear(openAlex){
          return(openAlex?.counts_by_year||[])
            .map(item=>({year:numericOrNull(item?.year),count:numericOrNull(item?.cited_by_count)}))
            .filter(item=>item.year!==null&&item.count!==null)
            .sort((a,b)=>a.year-b.year)
        }
        function shortOpenAlexId(value){return value?String(value).split("/").pop():""}
        function normalizeTopic(topic){if(!topic)return null;return{id:shortOpenAlexId(topic.id),displayName:plainText(topic.display_name||topic.displayName||"Topic bez nazwy"),count:topic.count??null,score:topic.score??null,subfield:plainText(topic.subfield?.display_name||topic.subfield?.displayName||""),field:plainText(topic.field?.display_name||topic.field?.displayName||""),domain:plainText(topic.domain?.display_name||topic.domain?.displayName||"")}}
        function topicPath(topic){if(!topic)return"";return[topic.domain,topic.field,topic.subfield].filter(Boolean).join(" → ")}
        function uniqueTopics(items){const seen=new Set();return(items||[]).map(normalizeTopic).filter(Boolean).filter(topic=>{if(!topic.id||seen.has(topic.id))return false;seen.add(topic.id);return true})}

        function buildRecord(doi,openAlex,crossref,openAlexSource){
          const crTitle=plainText(first(crossref?.title)),oaTitle=plainText(openAlex?.display_name||openAlex?.title),crAuthors=crossrefAuthors(crossref),authors=crAuthors.length?crAuthors:openAlexAuthors(openAlex),openAccess=Boolean(openAlex?.open_access?.is_oa),oaStatus=openAlex?.open_access?.oa_status||(openAccess?"open":"closed"),oa=oaLocations(openAlex),cr=crossrefLocations(crossref),bestOa=oa[0]||null,publisherUrl=safePublicWebUrl(crossref?.resource?.primary?.URL||crossref?.URL);
          const journal=plainText(first(crossref?.["container-title"]))||openAlexSource?.display_name||openAlex?.primary_location?.source?.display_name||"brak informacji";
          const issnData=collectIssnData(crossref,openAlexSource,openAlex);
          const ministry=ministryLookup(issnData,journal);

          const officialIssns=ministry?.officialIssns||[];
          const issnL=issnData.issnL||"";

          let verifiedIssns=[],issnSource="";
          if(issnData.crossrefIssns.length){
            const intersection=officialIssns.length
              ?issnData.crossrefIssns.filter(value=>officialIssns.some(official=>normalizeIssn(official)===normalizeIssn(value)))
              :[];
            verifiedIssns=intersection.length?intersection:issnData.crossrefIssns;
            issnSource=intersection.length?"Crossref + potwierdzenie w MNiSW 2024":"Crossref"
          }else if(officialIssns.length){
            verifiedIssns=officialIssns;
            issnSource="Wykaz MNiSW 2024"
          }else if(issnL){
            verifiedIssns=[issnL];
            issnSource="OpenAlex Source · ISSN-L"
          }

          verifiedIssns=uniqueIssnValues(verifiedIssns);
          const extraOpenAlexIssns=additionalOpenAlexIssns(issnData.openAlexIssns,verifiedIssns,issnL,officialIssns);

          const verifiedIssnText=verifiedIssns.join(", ")||"brak informacji";
          const issnLText=issnL||"brak informacji";
          const issnSourceText=issnSource||"brak informacji";

          return{
            doi,
            title:crTitle||oaTitle||"Publikacja bez tytułu w pobranych rekordach",
            authors,
            year:dateYear(crossref)||openAlex?.publication_year||"brak informacji",
            journal,
            publisher:plainText(crossref?.publisher)||openAlexSource?.host_organization_name||"brak informacji",
            type:crossref?.type||openAlex?.type||"",
            volumeIssue:[crossref?.volume&&`t. ${crossref.volume}`,crossref?.issue&&`nr ${crossref.issue}`].filter(Boolean).join(", ")||"brak informacji",
            pages:crossref?.page||crossref?.["article-number"]||"brak informacji",
            issnCandidates:issnData.candidates,
            crossrefIssns:issnData.crossrefIssns,
            openAlexIssns:issnData.openAlexIssns,
            extraOpenAlexIssns,
            verifiedIssns,
            verifiedIssnText,
            issnSourceText,
            crossrefIssnText:issnData.crossrefIssns.join(", ")||"brak w rekordzie publikacji Crossref",
            openAlexIssnText:extraOpenAlexIssns.join(", ")||"brak dodatkowych identyfikatorów poza głównym ISSN / ISSN-L",
            ministryIssnText:officialIssns.join(", ")||"brak dopasowania w wykazie MNiSW 2024",
            issnL:issnL||null,
            issnLText,
            openAccess,
            oaStatus,
            oaStatusLabel:statusLabels[oaStatus]||(openAccess?"Open Access":"brak potwierdzonego OA"),
            license:formatLicense(openAlex,crossref),
            version:openAlex?.best_oa_location?.version||"brak informacji",
            oaPlace:openAlex?.best_oa_location?.source?.display_name||"brak potwierdzonej lokalizacji",
            openAlexId:openAlex?.id?.split("/").pop()||"brak rekordu",
            openAlexUrl:safeUrl(openAlex?.id),
            crossrefUrl:crossref?`https://api.crossref.org/works/${encodeURIComponent(doi)}`:"",
            publisherUrl,
            doiUrl:`https://doi.org/${encodeURIComponent(doi)}`,
            bestOa,
            oaLocations:oa,
            crossrefLocations:cr,
            hasOpenAlex:Boolean(openAlex),
            hasCrossref:Boolean(crossref),
            sourceOpenAlexId:shortOpenAlexId(openAlexSource?.id||openAlex?.primary_location?.source?.id),
            sourceOpenAlexUrl:safeUrl(openAlexSource?.id||openAlex?.primary_location?.source?.id),
            primaryTopic:normalizeTopic(openAlex?.primary_topic||openAlex?.topics?.[0]),
            articleTopics:uniqueTopics(openAlex?.topics||[]).slice(0,3),
            journalTopics:uniqueTopics(openAlexSource?.topics||[]).slice(0,6),
            journalTopicShare:uniqueTopics(openAlexSource?.topic_share||[]).slice(0,6),
            hasOpenAlexSource:Boolean(openAlexSource),
            openAlexSource,
            ministry,
            bibliometrics:{
              openAlexCitations:numericOrNull(openAlex?.cited_by_count),
              crossrefCitations:numericOrNull(crossref?.["is-referenced-by-count"]),
              openAlexReferences:numericOrNull(openAlex?.referenced_works_count),
              crossrefReferences:Array.isArray(crossref?.reference)?crossref.reference.length:null,
              fwci:numericOrNull(openAlex?.fwci),
              countsByYear:citationCountsByYear(openAlex)
            }
          }
        }

        function fact(label,value){return`<div class="fact"><span class="fact-label">${escapeHtml(label)}</span><span class="fact-value">${escapeHtml(value)}</span></div>`}
        function action(label,url,className=""){const href=safeUrl(url);if(!href)return"";return`<a class="action ${className}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" data-external-link>${escapeHtml(label)}</a>`}
        function locationRow(item){
          const kind=item.kind==="oa"?"oa":"publisher";
          const kindLabel=item.kind==="oa"?"Open Access":item.kind==="publisher"?"wydawca":"Crossref";
          const linkLabel=item.pdfUrl&&item.url===item.pdfUrl?"PDF ↗":"Otwórz ↗";
          return `<div class="location"><div><span class="location-title">${escapeHtml(item.title)}<span class="access-kind ${kind}">${escapeHtml(kindLabel)}</span></span><span class="location-meta">${escapeHtml(item.meta||"")}</span></div><a class="location-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" data-external-link>${escapeHtml(linkLabel)}</a></div>`
        }

        function sourceRecordsPanel(record){
          const links=[
            ["Strona DOI",record?.doiUrl],
            ["Rekord OpenAlex",record?.openAlexUrl],
            ["Rekord Crossref",record?.crossrefUrl]
          ].filter(([,url])=>safeUrl(url));
          if(!links.length)return"";
          return `<section class="source-records-section"><h3>Rekordy źródłowe publikacji</h3><p>Linki poniżej prowadzą do rekordów identyfikacyjnych i API. Nie są dodatkowymi kopiami pełnego tekstu.</p><div class="source-record-links">${links.map(([label,url])=>`<a class="source-record-link" href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`).join("")}</div></section>`
        }


        function downloadTextFile(filename,content,mimeType){
          const blob=new Blob([content],{type:mimeType||"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
          a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)
        }

        function safeBaseName(record){
          return String(record?.title||record?.doi||"publication").normalize("NFKD").replace(/[^\w\s.-]/g,"").trim().replace(/\s+/g,"_").slice(0,90)||"publication"
        }

        function risType(record){
          const map={"journal-article":"JOUR","book-chapter":"CHAP",book:"BOOK","proceedings-article":"CONF",proceedings:"CONF",posted:"GEN",report:"RPRT",dissertation:"THES",dataset:"DATA"};
          return map[record?.type]||"GEN"
        }

        function toRIS(record){
          const lines=[`TY  - ${risType(record)}`];
          if(record.title)lines.push(`TI  - ${record.title}`);
          (record.authors||[]).forEach(author=>lines.push(`AU  - ${author}`));
          if(record.year&&record.year!=="brak informacji")lines.push(`PY  - ${record.year}`);
          if(record.journal&&record.journal!=="brak informacji")lines.push(`JO  - ${record.journal}`);
          if(record.publisher&&record.publisher!=="brak informacji")lines.push(`PB  - ${record.publisher}`);
          if(record.volumeIssue&&record.volumeIssue!=="brak informacji"){
            const volMatch=record.volumeIssue.match(/t\.\s*([^,]+)/i);
            const issueMatch=record.volumeIssue.match(/nr\s*([^,]+)/i);
            if(volMatch)lines.push(`VL  - ${volMatch[1].trim()}`);
            if(issueMatch)lines.push(`IS  - ${issueMatch[1].trim()}`);
          }
          if(record.pages&&record.pages!=="brak informacji")lines.push(`SP  - ${record.pages}`);
          (record.verifiedIssns||[]).forEach(value=>lines.push(`SN  - ${value}`));
          if(record.issnL)lines.push(`N1  - ISSN-L: ${record.issnL}`);
          if(record.doi)lines.push(`DO  - ${record.doi}`);
          if(record.doiUrl)lines.push(`UR  - ${record.doiUrl}`);
          if(record.openAlexId&&record.openAlexId!=="brak rekordu")lines.push(`N1  - OpenAlex ID: ${record.openAlexId}`);
          if(record.oaStatusLabel)lines.push(`N1  - Open Access: ${record.oaStatusLabel}`);
          if(record.license&&record.license!=="brak informacji")lines.push(`N1  - License: ${record.license}`);
          lines.push("ER  - ");
          return lines.join("\n")
        }

        function escapeBib(value){
          return String(value??"").replace(/\\/g,"\\\\").replace(/{/g,"\\{").replace(/}/g,"\\}")
        }

        function bibType(record){
          const map={"journal-article":"article","book-chapter":"incollection",book:"book","proceedings-article":"inproceedings",proceedings:"proceedings",report:"techreport",dissertation:"phdthesis"};
          return map[record?.type]||"misc"
        }

        function toBibTeX(record){
          const year=(record.year&&record.year!=="brak informacji")?record.year:"";
          const firstAuthor=(record.authors?.[0]||"work").split(/\s+/).pop()||"work";
          const key=(firstAuthor+year).replace(/[^\w]/g,"")||"work";
          const fields=[];
          if(record.title)fields.push(`  title = {${escapeBib(record.title)}}`);
          if(record.authors?.length)fields.push(`  author = {${escapeBib(record.authors.join(" and "))}}`);
          if(year)fields.push(`  year = {${escapeBib(year)}}`);
          if(record.journal&&record.journal!=="brak informacji")fields.push(`  journal = {${escapeBib(record.journal)}}`);
          if(record.publisher&&record.publisher!=="brak informacji")fields.push(`  publisher = {${escapeBib(record.publisher)}}`);
          if(record.pages&&record.pages!=="brak informacji")fields.push(`  pages = {${escapeBib(record.pages)}}`);
          if(record.doi)fields.push(`  doi = {${escapeBib(record.doi)}}`);
          if(record.doiUrl)fields.push(`  url = {${escapeBib(record.doiUrl)}}`);
          if(record.verifiedIssns?.length)fields.push(`  issn = {${escapeBib(record.verifiedIssns.join(", "))}}`);
          if(record.issnL)fields.push(`  note = {ISSN-L: ${escapeBib(record.issnL)}}`);
          return `@${bibType(record)}{${key},\n${fields.join(",\n")}\n}\n`
        }

        function toJSON(record){
          const data={
            title:record.title,
            authors:record.authors,
            year:record.year,
            journal:record.journal,
            publisher:record.publisher,
            type:record.type,
            volume_issue:record.volumeIssue,
            pages:record.pages,
            identifiers:{
              issn:record.verifiedIssns,
              issn_l:record.issnL,
              crossref_issn_candidates:record.crossrefIssns,
              openalex_source_issn_candidates:record.openAlexIssns
            },
            doi:record.doi,
            doi_url:record.doiUrl,
            crossref:{
              available:record.hasCrossref,
              api_record_url:record.crossrefUrl,
              publisher_url:record.publisherUrl,
              fulltext_links:record.crossrefLocations
            },
            openalex:{
              available:record.hasOpenAlex,
              id:record.openAlexId,
              record_url:record.openAlexUrl,
              is_open_access:record.openAccess,
              oa_status:record.oaStatus,
              oa_status_label:record.oaStatusLabel,
              license:record.license,
              version:record.version,
              oa_place:record.oaPlace,
              oa_locations:record.oaLocations,
              primary_topic:record.primaryTopic,
              article_topics:record.articleTopics,
              source_id:record.sourceOpenAlexId,
              journal_topics:record.journalTopics,
              journal_topic_share:record.journalTopicShare
            },
            ministry_2024:record.ministry,
            bibliometrics:record.bibliometrics,
            doaj:record.doaj||null
          };
          return JSON.stringify(data,null,2)
        }

        function metadataPanel(record){
          return `<div class="metadata-export">
            <h3>Pobierz metadane</h3>
            <p>Eksport bieżącego rekordu. Metadane bibliograficzne pochodzą przede wszystkim z Crossref, a informacje OA są uzupełniane z OpenAlex.</p>
            <div class="metadata-buttons">
              <button class="metadata-button" type="button" data-export="ris">RIS</button>
              <button class="metadata-button" type="button" data-export="bibtex">BibTeX</button>
              <button class="metadata-button" type="button" data-export="json">JSON</button>
            </div>
          </div>`
        }

        function bindMetadataExport(record){
          result.querySelectorAll("[data-export]").forEach(button=>button.addEventListener("click",()=>{
            const base=safeBaseName(record),kind=button.dataset.export;
            if(kind==="ris")downloadTextFile(`${base}.ris`,toRIS(record),"application/x-research-info-systems;charset=utf-8");
            if(kind==="bibtex")downloadTextFile(`${base}.bib`,toBibTeX(record),"application/x-bibtex;charset=utf-8");
            if(kind==="json")downloadTextFile(`${base}.json`,toJSON(record),"application/json;charset=utf-8")
          }))
        }



        function metricCard(source,label,value,format="integer"){
          let shown="—",cls="metric-value metric-na";
          if(value!==null&&value!==undefined){
            cls="metric-value";
            shown=format==="decimal"?Number(value).toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}):Number(value).toLocaleString("pl-PL")
          }
          return `<div class="metric-card"><span class="metric-source">${escapeHtml(source)}</span><span class="${cls}">${escapeHtml(shown)}</span><span class="metric-label">${escapeHtml(label)}</span></div>`
        }

        function citationTrendHtml(items){
          if(!items?.length)return `<div class="citation-trend"><span class="related-empty">OpenAlex nie zwrócił historii cytowań rok po roku dla tej publikacji.</span></div>`;
          const recent=items.slice(-10);
          const max=Math.max(...recent.map(item=>item.count),1);
          const bars=recent.map(item=>{
            const height=Math.max(2,Math.round((item.count/max)*100));
            return `<div class="citation-bar-item" title="${escapeHtml(`${item.year}: ${item.count} cytowań`)}">
              <span class="citation-bar-value">${escapeHtml(item.count)}</span>
              <div class="citation-bar-track"><div class="citation-bar-fill" style="height:${height}%"></div></div>
              <span class="citation-bar-year">${escapeHtml(item.year)}</span>
            </div>`
          }).join("");
          return `<div class="citation-trend">
            <div class="citation-trend-head"><strong>Cytowania w czasie · OpenAlex</strong><span>ostatnie ${recent.length} lat dostępnych w rekordzie</span></div>
            <div class="citation-bars">${bars}</div>
          </div>`
        }

        function bibliometricsPanel(record){
          const b=record.bibliometrics||{};
          return `<section class="bibliometrics-section">
            <h3>Cytowania i bibliometria konkretnej publikacji</h3>
            <p class="bibliometrics-intro">Poniższe wskaźniki dotyczą tej konkretnej publikacji. Prosty podgląd danych dostępnych w rekordach OpenAlex i Crossref. Liczby z różnych baz mogą się różnić, ponieważ każda z nich ma inny zakres indeksowania i sposób rejestrowania cytowań.</p>
            <div class="metric-grid">
              ${metricCard("OpenAlex","cytowania",b.openAlexCitations)}
              ${metricCard("Crossref","cytowania",b.crossrefCitations)}
              ${metricCard("OpenAlex","pozycje w bibliografii",b.openAlexReferences)}
              ${metricCard("OpenAlex","FWCI",b.fwci,"decimal")}
            </div>
            ${citationTrendHtml(b.countsByYear)}
            <p class="bibliometrics-note"><strong>Uwaga:</strong> FWCI jest pokazywany tylko wtedy, gdy OpenAlex zwraca tę wartość dla publikacji. Nie interpretujemy liczby Crossref jako „tej samej” miary co OpenAlex — prezentujemy źródła osobno.</p>
          </section>`
        }



        function ministryTopJournalsByDiscipline(code,currentIndex,limit=5){
          const rows=[];
          for(let i=0;i<MINISTRY_DATA.records.length;i++){
            if(i===currentIndex)continue;
            const raw=MINISTRY_DATA.records[i];
            const disciplineCodes=raw?.[3]||[];
            if(!disciplineCodes.includes(code))continue;
            rows.push({
              index:i,
              title:raw?.[0]||raw?.[1]||"Czasopismo bez tytułu",
              title2:raw?.[1]||"",
              points:Number(raw?.[2])||0,
              issns:(raw?.[4]||[]).map(formatIssn)
            })
          }
          rows.sort((a,b)=>{
            if(b.points!==a.points)return b.points-a.points;
            return String(a.title).localeCompare(String(b.title),"pl",{sensitivity:"base"})
          });
          return rows.slice(0,limit)
        }

        function ministryRelatedRow(item){
          const title2=item.title2&&item.title2.toLowerCase()!==item.title.toLowerCase()?` / ${item.title2}`:"";
          const meta=item.issns.length?`ISSN: ${item.issns.join(", ")}`:"Brak ISSN w wykazie";
          return `<div class="ministry-related-item">
            <div>
              <span class="ministry-related-name">${escapeHtml(item.title+title2)}</span>
              <span class="ministry-related-meta">${escapeHtml(meta)}</span>
            </div>
            <span class="ministry-points">${escapeHtml(item.points)} pkt</span>
          </div>`
        }

        function loadMinistryRelated(record,code,name){
          const box=result.querySelector("#ministry-related");
          const list=result.querySelector("#ministry-related-list");
          const title=result.querySelector("#ministry-related-title");
          if(!box||!list||!title||!record.ministry)return;
          result.querySelectorAll("[data-ministry-discipline]").forEach(btn=>{
            btn.classList.toggle("active",btn.dataset.ministryDiscipline===code)
          });
          title.textContent=`Najwyżej punktowane czasopisma · ${name}`;
          const rows=ministryTopJournalsByDiscipline(code,record.ministry.index,5);
          list.innerHTML=rows.length
            ?rows.map(ministryRelatedRow).join("")
            :`<span class="related-empty">Brak innych czasopism przypisanych do tej dyscypliny.</span>`;
          box.hidden=false
        }

        function bindMinistryExplorer(record){
          if(!record.ministry)return;
          const buttons=[...result.querySelectorAll("[data-ministry-discipline]")];
          buttons.forEach(button=>button.addEventListener("click",()=>{
            loadMinistryRelated(
              record,
              button.dataset.ministryDiscipline,
              button.dataset.ministryDisciplineName
            )
          }));
          const firstButton=buttons[0];
          if(firstButton){
            loadMinistryRelated(
              record,
              firstButton.dataset.ministryDiscipline,
              firstButton.dataset.ministryDisciplineName
            )
          }
        }


        function doajBool(value,yes="tak",no="nie"){
          if(value===true)return yes;
          if(value===false)return no;
          return"brak informacji"
        }

        function doajPanel(record){
          const d=record.doaj;
          if(!d||d.error){
            return `<section class="doaj-section"><h3>DOAJ</h3><p class="doaj-intro">Informacje o modelu Open Access i polityce publikacyjnej czasopisma.</p><div class="doaj-empty">Nie udało się połączyć z DOAJ. Pozostałe części wyniku są nadal aktualne.</div></section>`
          }
          if(!d.found){
            return `<section class="doaj-section"><h3>DOAJ</h3><p class="doaj-intro">Informacje o modelu Open Access i polityce publikacyjnej czasopisma.</p><div class="doaj-empty"><strong>Nie znaleziono czasopisma w DOAJ</strong> dla identyfikatorów dostępnych w tym rekordzie. Brak rekordu DOAJ nie oznacza, że pojedynczy artykuł nie może być dostępny Open Access.</div></section>`
          }
          const apc=d.hasApc===true?(d.apcPrices.length?`tak · ${d.apcPrices.join(", ")}`:"tak"):d.hasApc===false?"nie":"brak informacji";
          const waiver=d.waiverFlag===true?"tak":d.waiverFlag===false?"nie":"brak informacji";
          const time=d.publicationTime!==null&&d.publicationTime!==undefined&&d.publicationTime!==""?`${d.publicationTime} tyg.`:"brak informacji";
          const copyright=d.copyright===true?"autor zachowuje prawa":d.copyright===false?"nie / sprawdź politykę":"brak informacji";
          return `<section class="doaj-section">
            <h3>DOAJ · informacje o czasopiśmie</h3>
            <p class="doaj-intro">Dane pobierane na żywo z Directory of Open Access Journals po ISSN/e-ISSN.</p>
            <div class="doaj-grid">
              <div class="doaj-card"><span class="doaj-label">W DOAJ</span><span class="doaj-value doaj-positive">tak ✓${d.seal?" · DOAJ Seal":""}</span></div>
              <div class="doaj-card"><span class="doaj-label">Open Access od</span><span class="doaj-value">${escapeHtml(doajText(d.oaStart))}</span></div>
              <div class="doaj-card"><span class="doaj-label">APC</span><span class="doaj-value">${escapeHtml(apc)}</span></div>
              <div class="doaj-card"><span class="doaj-label">Waiver policy</span><span class="doaj-value">${escapeHtml(waiver)}</span></div>
              <div class="doaj-card"><span class="doaj-label">Licencja</span><span class="doaj-value">${escapeHtml(d.licenses.join(", ")||"brak informacji")}</span></div>
              <div class="doaj-card"><span class="doaj-label">Peer review</span><span class="doaj-value">${escapeHtml(doajText(d.review))}</span></div>
              <div class="doaj-card"><span class="doaj-label">Czas publikacji</span><span class="doaj-value">${escapeHtml(time)}</span></div>
              <div class="doaj-card"><span class="doaj-label">Archiwizacja / preservation</span><span class="doaj-value">${escapeHtml(d.preservation.join(", ")||"brak informacji")}</span></div>
              <div class="doaj-card"><span class="doaj-label">Copyright autora</span><span class="doaj-value">${escapeHtml(copyright)}</span></div>
            </div>
            <div class="doaj-actions">
              <a class="doaj-link" href="${escapeHtml(d.recordUrl)}" target="_blank" rel="noopener noreferrer">Rekord DOAJ ↗</a>
              ${d.waiverUrl?`<a class="doaj-link" href="${escapeHtml(d.waiverUrl)}" target="_blank" rel="noopener noreferrer">Waiver policy ↗</a>`:""}
              ${d.homepage?`<a class="doaj-link" href="${escapeHtml(d.homepage)}" target="_blank" rel="noopener noreferrer">Strona czasopisma ↗</a>`:""}
            </div>
          </section>`
        }

        function openPolicyPanel(record){
          const ids=(record.verifiedIssns?.length?record.verifiedIssns:record.issnCandidates)||[];
          const shown=ids.join(", ")||record.issnL||"brak ISSN";
          return `<section class="policy-section">
            <h3>Open Policy Finder</h3>
            <p class="policy-intro">Następca serwisów Sherpa. W tym POC nie pobieramy jeszcze polityk automatycznie, ponieważ nowe API Jisc wymaga klucza API, którego nie należy umieszczać w publicznym pliku HTML.</p>
            <div class="policy-box">
              <strong>Sprawdź politykę czasopisma w Open Policy Finder</strong>
              <div class="policy-issn">Do wyszukania: ${escapeHtml(record.journal)} · ISSN ${escapeHtml(shown)}</div>
              <div class="policy-actions"><a class="policy-link" href="https://openpolicyfinder.jisc.ac.uk/" target="_blank" rel="noopener noreferrer">Otwórz Open Policy Finder ↗</a></div>
            </div>
          </section>`
        }

        function ministryHistoryPanel(record){
          const current=record.ministry?.points??null;
          const p2019=historicalPointsForRecord(record,2019);
          const p2021=historicalPointsForRecord(record,2021);
          const p2023=historicalPointsForRecord(record,2023);
          const currentHit=current!==null?{points:current,issn:(record.ministry?.officialIssns||record.verifiedIssns||[]).join(", ")||record.issnL||"",conflict:false}:null;
          const rows=[
            {year:2019,hit:p2019,label:"Wykaz 18.12.2019",url:"https://www.gov.pl/web/nauka/komunikat-ministra-nauki-i-szkolnictwa-wyzszego-z-dnia-18-grudnia-2019-r-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych2"},
            {year:2020,hit:p2019,label:"Wykaz 18.12.2019 · ostatni właściwy dla 2020",url:"https://www.gov.pl/web/nauka/komunikat-ministra-nauki-i-szkolnictwa-wyzszego-z-dnia-18-grudnia-2019-r-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych2"},
            {year:2021,hit:p2021,label:"Wykaz 21.12.2021",url:"https://www.gov.pl/web/nauka/komunikat-ministra-edukacji-i-nauki-z-dnia-21-grudnia-2021-r-o-zmianie-i-sprostowaniu-komunikatu-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych"},
            {year:2022,hit:p2021,label:"Wykaz 21.12.2021 · ostatni właściwy dla 2022",url:"https://www.gov.pl/web/nauka/komunikat-ministra-edukacji-i-nauki-z-dnia-21-grudnia-2021-r-o-zmianie-i-sprostowaniu-komunikatu-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych"},
            {year:2023,hit:p2023,label:"Wykaz 03.11.2023 · po zmianie i sprostowaniu",url:"https://www.gov.pl/web/nauka/komunikat-ministra-edukacji-i-nauki-z-dnia-03-listopada-2023-r-o-zmianie-i-sprostowaniu-komunikatu-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych"},
            {year:2024,hit:currentHit,label:"Wykaz 05.01.2024",url:"https://www.gov.pl/web/nauka/komunikat-ministra-nauki-z-dnia-05-stycznia-2024-r-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych"},
            {year:2025,hit:currentHit,label:"Wykaz 05.01.2024 · ostatni wcześniejszy",url:"https://www.gov.pl/web/nauka/komunikat-ministra-nauki-z-dnia-05-stycznia-2024-r-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych"},
            {year:2026,hit:currentHit,label:"Wykaz 05.01.2024 · ostatni wcześniejszy",url:"https://www.gov.pl/web/nauka/komunikat-ministra-nauki-z-dnia-05-stycznia-2024-r-w-sprawie-wykazu-czasopism-naukowych-i-recenzowanych-materialow-z-konferencji-miedzynarodowych"}
          ];

          const html=rows.map(row=>{
            const conflict=Boolean(row.hit?.conflict);
            const points=conflict?null:(row.hit?.points??null);
            const id=row.hit?.issn||"";
            const conflictDetail=conflict
              ?`<span class="history-detail">${row.hit.hits.map(hit=>`${escapeHtml(hit.issn)} → ${escapeHtml(hit.points)} pkt`).join(" · ")}</span>`
              :"";
            return `<tr class="${row.year>=2024?"history-current":""}">
              <td>${row.year}</td>
              <td>
                ${conflict
                  ?`<span class="history-missing">niejednoznaczne dane</span>${conflictDetail}`
                  :points!==null
                    ?`<span class="history-points">${escapeHtml(points)} pkt</span>${id?`<span class="history-detail">ISSN: ${escapeHtml(id)}</span>`:""}`
                    :`<span class="history-missing">brak dopasowania</span>`}
              </td>
              <td><a class="history-source-link" href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.label)} ↗</a></td>
            </tr>`
          }).join("");

          const trend=rows.map((row,index)=>{
            const conflict=Boolean(row.hit?.conflict);
            const points=conflict?null:(row.hit?.points??null);
            const prevHit=index?rows[index-1].hit:null;
            const prev=prevHit?.conflict?null:(prevHit?.points??null);
            let arrow="";
            if(points!==null&&prev!==null&&points!==prev)arrow=points>prev?" ↑":" ↓";
            return `<div class="history-trend-item"><span>${row.year}</span><strong>${points!==null?`${escapeHtml(points)}${arrow}`:"—"}</strong></div>`
          }).join("");

          const meta=`2019: ${MINISTRY_HISTORY_META["2019"].issns.toLocaleString("pl-PL")} ISSN · 2021: ${MINISTRY_HISTORY_META["2021"].issns.toLocaleString("pl-PL")} ISSN · 2023: ${MINISTRY_HISTORY_META["2023"].issns.toLocaleString("pl-PL")} ISSN`;
          return `<section class="history-section">
            <h3>Historia punktacji czasopisma · MNiSW 2019–2026</h3>
            <p class="history-intro"><strong>Historia dotyczy czasopisma, nie pojedynczego artykułu.</strong> Punktacja jest wbudowana na podstawie oficjalnych wykazów 2019, 2021 i 2023. Dopasowanie odbywa się po ISSN/e-ISSN. Aktualne dyscypliny i ranking Top 5 pozostają wyłącznie z wykazu 05.01.2024.</p>
            <div class="history-trend">${trend}</div>
            <table class="history-table"><thead><tr><th>Rok publikacji</th><th>Punkty</th><th>Właściwy wykaz</th></tr></thead><tbody>${html}</tbody></table>
            <div class="history-note"><strong>Źródła wbudowane w POC:</strong> ${escapeHtml(meta)}. Jeśli różne ISSN tego samego bieżącego rekordu prowadzą w dawnym wykazie do różnych wartości punktowych, aplikacja pokazuje „niejednoznaczne dane” wraz z wartościami źródłowymi — nie wybiera jednej arbitralnie.</div>
          </section>`
        }


        function ministryPanel(record){
          const m=record.ministry;
          if(!m){
            const issnText=record.issnCandidates?.length?` Sprawdzone identyfikatory czasopisma: ${record.issnCandidates.join(", ")}.`:" Nie udało się uzyskać identyfikatorów ISSN czasopisma.";
            return `<section class="ministry-section">
              <h3>MNiSW 2024 · punktacja i dyscypliny czasopisma</h3>
              <p class="ministry-intro"><strong>Ta sekcja dotyczy czasopisma jako całości, nie konkretnego artykułu.</strong> Dyscypliny MNiSW nie są automatyczną klasyfikacją tematyczną publikacji.</p>
              <div class="ministry-empty"><strong>Brak dopasowania czasopisma w aktualnym wykazie.</strong>${escapeHtml(issnText)} Sprawdzono również dokładne dopasowanie tytułu.</div>
            </section>`
          }
          const titles=[m.title1,m.title2].filter(Boolean).filter((v,i,a)=>a.findIndex(x=>x.toLowerCase()===v.toLowerCase())===i);
          const disciplineChips=m.disciplines.length?m.disciplines.map(d=>`<button class="discipline-chip" type="button" title="Pokaż inne najwyżej punktowane czasopisma w tej dyscyplinie" data-ministry-discipline="${escapeHtml(d.code)}" data-ministry-discipline-name="${escapeHtml(d.name)}">${escapeHtml(d.name)}</button>`).join(""):`<span class="related-empty">Brak przypisanych dyscyplin.</span>`;
          const matchText=m.matchedBy==="title"
            ?"Nie znaleziono jednoznacznego wspólnego ISSN; zastosowano dokładne dopasowanie tytułu czasopisma."
            :`Dopasowano czasopismo na podstawie identyfikatorów ISSN${m.matchedIssns.length?`: ${m.matchedIssns.join(", ")}`:""}${m.matchedBy==="issn+title"?" i potwierdzono tytułem":""}.`;
          return `<section class="ministry-section">
            <h3>MNiSW 2024 · punktacja i dyscypliny czasopisma</h3>
            <p class="ministry-intro"><strong>Dane dotyczą czasopisma.</strong> Przypisanie do dyscyplin nie oznacza, że każdy artykuł w czasopiśmie należy do tych dyscyplin.</p>
            <div class="ministry-grid">
              <div class="points-card"><span class="points-value">${escapeHtml(m.points??"—")}</span><span class="points-label">punktów</span></div>
              <div class="ministry-details">
                <div class="ministry-detail"><span class="ministry-detail-label">Tytuł czasopisma w wykazie</span><span class="ministry-detail-value">${escapeHtml(titles.join(" / ")||record.journal)}</span></div>
                <div class="ministry-detail"><span class="ministry-detail-label">ISSN czasopisma w wykazie</span><span class="ministry-detail-value">${escapeHtml(m.officialIssns.join(", ")||"brak")}</span></div>
                <div class="ministry-detail"><span class="ministry-detail-label">Tytuł z Crossref / OpenAlex</span><span class="ministry-detail-value">${escapeHtml(record.journal)}</span></div>
                <div class="ministry-detail"><span class="ministry-detail-label">Zweryfikowany ISSN / e-ISSN czasopisma</span><span class="ministry-detail-value">${escapeHtml(record.verifiedIssnText||journalIssns(record).join(", ")||"brak")}</span></div>
                <div class="ministry-detail"><span class="ministry-detail-label">ISSN-L czasopisma</span><span class="ministry-detail-value">${escapeHtml(record.issnLText||record.issnL||"brak informacji")}</span></div>
              </div>
            </div>
            <div class="discipline-wrap"><span class="discipline-title">Dyscypliny czasopisma w wykazie MNiSW 2024</span><div class="discipline-chips">${disciplineChips}</div></div>
            <div class="ministry-related" id="ministry-related" hidden>
              <div class="ministry-related-head">
                <h4 id="ministry-related-title">Inne czasopisma z tej samej dyscypliny</h4>
                <p>5 innych czasopism z wybranej dyscypliny czasopisma, posortowanych według punktacji w tym samym wykazie.</p>
              </div>
              <div class="ministry-related-list" id="ministry-related-list"></div>
            </div>
            <div class="ministry-match">${escapeHtml(matchText)} Źródło: ${escapeHtml(MINISTRY_DATA.sourceFile)}.</div>
          </section>`
        }

        function topicChip(topic,isPrimary=false){
          if(!topic?.id)return"";
          const countText=topic.count!==null?` <span class="topic-count">(${Number(topic.count).toLocaleString("pl-PL")})</span>`:"";
          return `<button class="topic-chip${isPrimary?" primary":""}" type="button" data-topic-id="${escapeHtml(topic.id)}" data-topic-name="${escapeHtml(topic.displayName)}" data-topic-path="${escapeHtml(topicPath(topic))}">${escapeHtml(topic.displayName)}${countText}</button>`
        }

        function topicExplorerPanel(title,intro,topics,primaryId=null){
          const list=uniqueTopics(topics||[]).slice(0,8);
          const chips=list.length?list.map(t=>topicChip(t,t.id===primaryId)).join(""):`<span class="related-empty">Brak topiców w OpenAlex.</span>`;
          const initial=list.find(t=>t.id===primaryId)||list[0]||null;
          const path=initial?topicPath(initial):"";
          return `<section class="topics-section" data-topic-explorer>
            <h3>${escapeHtml(title)}</h3>
            <p class="topic-intro">${escapeHtml(intro)}</p>
            <div class="topic-box">
              <div class="topic-path" data-topic-path-display>${escapeHtml(path)}</div>
              <div class="topic-chips">${chips}</div>
            </div>
            <div class="related-journals" data-related-journals>
              <div class="related-head"><div><h4>Inne czasopisma dla wybranego topicu</h4><p>Kliknij topic powyżej, aby uruchomić wyszukiwanie w OpenAlex.</p></div></div>
              <div class="related-list" data-related-list><span class="related-empty">Nie wysyłamy dodatkowego zapytania, dopóki nie wybierzesz topicu.</span></div>
            </div>
          </section>`
        }

        function publicationTopicsPanel(record){
          if(!record.hasOpenAlex)return"";
          const topics=record.articleTopics?.length?record.articleTopics:[record.primaryTopic].filter(Boolean);
          return topicExplorerPanel(
            "Tematy konkretnej publikacji wg OpenAlex",
            "To klasyfikacja tej konkretnej pracy w OpenAlex. Nie jest to klasyfikacja całego czasopisma. Kliknij topic, aby zobaczyć przykładowe inne czasopisma związane z tym tematem.",
            topics,
            record.primaryTopic?.id||null
          )
        }

        function journalTopicsPanel(source){
          if(!source)return `<section class="topics-section"><h3>Tematy czasopisma wg OpenAlex</h3><p class="topic-intro">Brak jednoznacznego profilu czasopisma w OpenAlex.</p></section>`;
          if(!(source?.topics||[]).length)return `<section class="topics-section"><h3>Tematy czasopisma wg OpenAlex</h3><p class="topic-intro">Rekord OpenAlex Source nie zwrócił listy <code>topics</code>. Nie zastępujemy jej polem <code>topic_share</code>, ponieważ ma ono inne znaczenie.</p></section>`;
          return topicExplorerPanel(
            "Tematy czasopisma wg OpenAlex",
            "To zagregowana charakterystyka całego czasopisma na podstawie prac przypisanych do niego w OpenAlex. Nie oznacza, że każdy artykuł należy do każdego z tych tematów. Kliknij topic, aby zobaczyć inne czasopisma związane z tym tematem.",
            source.topics,
            null
          )
        }

        function relatedJournalRow(source){
          const id=shortOpenAlexId(source?.id),href=safeUrl(source?.id),meta=[source?.issn_l?`ISSN-L ${source.issn_l}`:"",Number.isFinite(source?.works_count)?`${Number(source.works_count).toLocaleString("pl-PL")} prac`:"",source?.is_oa===true?"Fully OA wg OpenAlex":""].filter(Boolean).join(" · ");
          return `<div class="related-item"><div><span class="related-name">${escapeHtml(source?.display_name||id||"Czasopismo")}</span><span class="related-meta">${escapeHtml(meta||"OpenAlex Source")}</span></div>${href?`<a class="related-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">OpenAlex ↗</a>`:""}</div>`
        }

        async function fetchRelatedSources(topicId){
          const shortId=String(topicId||"").split("/").pop();
          if(!shortId)return[];
          if(relatedSourcesCache.has(shortId))return relatedSourcesCache.get(shortId);
          const endpoint=`https://api.openalex.org/sources?filter=type:journal,topics.id:${encodeURIComponent(shortId)}&sort=works_count:desc&per_page=12`;
          const payload=await fetchJson(endpoint,"OpenAlex Sources");
          const rows=payload?.results||[];
          relatedSourcesCache.set(shortId,rows);
          return rows
        }

        async function loadRelatedJournalsIn(explorer,topicId,topicName,currentSourceId){
          const list=explorer.querySelector("[data-related-list]");
          const box=explorer.querySelector("[data-related-journals]");
          if(!list||!box)return;
          explorer.querySelectorAll(".topic-chip").forEach(btn=>btn.classList.toggle("active",btn.dataset.topicId===topicId));
          const head=box.querySelector(".related-head");
          if(head)head.innerHTML=`<div><h4>Inne czasopisma: ${escapeHtml(topicName)}</h4><p>Przykładowe czasopisma w OpenAlex powiązane z tym topicem, posortowane według liczby prac. Bieżące czasopismo jest pomijane.</p></div>`;
          list.innerHTML=`<span class="related-empty"><span class="mini-spinner"></span>Pobieram czasopisma…</span>`;
          try{
            const rows=await fetchRelatedSources(topicId);
            const filtered=rows.filter(source=>shortOpenAlexId(source?.id)!==currentSourceId).slice(0,6);
            list.innerHTML=filtered.length?filtered.map(relatedJournalRow).join(""):`<span class="related-empty">Nie znalazłem innych czasopism dla tego topicu.</span>`
          }catch(error){
            list.innerHTML=`<span class="related-empty">Nie udało się pobrać przykładowych czasopism z OpenAlex.</span>`
          }
        }

        function bindTopicExplorers(target,currentSourceId){
          target.querySelectorAll("[data-topic-explorer]").forEach(explorer=>{
            const pathDisplay=explorer.querySelector("[data-topic-path-display]");
            explorer.querySelectorAll(".topic-chip").forEach(button=>button.addEventListener("click",()=>{
              if(pathDisplay)pathDisplay.textContent=button.dataset.topicPath||"";
              loadRelatedJournalsIn(explorer,button.dataset.topicId,button.dataset.topicName,currentSourceId)
            }))
          })
        }


        function scopeBanner(kind,title,note){
          return `<div class="scope-banner${kind==="journal"?" journal":""}"><span class="scope-kicker">${kind==="journal"?"CZASOPISMO":"PUBLIKACJA"}</span><span class="scope-title">${escapeHtml(title)}</span><span class="scope-note">${escapeHtml(note)}</span></div>`
        }

        function renderRecord(record){
          window.__publicationExplorerCurrentRecord=record;
          const accessItems=publicationAccessItems(record);
          const badges=`<span class="badge ${record.openAccess?"oa":"closed"}">● Publikacja · ${escapeHtml(record.oaStatusLabel)}</span>${record.hasCrossref?`<span class="badge crossref">Crossref ✓</span>`:""}<span class="badge type">${escapeHtml(formatType(record.type))}</span>`;
          const locationsHtml=accessItems.length?accessItems.map(locationRow).join(""):`<div class="location"><div><span class="location-title">Brak bezpośredniego dostępu pełnotekstowego w pobranych danych</span><span class="location-meta">Możesz nadal użyć strony DOI w sekcji rekordów źródłowych.</span></div></div>`;

          result.innerHTML=`<header class="result-head"><div class="badges">${badges}</div><h2 class="result-title">${escapeHtml(record.title)}</h2><p class="authors">${escapeHtml(record.authors.join(", ")||"Brak informacji o autorach")}</p></header>

          ${scopeBanner("publication","Dane o konkretnej publikacji","OA, cytowania, licencja, pełny tekst i topiki w tej części odnoszą się do wyszukanego artykułu / pracy.")}
          <section class="facts" aria-label="Metadane publikacji">
            ${fact("Rok publikacji",record.year)}
            ${fact("DOI publikacji",record.doi)}
            ${fact("Status OA publikacji",record.oaStatusLabel)}
            ${fact("Typ publikacji · Crossref",formatType(record.type))}
            ${fact("Tom / numer",record.volumeIssue)}
            ${fact("Strony / nr artykułu",record.pages)}
            ${fact("Licencja publikacji",record.license)}
            ${fact("Lokalizacja OA publikacji",record.oaPlace)}
            ${fact("OpenAlex ID publikacji",record.openAlexId)}
          </section>
          <section class="source-status" aria-label="Źródła danych o publikacji">
            <div class="status-box"><strong>OpenAlex ${record.hasOpenAlex?"✓":"—"}</strong><span>${record.hasOpenAlex?"OA publikacji, cytowania, topiki publikacji i otwarte lokalizacje":"nie znaleziono rekordu publikacji lub źródło było niedostępne"}</span></div>
            <div class="status-box"><strong>Crossref ${record.hasCrossref?"✓":"—"}</strong><span>${record.hasCrossref?"metadane bibliograficzne publikacji i linki zdeponowane przez wydawcę":"nie znaleziono rekordu Crossref"}</span></div>
          </section>
          ${bibliometricsPanel(record)}
          <section class="location-section"><h3>Dostęp do publikacji</h3><p class="section-note">Wszystkie użyteczne linki do treści są w jednym miejscu. Lokalizacje OA pochodzą z OpenAlex. Z Crossref pokazujemy wyłącznie publiczne linki użytkowe; techniczne adresy przeznaczone do <em>similarity-checking</em> lub <em>text-mining</em> są pomijane.</p><div class="locations">${locationsHtml}</div></section>
          ${sourceRecordsPanel(record)}
          ${publicationTopicsPanel(record)}
          <footer class="actions-wrap">${metadataPanel(record)}</footer>

          ${scopeBanner("journal","Czasopismo, w którym ukazała się publikacja","Od tego miejsca informacje odnoszą się do całego czasopisma. Nie należy ich automatycznie przypisywać do konkretnego artykułu.")}
          <section class="facts" aria-label="Dane czasopisma">
            ${fact("Czasopismo",record.journal)}
            ${fact("Wydawca czasopisma",record.publisher)}
            ${fact("ISSN / e-ISSN czasopisma",record.verifiedIssnText)}
            ${fact("ISSN-L czasopisma",record.issnLText)}
            ${fact("Dodatkowe identyfikatory z OpenAlex",record.openAlexIssnText)}
            ${fact("ISSN zwrócone przez Crossref",record.crossrefIssnText)}
            ${fact("ISSN w wykazie MNiSW 2024",record.ministryIssnText)}
            ${fact("Źródło wartości głównej ISSN",record.issnSourceText)}
          </section>
          ${record.extraOpenAlexIssns?.length?`<div class="issn-extra-note"><strong>Jak czytać dodatkowe ISSN z OpenAlex?</strong> OpenAlex może zwrócić więcej identyfikatorów powiązanych ze swoim rekordem Source. Pokazujemy je dla transparentności, ale nie uznajemy automatycznie za równorzędne ISSN badanego czasopisma. Główne ISSN ustalamy konserwatywnie z Crossref i/lub wykazu MNiSW, a ISSN-L pokazujemy osobno.</div>`:""}
          <section class="source-status" aria-label="Źródła danych o czasopiśmie">
            <div class="status-box"><strong>OpenAlex Source ${record.openAlexSource?"✓":"—"}</strong><span>${record.openAlexSource?"profil i metryki całego czasopisma":"brak jednoznacznego profilu czasopisma"}</span></div>
            <div class="status-box"><strong>Wykaz MNiSW 2024 ${record.ministry?"✓":"—"}</strong><span>${record.ministry?`${record.ministry.points} pkt · ${record.ministry.disciplines.length} dyscyplin czasopisma`:"brak dopasowania czasopisma w aktualnym wykazie"}</span></div>
            <div class="status-box"><strong>DOAJ ${record.doaj?.found?"✓":record.doaj?.error?"!":"—"}</strong><span>${record.doaj?.found?"czasopismo odnalezione w DOAJ":record.doaj?.error?"DOAJ chwilowo niedostępny":"brak rekordu czasopisma w DOAJ"}</span></div>
          </section>
          ${ministryPanel(record)}
          ${ministryHistoryPanel(record)}
          ${doajPanel(record)}
          ${sourceMetricsPanel(record.openAlexSource)}
          ${journalTopicsPanel(record.openAlexSource)}
          ${issnRegistryPanel(record)}
          ${transparencySignalsPanel(record)}
          ${externalChecksPanel(record)}`;

          result.classList.add("visible");
          result.querySelectorAll("[data-external-link]").forEach(link=>link.addEventListener("click",()=>showMessage("Otwieram wskazaną stronę w nowej karcie. Jeśli pojawi się PDF, możesz zapisać go z poziomu przeglądarki.")));
          bindMetadataExport(record);
          bindTopicExplorers(result,record.sourceOpenAlexId);
          bindMinistryExplorer(record);
          enrichIssnRegistry(record,result);
          result.scrollIntoView({behavior:"smooth",block:"start"})
        }

        function showMessage(text,isError=false){message.textContent=text;message.className=`message visible${isError?" error":""}`}
        function clearOutput(){message.className="message";message.textContent="";result.className="result-card";result.innerHTML=""}
        async function search(doiValue){
          const doi=normalizeDoi(doiValue);clearOutput();if(!isDoi(doi)){showMessage("Nie rozpoznaję poprawnego DOI. Powinien zaczynać się od „10.” i zawierać ukośnik, np. 10.1002/14651858.CD010438.",true);input.focus();return}
          input.value=doi;loading.classList.add("visible");searchButton.disabled=true;searchButton.textContent="Szukam…";
          try{const[openAlexResult,crossrefResult]=await Promise.allSettled([fetchOpenAlex(doi),fetchCrossref(doi)]),openAlex=openAlexResult.status==="fulfilled"?openAlexResult.value:null,crossref=crossrefResult.status==="fulfilled"?crossrefResult.value:null;if(!openAlex&&!crossref){const errors=[openAlexResult,crossrefResult].filter(item=>item.status==="rejected").map(item=>item.reason?.message).filter(Boolean),suffix=errors.length?` (${errors.join("; ")})`:"";throw new Error(`Nie znaleziono publikacji w OpenAlex ani Crossref${suffix}`)}let openAlexSource=null;if(openAlex?.primary_location?.source?.id){try{openAlexSource=await fetchOpenAlexSource(openAlex.primary_location.source.id)}catch(_){}}
          const record=buildRecord(doi,openAlex,crossref,openAlexSource);
          try{record.doaj=await fetchDoajByIssns(record.verifiedIssns?.length?record.verifiedIssns:record.issnCandidates)}catch(_){record.doaj={found:false,error:true}}
          renderRecord(record);const missing=[];if(!openAlex)missing.push("OpenAlex");if(!crossref)missing.push("Crossref");if(missing.length)showMessage(`Wynik jest częściowy: nie udało się pobrać rekordu z ${missing.join(" i ")}. Pokazuję dane z drugiego źródła.`);if(window.location.protocol==="http:"||window.location.protocol==="https:"){const url=new URL(window.location.href);url.searchParams.set("doi",doi);history.replaceState(null,"",url)}}catch(error){showMessage(error?.message||"Nie udało się pobrać danych. Spróbuj ponownie za chwilę.",true)}finally{loading.classList.remove("visible");searchButton.disabled=false;searchButton.textContent="Szukaj publikacji"}
        }
        form.addEventListener("submit",event=>{event.preventDefault();search(input.value)});exampleButton.addEventListener("click",()=>{input.value=EXAMPLE_DOI;input.focus()});const initialDoi=new URLSearchParams(window.location.search).get("doi");if(initialDoi){input.value=initialDoi;search(initialDoi)}
      })();
