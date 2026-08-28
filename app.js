(function(root){
  "use strict";

  /* ================================================================
     CORE — pure logic, no DOM. Exposed as TrackerCore so the
     acceptance tests can run it under node.
     ================================================================ */
  var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var MON_FULL=["January","February","March","April","May","June","July","August",
                "September","October","November","December"];
  var DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var SLOTS=["","13:00–14:30","17:30–19:00","15:00–16:30 (Prizren)","9:00–10:30 (Ferizaj)"];

  function pad2(n){return (n<10?"0":"")+n;}
  function n2(x){return (Math.round(x*100)/100).toFixed(2);}
  /* trim trailing zeros for friendly inline numbers: 8.50 → 8.5, 9.00 → 9 */
  function nice(x){return n2(x).replace(/\.?0+$/,"");}
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];});}

  /* dates are dd.mm.yyyy strings */
  function parseDMY(s){
    var m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(s||"").trim());
    if(!m)return null;
    var d=new Date(+m[3],+m[2]-1,+m[1]);
    if(d.getDate()!==+m[1]||d.getMonth()!==+m[2]-1)return null;
    return d;
  }
  function dayLabel(ex){var d=parseDMY(ex&&ex.date);return d?d.getDate()+" "+MON[d.getMonth()]:"–";}
  function fullDate(ex){
    var d=parseDMY(ex&&ex.date);
    return d?DOW[d.getDay()]+" "+d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear():"date not set";
  }

  function poolIndex(pool){var o={};(pool||[]).forEach(function(e){o[e.id]=e;});return o;}

  /* a session ends at its latest exam date, else the last day of its month */
  function sessionEnd(sn,byId){
    var latest=null;
    (sn.entries||[]).forEach(function(en){
      var ex=byId[en.examId],d=ex&&parseDMY(ex.date);
      if(d&&(!latest||d>latest))latest=d;
    });
    if(latest)return new Date(latest.getFullYear(),latest.getMonth(),latest.getDate(),23,59,59);
    return new Date(sn.year,sn.month,0,23,59,59);   /* month is 1-based */
  }
  function sortSessions(list){
    return (list||[]).slice().sort(function(a,b){
      return (a.year-b.year)||(a.month-b.month);});
  }
  /* the session to open on load: earliest one still ahead, else the last */
  function autoSelect(sessions,pool,now){
    var byId=poolIndex(pool),sorted=sortSessions(sessions);
    for(var i=0;i<sorted.length;i++)
      if(sessionEnd(sorted[i],byId)>=now)return sorted[i].id;
    return sorted.length?sorted[sorted.length-1].id:null;
  }

  function isPassed(res){return !!(res&&res.grade!=null&&res.grade>=6);}
  function isFailed(res){return !!(res&&res.grade!=null&&res.grade<6);}
  /* pool exams not yet passed — these are what session pickers offer */
  function unfinished(pool,results){
    return (pool||[]).filter(function(e){return !isPassed(results[e.id]);});
  }

  /* running average: base + every PASSING grade. A failed exam never enters
     the transcript average at UBT, so a 5 doesn't drag the number down —
     it just keeps the course in the pool. */
  function running(profile,results){
    var sum=profile.baseCount*profile.baseAvg,n=profile.baseCount,logged=0;
    Object.keys(results||{}).forEach(function(k){
      var r=results[k];
      if(r&&r.grade!=null){logged++;if(r.grade>=6){sum+=r.grade;n++;}}
    });
    return {sum:sum,count:n,avg:n?sum/n:0,logged:logged};
  }

  /* targets table: full precision internally, round only for display,
     dedupe rows on the displayed string (fixes the 9.375→9.38→10.01 bug) */
  function targetRows(p){
    var bs=p.baseCount*p.baseAvg,T=p.totalCourses,rem=T-p.baseCount;
    var ceil=rem>0?(bs+10*rem)/T:p.baseAvg;
    var cands=[p.baseAvg-0.75,p.targetMin,p.baseAvg,p.targetMax,ceil];
    var rows=[],seen={};
    cands.sort(function(a,b){return a-b;}).forEach(function(t){
      var disp=n2(t);if(seen[disp])return;seen[disp]=1;
      var need=rem>0?(T*t-bs)/rem:null;
      var isCeil=Math.abs(t-ceil)<1e-9,isHold=Math.abs(t-p.baseAvg)<1e-9,
          isTgt=Math.abs(t-p.targetMin)<1e-9||Math.abs(t-p.targetMax)<1e-9;
      var over=need!=null&&need>10+1e-9;
      rows.push({
        target:disp,
        needDisp:need==null?"—":n2(Math.min(need,10)),
        over:over,hl:isTgt,
        note:isCeil?"ceiling — perfect run":isHold?"hold current pace"
            :over?"not reachable":isTgt?"your target":""
      });
    });
    return {rows:rows,ceil:ceil,rem:rem,bs:bs};
  }

  /* ready-reckoner: every pending exam of the open session at grade g */
  function reckonerRows(run,pending,baseAvg){
    return [6,7,8,9,10].map(function(g){
      var nv=pending?(run.sum+g*pending)/(run.count+pending):run.avg;
      return {g:g,avg:nv,delta:nv-baseAvg};
    });
  }

  /* months a session's dated exams span, for the calendar */
  function monthsSpanned(sn,byId){
    var map={},keys=[];
    (sn.entries||[]).forEach(function(en){
      var ex=byId[en.examId],d=ex&&parseDMY(ex.date);
      if(!d)return;
      var k=d.getFullYear()*100+(d.getMonth()+1);
      if(!map[k]){map[k]={y:d.getFullYear(),m:d.getMonth()+1,byDay:{}};keys.push(k);}
      map[k].byDay[d.getDate()]=ex;
    });
    return keys.sort(function(a,b){return a-b;}).map(function(k){return map[k];});
  }

  /* ---------- seed & shape ---------- */
  function seedData(){
    return {
      profile:{name:"Giorno",baseCount:12,baseAvg:8.75,targetMin:8.5,targetMax:9.0,totalCourses:24},
      pool:[
        {id:"os",       name:"Sistemet Operative",                    sem:2,date:"10.09.2026"},
        {id:"diskrete2",name:"Struktura Diskrete 2",                  sem:4,date:"11.09.2026"},
        {id:"bigdata",  name:"Big Data",                              sem:4,date:"15.09.2026"},
        {id:"algoritme",name:"Algoritme dhe Struktura e të Dhënave",  sem:4,date:"18.09.2026"},
        {id:"shkenca2", name:"Shkenca Kompjuterike 2",                sem:3,date:"21.09.2026"},
        {id:"sinjalet", name:"Sistemet dhe Sinjalet",                 sem:4,date:"22.09.2026"},
        {id:"web",      name:"Dizajni dhe Zhvillimi i Webit",         sem:3,date:"23.09.2026"},
        {id:"mat2",     name:"Matematikë 2",                          sem:2,date:"24.09.2026"},
        {id:"hyrjealg", name:"Hyrje në Algoritme",                    sem:3,date:"25.09.2026"},
        {id:"db",       name:"Sistemet e Bazës së të Dhënave",        sem:3,date:"28.09.2026"},
        {id:"diskrete1",name:"Struktura Diskrete 1",                  sem:3,date:"30.09.2026"},
        {id:"mat1",     name:"Matematikë 1",                          sem:1,date:"01.10.2026"}
      ],
      sessions:[
        {id:"s-2026-9",label:"September 2026",year:2026,month:9,entries:
          ["diskrete2","bigdata","algoritme","shkenca2","hyrjealg","db"].map(function(id){
            return {examId:id,slot:"13:00–14:30"};})},
        {id:"s-2027-1",label:"January 2027",year:2027,month:1,entries:[]},
        {id:"s-2027-4",label:"April 2027",year:2027,month:4,entries:[]}
      ],
      results:{},prep:{}
    };
  }

  function normalise(d){
    if(!d||typeof d!=="object")return seedData();
    d.profile=d.profile||{};
    var p=d.profile,s=seedData().profile;
    ["name"].forEach(function(k){if(typeof p[k]!=="string")p[k]=p[k]!=null?String(p[k]):s[k];});
    ["baseCount","baseAvg","targetMin","targetMax","totalCourses"].forEach(function(k){
      p[k]=isFinite(+p[k])?+p[k]:s[k];});
    if(p.targetMax<p.targetMin){var t=p.targetMin;p.targetMin=p.targetMax;p.targetMax=t;}
    if(p.totalCourses<p.baseCount)p.totalCourses=p.baseCount;
    d.pool=(d.pool||[]).filter(function(e){return e&&e.id&&e.name;});
    d.pool.forEach(function(e){e.sem=e.sem!=null&&e.sem!==""?+e.sem||"":"";e.date=e.date||"";});
    var byId=poolIndex(d.pool);
    d.sessions=(d.sessions||[]).filter(function(sn){return sn&&sn.id;});
    if(!d.sessions.length)d.sessions=seedData().sessions.map(function(sn){
      return {id:sn.id,label:sn.label,year:sn.year,month:sn.month,entries:[]};});
    d.sessions.forEach(function(sn){
      sn.year=+sn.year||new Date().getFullYear();
      sn.month=Math.min(12,Math.max(1,+sn.month||1));
      sn.label=sn.label||MON_FULL[sn.month-1]+" "+sn.year;
      var seenE={};
      sn.entries=(sn.entries||[]).filter(function(en){
        if(!en||!byId[en.examId]||seenE[en.examId])return false;
        seenE[en.examId]=true;en.slot=en.slot||"";return true;});
    });
    d.results=d.results||{};d.prep=d.prep||{};
    Object.keys(d.results).forEach(function(k){
      var r=d.results[k];
      if(!byId[k]||!r||(r.grade==null&&!r.sat)){delete d.results[k];return;}
      if(r.grade!=null)r.grade=+r.grade;
    });
    Object.keys(d.prep).forEach(function(k){if(!byId[k])delete d.prep[k];});
    return d;
  }

  /* import: new export {data}, raw new shape, or the old v2 {profile,state} */
  function importAny(parsed){
    if(!parsed||typeof parsed!=="object")return null;
    if(parsed.data&&parsed.data.pool)return normalise(parsed.data);
    if(parsed.pool&&parsed.sessions)return normalise(parsed);
    if(parsed.profile&&(parsed.profile.sessions||parsed.state))return convertOld(parsed);
    return null;
  }
  var OLD_PERIODS={jan:{label:"January",month:1},apr:{label:"April",month:4},
    jun:{label:"June–July",month:6},sep:{label:"September",month:9},nov:{label:"November",month:11}};
  function convertOld(old){
    var op=old.profile||{},os=old.state||{};
    var d={profile:{
        name:op.name||"",baseCount:+op.baseCount||0,baseAvg:+op.baseAvg||8,
        targetMin:+op.targetMin||8,targetMax:+op.targetMax||8.5,
        totalCourses:+op.totalCourses||(+op.baseCount||0)},
      pool:[],sessions:[],results:{},prep:{}};
    var seen={};
    (op.sessions||[]).forEach(function(sn){
      var per=OLD_PERIODS[sn.period]||OLD_PERIODS.sep;
      var ns={id:sn.key||("s-"+sn.year+"-"+per.month),label:per.label+" "+sn.year,
              year:+sn.year,month:per.month,entries:[]};
      (sn.exams||[]).forEach(function(e){
        if(!seen[e.id]){
          seen[e.id]=true;
          d.pool.push({id:e.id,name:e.name,sem:"",
            date:(e.day&&e.mon!=null)?pad2(e.day)+"."+pad2(e.mon+1)+"."+sn.year:""});
        }
        ns.entries.push({examId:e.id,slot:e.date||""});
        var g=os.grades&&os.grades[e.id],sat=!!(os.done&&os.done[e.id]);
        if((g!==""&&g!=null)||sat)
          d.results[e.id]={grade:(g!==""&&g!=null)?+g:null,sessionId:ns.id,sat:sat};
        if(os.prep&&os.prep[e.id])d.prep[e.id]=os.prep[e.id];
      });
      d.sessions.push(ns);
    });
    return normalise(d);
  }

  var CORE={MON:MON,MON_FULL:MON_FULL,DOW:DOW,SLOTS:SLOTS,
    n2:n2,esc:esc,pad2:pad2,parseDMY:parseDMY,dayLabel:dayLabel,fullDate:fullDate,
    poolIndex:poolIndex,sessionEnd:sessionEnd,sortSessions:sortSessions,autoSelect:autoSelect,
    isPassed:isPassed,isFailed:isFailed,unfinished:unfinished,running:running,
    targetRows:targetRows,reckonerRows:reckonerRows,monthsSpanned:monthsSpanned,
    seedData:seedData,normalise:normalise,importAny:importAny};
  root.TrackerCore=CORE;

  /* ================================================================
     APP — everything below needs a DOM.
     ================================================================ */
  if(typeof document==="undefined")return;

  var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var CHECK_BTN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  /* ?today=YYYY-MM-DD lets you fake the clock to test auto-selection */
  var NOW=new Date();
  try{
    var qp=new URLSearchParams(location.search).get("today");
    if(qp){var qd=new Date(qp);if(!isNaN(qd))NOW=qd;}
  }catch(e){}

  var K="ubt-tracker-v3";
  var mem={};
  var store={
    get:function(k){
      if(window.storage&&typeof window.storage.get==="function"){
        return window.storage.get(k,false).then(function(r){return r?r.value:null;})
          .catch(function(){return null;});
      }
      try{return Promise.resolve(window.localStorage.getItem(k));}
      catch(e){return Promise.resolve(mem[k]||null);}
    },
    set:function(k,v){
      if(window.storage&&typeof window.storage.set==="function"){
        return window.storage.set(k,v,false).catch(function(){});
      }
      try{window.localStorage.setItem(k,v);}catch(e){mem[k]=v;}
      return Promise.resolve();
    },
    mode:function(){
      if(window.storage&&typeof window.storage.get==="function")return "claude";
      try{window.localStorage.setItem("__t","1");window.localStorage.removeItem("__t");return "local";}
      catch(e){return "memory";}
    }
  };

  var DATA=seedData();
  var UI={session:null,year:null};   /* view state only — never persisted */

  function save(){store.set(K,JSON.stringify(DATA));}
  function byId(){return poolIndex(DATA.pool);}
  function cur(){
    for(var i=0;i<DATA.sessions.length;i++)
      if(DATA.sessions[i].id===UI.session)return DATA.sessions[i];
    return sortSessions(DATA.sessions)[0]||{id:null,label:"",year:0,month:1,entries:[]};
  }
  function upcomingId(){return autoSelect(DATA.sessions,DATA.pool,NOW);}
  function sessionExams(sn){
    var idx=byId();
    return (sn.entries||[]).map(function(en){return {en:en,ex:idx[en.examId]};})
      .filter(function(x){return !!x.ex;})
      .sort(function(a,b){
        var da=parseDMY(a.ex.date),db_=parseDMY(b.ex.date);
        if(da&&db_)return da-db_; if(da)return -1; if(db_)return 1;
        return a.ex.name.localeCompare(b.ex.name);
      });
  }
  function otherSessionOf(examId){
    for(var i=0;i<DATA.sessions.length;i++){
      var sn=DATA.sessions[i];if(sn.id===UI.session)continue;
      for(var j=0;j<(sn.entries||[]).length;j++)
        if(sn.entries[j].examId===examId)return sn;
    }
    return null;
  }
  function ensurePrep(id){
    if(!DATA.prep[id])DATA.prep[id]={notes:false,papers:false,mock:false};
    return DATA.prep[id];
  }

  /* ---------- build everything (cheap — the app is small) ---------- */
  function buildAll(){
    /* keep collapsibles as the user left them across rebuilds */
    var open={};
    Array.prototype.forEach.call(document.querySelectorAll("details[data-keep]"),function(el){
      open[el.id]=el.open;});
    buildHeader();buildYearBar();buildSessBar();buildExamsHead();buildPicker();buildCards();
    buildCalendar();buildTables();buildSetup();render();
    Object.keys(open).forEach(function(id){
      var el=document.getElementById(id);if(el)el.open=open[id];});
  }

  function buildHeader(){
    var p=DATA.profile;
    document.getElementById("hTitle").textContent=p.name?p.name+"'s Exam Tracker":"Exam Tracker & GPA Planner";
    var left=unfinished(DATA.pool,DATA.results).length;
    var passed=DATA.pool.length-left;
    document.getElementById("hLede").textContent=
      p.baseCount+" courses done · "+(passed?passed+" passed here · ":"")
      +left+" left in the pool · aiming "
      +nice(p.targetMin)+"–"+nice(p.targetMax);
    document.getElementById("stBase").textContent=n2(p.baseAvg);
    document.getElementById("stTarget").textContent=
      nice(p.targetMin)+"–"+nice(p.targetMax);
    document.getElementById("wlineLbl").textContent=n2(p.baseAvg);
    var span=0.45;
    document.getElementById("gaugeScale").textContent=n2(p.baseAvg-span)+" – "+n2(p.baseAvg+span);
  }

  function buildYearBar(){
    var years=[];sortSessions(DATA.sessions).forEach(function(sn){
      if(years.indexOf(sn.year)<0)years.push(sn.year);});
    var curYear=cur().year;
    var upSn=null;DATA.sessions.forEach(function(sn){if(sn.id===upcomingId())upSn=sn;});
    var bar=document.getElementById("yearBar");bar.innerHTML="";
    years.forEach(function(y){
      var b=document.createElement("button");b.type="button";
      b.className="ytab"+(y===curYear?" on":"");
      b.innerHTML=esc(y)+(upSn&&upSn.year===y?'<span class="now-dot" title="current period"></span>':"");
      b.addEventListener("click",function(){
        if(y===curYear)return;
        var inYear=sortSessions(DATA.sessions).filter(function(sn){return sn.year===y;});
        var pick=inYear[0];
        inYear.forEach(function(sn){if(sn.id===upcomingId())pick=sn;});
        UI.session=pick.id;buildAll();
      });
      bar.appendChild(b);
    });
  }

  function buildSessBar(){
    var bar=document.getElementById("sessBar");bar.innerHTML="";
    var y=cur().year,up=upcomingId();
    sortSessions(DATA.sessions).filter(function(sn){return sn.year===y;}).forEach(function(sn){
      var list=sn.entries||[],n=list.length;
      var done=list.filter(function(en){return isPassed(DATA.results[en.examId]);}).length;
      var b=document.createElement("button");b.type="button";
      b.className="stab"+(sn.id===UI.session?" on":"")+(n&&done===n?" done":"")+(n?"":" empty");
      var meta=!n?"nothing planned":(done===n?"all "+n+" passed":done+" of "+n+" passed");
      b.innerHTML='<span class="st-l">'+esc(sn.label)
        +(sn.id===up?'<span class="now-dot" title="current period"></span>':"")+'</span>'
        +'<span class="st-m">'+esc(meta)+'</span>';
      b.addEventListener("click",function(){UI.session=sn.id;buildAll();});
      bar.appendChild(b);
    });
  }

  function buildExamsHead(){
    var sn=cur();
    document.getElementById("examHead").textContent="Your exams — "+sn.label;
    var ex=sessionExams(sn);
    document.getElementById("stFirst").textContent=ex.length?dayLabel(ex[0].ex):"–";
    document.getElementById("stLast").textContent=ex.length?dayLabel(ex[ex.length-1].ex):"–";
    document.getElementById("progTotal").textContent=ex.length;
    var segs=document.getElementById("segs");segs.innerHTML="";
    segs.style.gridTemplateColumns="repeat("+Math.max(ex.length,1)+",1fr)";
    ex.forEach(function(){var s=document.createElement("div");s.className="seg";segs.appendChild(s);});
  }

  function buildPicker(){
    var sn=cur(),idx={};(sn.entries||[]).forEach(function(en){idx[en.examId]=true;});
    var open=unfinished(DATA.pool,DATA.results).slice().sort(function(a,b){
      var da=parseDMY(a.date),db_=parseDMY(b.date);
      if(da&&db_)return da-db_; if(da)return -1; if(db_)return 1;
      return a.name.localeCompare(b.name);
    });
    var badge=document.getElementById("pickBadge");
    badge.textContent=open.length?open.length+" to pick from":"pool is clear";
    var box=document.getElementById("pickList");box.innerHTML="";
    if(!open.length){
      box.innerHTML='<p class="pick-empty">Everything in the pool has been passed 🎉 — add more courses in <b>Set up → Exam pool</b> below.</p>';
      return;
    }
    open.forEach(function(ex){
      var row=document.createElement("label");row.className="pick-row";
      var inp=document.createElement("input");inp.type="checkbox";inp.checked=!!idx[ex.id];
      var box2=document.createElement("span");box2.className="box";box2.innerHTML=CHECK;
      var body=document.createElement("span");body.className="pick-body";
      var other=otherSessionOf(ex.id);
      var flags=(isFailed(DATA.results[ex.id])?'<span class="retake-badge">retake</span>':"")
        +(other?'<span class="pick-note">also in '+esc(other.label)+'</span>':"");
      body.innerHTML='<span class="pick-name">'+esc(ex.name)+'</span>'
        +'<span class="pick-meta">'+(ex.sem?'<span class="sem-badge">sem '+esc(ex.sem)+'</span>':"")
        +'<span class="pick-date">'+esc(dayLabel(ex))+'</span>'+flags+'</span>';
      inp.addEventListener("change",function(){
        if(inp.checked)sn.entries.push({examId:ex.id,slot:""});
        else sn.entries=sn.entries.filter(function(en){return en.examId!==ex.id;});
        save();buildAll();
      });
      row.appendChild(inp);row.appendChild(box2);row.appendChild(body);
      box.appendChild(row);
    });
  }

  function makeCheck(id,label,onchange,checked){
    var l=document.createElement("label");l.className="chk"+(checked?" on":"");
    var inp=document.createElement("input");inp.type="checkbox";inp.id=id;inp.checked=!!checked;
    var box=document.createElement("span");box.className="box";box.innerHTML=CHECK;
    var txt=document.createElement("span");txt.className="lbl";txt.textContent=label;
    inp.addEventListener("change",function(){
      l.classList.toggle("on",inp.checked);onchange(inp.checked);});
    l.appendChild(inp);l.appendChild(box);l.appendChild(txt);
    return l;
  }

  function buildCards(){
    var grid=document.getElementById("grid");grid.innerHTML="";
    var sn=cur(),list=sessionExams(sn);
    if(!list.length){
      var empty=document.createElement("div");
      empty.className="card empty-state";
      empty.innerHTML='<div class="emoji">🗓️</div>'
        +'<p>Nothing planned for <b>'+esc(sn.label)+'</b> yet.</p>'
        +'<p class="sub2">Tick exams from your pool — no retyping.</p>';
      var cta=document.createElement("button");cta.type="button";
      cta.className="btn primary";cta.textContent="Pick exams for this session";
      cta.addEventListener("click",function(){
        var d=document.getElementById("pickBox");d.open=true;
        d.scrollIntoView({behavior:"smooth",block:"center"});});
      empty.appendChild(cta);grid.appendChild(empty);
      return;
    }
    list.forEach(function(item){
      var ex=item.ex,en=item.en;
      var card=document.createElement("article");card.className="card exam";card.id="card-"+ex.id;

      var x=document.createElement("button");x.type="button";x.className="x-btn";
      x.title="Remove from this session";x.setAttribute("aria-label","Remove "+ex.name+" from this session");
      x.textContent="✕";
      x.addEventListener("click",function(){
        var r=DATA.results[ex.id];
        if(r&&r.grade!=null&&!confirm("“"+ex.name+"” has a grade logged. Remove it from "+sn.label+"? The grade is kept."))return;
        sn.entries=sn.entries.filter(function(e2){return e2.examId!==ex.id;});
        save();buildAll();
      });
      card.appendChild(x);

      var head=document.createElement("div");head.className="exam-head";
      var nm=document.createElement("div");nm.className="exam-info";
      nm.innerHTML='<div class="t">'+esc(ex.name)+'</div>'
        +'<div class="d">'+esc(fullDate(ex))
        +(ex.sem?' <span class="sem-badge">sem '+esc(ex.sem)+'</span>':"")
        +'<span class="retake-badge" id="rt-'+ex.id+'" hidden>retake</span></div>';
      var db=document.createElement("button");db.type="button";
      db.className="done-btn";db.id="done-"+ex.id;db.setAttribute("aria-pressed","false");
      db.addEventListener("click",function(){
        var r=DATA.results[ex.id];
        if(r&&r.sat){r.sat=false;if(r.grade==null)delete DATA.results[ex.id];}
        else DATA.results[ex.id]={grade:r?r.grade:null,sessionId:sn.id,sat:true};
        save();buildAll();
      });
      head.appendChild(nm);head.appendChild(db);

      var meta=document.createElement("div");meta.className="slot-row";
      var sl=document.createElement("select");sl.className="slot";
      sl.setAttribute("aria-label","Time slot for "+ex.name);
      var opts=SLOTS.slice();
      if(en.slot&&opts.indexOf(en.slot)<0)opts.push(en.slot);
      opts.forEach(function(s){
        var o=document.createElement("option");o.value=s;o.textContent=s||"time —";
        if(s===en.slot)o.selected=true;sl.appendChild(o);});
      sl.addEventListener("change",function(){en.slot=sl.value;save();});
      meta.appendChild(sl);

      var gr=document.createElement("div");gr.className="g-row";
      var lab=document.createElement("span");lab.className="g-label";lab.textContent="Grade";
      var gp=document.createElement("div");gp.className="g-pills";gp.id="gp-"+ex.id;
      gp.setAttribute("role","group");gp.setAttribute("aria-label","Grade for "+ex.name);
      [5,6,7,8,9,10].forEach(function(g){
        var pb=document.createElement("button");pb.type="button";
        pb.className="gpill";pb.dataset.g=String(g);pb.textContent=g;
        pb.title="Tap again to clear";
        pb.addEventListener("click",function(){
          var r=DATA.results[ex.id];
          if(r&&r.grade===g){r.grade=null;if(!r.sat)delete DATA.results[ex.id];}
          else DATA.results[ex.id]={grade:g,sessionId:sn.id,sat:true};
          save();buildAll();
        });
        gp.appendChild(pb);
      });
      gr.appendChild(lab);gr.appendChild(gp);

      var contrib=document.createElement("div");contrib.className="contrib none";
      contrib.id="contrib-"+ex.id;contrib.textContent="no grade yet";

      var prep=document.createElement("div");prep.className="prep";
      var pr=ensurePrep(ex.id);
      [["notes","notes"],["papers","past papers"],["mock","mock run"]].forEach(function(kv){
        prep.appendChild(makeCheck(ex.id+"-"+kv[0],kv[1],function(v){
          ensurePrep(ex.id)[kv[0]]=v;save();},pr[kv[0]]));});

      card.appendChild(head);card.appendChild(meta);card.appendChild(gr);
      card.appendChild(contrib);card.appendChild(prep);
      grid.appendChild(card);
    });
  }

  function monthWeeks(y,m){ /* m is 1-based */
    var offset=(new Date(y,m-1,1).getDay()+6)%7;   /* Mon-first */
    var days=new Date(y,m,0).getDate();
    var cells=[],i;
    for(i=0;i<offset;i++)cells.push(null);
    for(i=1;i<=days;i++)cells.push(i);
    while(cells.length%7)cells.push(null);
    var weeks=[];
    for(i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
    return weeks;
  }

  function buildCalendar(){
    var sn=cur(),cal=document.getElementById("cal");cal.innerHTML="";
    var months=monthsSpanned(sn,byId());
    document.getElementById("calSection").hidden=!months.length;
    var navCal=document.getElementById("navCal");
    if(navCal)navCal.style.display=months.length?"":"none";
    document.getElementById("calHead").textContent=sn.label;
    if(!months.length)return;

    months.forEach(function(mo){
      var block=document.createElement("div");
      if(months.length>1){
        var h=document.createElement("div");h.className="cal-month-h";
        h.textContent=MON[mo.m-1]+" "+mo.y;block.appendChild(h);
      }
      var grid=document.createElement("div");grid.className="cal-grid";
      ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(function(hd){
        var c=document.createElement("div");c.className="cal-h";c.textContent=hd;grid.appendChild(c);});
      monthWeeks(mo.y,mo.m).forEach(function(wk){wk.forEach(function(d,ci){
        var c=document.createElement("div");
        if(d==null){c.className="blank";c.innerHTML='<span class="dnum">0</span>';}
        else{
          c.innerHTML='<span class="dnum">'+d+'</span>';
          if(mo.byDay[d]){
            c.className="exam-day";c.id="cal-"+mo.byDay[d].id;
            c.innerHTML+='<span class="tag">'+esc(shortName(mo.byDay[d].name))+'</span>'
              +'<span class="tick">'+CHECK+'</span>';
          } else if(ci>=5){c.className="wknd";}
        }
        grid.appendChild(c);
      });});
      block.appendChild(grid);cal.appendChild(block);
    });
  }

  function shortName(n){
    n=String(n);
    if(n.length<=14)return n;
    var words=n.split(" ").filter(Boolean);
    return words.length>=2?(words[0]+" "+words[words.length-1]).slice(0,16):n.slice(0,14)+"…";
  }

  function buildTables(){
    var p=DATA.profile;
    var t=targetRows(p);
    document.getElementById("targetCap").textContent="Target final average — all "+p.totalCourses+" courses";
    document.getElementById("needHead").textContent="Need on remaining "+Math.max(t.rem,0);
    var tb=document.getElementById("targetBody");tb.innerHTML="";
    t.rows.forEach(function(r){
      var tr=document.createElement("tr");if(r.hl)tr.className="hl";
      tr.innerHTML='<td class="mono">'+r.target+'</td><td class="mono r">'+r.needDisp
        +(r.over?'<span style="color:var(--bad)">+</span>':"")+'</td><td>'+esc(r.note)+'</td>';
      tb.appendChild(tr);
    });
    document.getElementById("targetFormula").innerHTML=
      'Formula: remaining grades must sum to <code>'+p.totalCourses+' × target − '
      +n2(t.bs).replace(/\.00$/,"")+'</code>';

    var sn=cur(),run=running(p,DATA.results);
    var pending=(sn.entries||[]).filter(function(en){
      var r=DATA.results[en.examId];return !r||r.grade==null;}).length;
    document.getElementById("rrCap").textContent=
      "Ready-reckoner — "+pending+" pending in "+sn.label;
    var rb=document.getElementById("rrBody");rb.innerHTML="";
    reckonerRows(run,pending,p.baseAvg).forEach(function(r){
      var tr=document.createElement("tr");if(r.g===9)tr.className="hl";
      tr.innerHTML='<td class="mono">'+r.g+'</td><td class="mono r">'+n2(r.avg)+'</td>'
        +'<td style="color:'+(r.delta>=0?"var(--good)":"var(--bad)")+'">'
        +(r.delta>=0?"▲ +":"▼ −")+Math.abs(r.delta).toFixed(2)+'</td>';
      rb.appendChild(tr);
    });
    document.getElementById("rrFormula").innerHTML=
      'Live base: <code>'+run.count+'</code> passing grades, sum <code>'
      +n2(run.sum).replace(/\.00$/,"")+'</code>, average <code>'+n2(run.avg)+'</code>';
  }

  /* ---------- render (live values that don't need a rebuild) ---------- */
  function render(){
    var p=DATA.profile,run=running(p,DATA.results);
    var base=p.baseAvg,span=0.45,avg=run.avg;
    var pct=Math.max(0,Math.min(1,(avg-(base-span))/(2*span)))*100;
    var water=document.getElementById("water");
    water.style.height=pct+"%";
    var above=avg>base+1e-9,below=avg<base-1e-9;
    water.style.background=above?"linear-gradient(180deg,#8fc49a,#4f7d5c)"
      :below?"linear-gradient(180deg,#dc9484,#b4483d)"
      :"linear-gradient(180deg,#7fb6bd,#4f8b94)";
    var val=document.getElementById("avgVal");
    val.textContent=n2(avg);
    val.style.color=above?"var(--good)":below?"var(--bad)":"var(--ink)";
    var d=document.getElementById("avgDelta"),diff=avg-base;
    if(Math.abs(diff)<1e-9){d.textContent="at the waterline";d.style.color="var(--muted)";}
    else if(diff>0){d.textContent="▲ +"+diff.toFixed(2)+" above "+n2(base);d.style.color="var(--good)";}
    else{d.textContent="▼ −"+Math.abs(diff).toFixed(2)+" below "+n2(base);d.style.color="var(--bad)";}

    var sn=cur(),list=sessionExams(sn);
    var passed=0,sat=0;
    list.forEach(function(item){
      var r=DATA.results[item.ex.id];
      if(isPassed(r))passed++;
      if(r&&(r.sat||r.grade!=null))sat++;
    });
    document.getElementById("stCleared").textContent=passed+"/"+list.length;
    document.getElementById("stPool").textContent=unfinished(DATA.pool,DATA.results).length;
    document.getElementById("progCount").textContent=sat;
    Array.prototype.forEach.call(document.getElementById("segs").children,function(s,i){
      s.className="seg"+(i<sat?" on":"");});

    var N=list.length,pend=list.filter(function(it){
      var r=DATA.results[it.ex.id];return !r||r.grade==null;}).length;
    var all9=pend?(run.sum+9*pend)/(run.count+pend):run.avg;
    var t=targetRows(p);
    document.getElementById("keynums").innerHTML=
      '<span>Passing grades above <b>'+n2(base)+'</b> lift your average — a fail (5) doesn’t count, the exam just stays in the pool</span>'
      +'<span>Degree ceiling <b>'+n2(t.ceil)+'</b></span>'
      +(pend?'<span>'+pend+' pending at ~9 → <b>'+n2(all9)+'</b></span>':"");

    list.forEach(function(item){
      var ex=item.ex,r=DATA.results[ex.id];
      var g=r&&r.grade!=null?r.grade:null;
      var isSat=!!(r&&(r.sat||g!=null));
      var card=document.getElementById("card-"+ex.id);
      if(card){
        card.classList.toggle("cleared",isPassed(r));
        card.classList.toggle("failed",isFailed(r));
      }
      var db=document.getElementById("done-"+ex.id);
      if(db){
        db.classList.toggle("is-done",isSat);
        db.setAttribute("aria-pressed",isSat?"true":"false");
        db.innerHTML=(isSat?CHECK_BTN:"")+"<span>"+(isSat?"Sat it":"Mark as sat")+"</span>";
      }
      var rt=document.getElementById("rt-"+ex.id);
      if(rt)rt.hidden=!isFailed(r);
      var gp=document.getElementById("gp-"+ex.id);
      if(gp)Array.prototype.forEach.call(gp.children,function(pb){
        pb.classList.toggle("sel",g!=null&&String(g)===pb.dataset.g);});
      var cd=document.getElementById("cal-"+ex.id);
      if(cd)cd.classList.toggle("done",g!=null);
      var c=document.getElementById("contrib-"+ex.id);
      if(!c)return;
      if(g==null){c.className="contrib none";c.textContent="no grade yet";}
      else if(g<6){c.className="contrib down";c.textContent="✗ failed — stays in the pool for a retake";}
      else if(g>base){c.className="contrib up";c.textContent="↑ lifts average";}
      else if(g<base){c.className="contrib down";c.textContent="↓ dips average";}
      else{c.className="contrib none";c.textContent="· holds level";}
    });
  }

  /* ---------- setup editors ---------- */
  function openSetup(){
    var s=document.getElementById("setupSection");
    s.scrollIntoView({behavior:"smooth",block:"start"});
  }
  document.getElementById("customizeBtn").addEventListener("click",openSetup);

  function buildSetup(){
    /* pool editor */
    var pr=document.getElementById("poolRows");pr.innerHTML="";
    DATA.pool.forEach(function(ex){pr.appendChild(poolRow(ex));});
    document.getElementById("poolBadge").textContent=
      DATA.pool.length+" exams · "+unfinished(DATA.pool,DATA.results).length+" open";
    /* sessions editor */
    var sr=document.getElementById("sessRows");sr.innerHTML="";
    sortSessions(DATA.sessions).forEach(function(sn){sr.appendChild(sessRow(sn));});
    /* details */
    var p=DATA.profile;
    document.getElementById("setName").value=p.name||"";
    document.getElementById("setCount").value=p.baseCount;
    document.getElementById("setAvg").value=p.baseAvg;
    document.getElementById("setTmin").value=p.targetMin;
    document.getElementById("setTmax").value=p.targetMax;
    document.getElementById("setTotal").value=p.totalCourses;
  }
  function poolRow(ex){
    var row=document.createElement("div");row.className="exam-row";
    row.dataset.id=ex?ex.id:("x"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36));
    var n=document.createElement("input");n.className="f-name";n.placeholder="Exam name";n.value=ex?ex.name:"";
    var sm=document.createElement("input");sm.className="f-sem";sm.type="number";sm.min=1;sm.max=8;
    sm.placeholder="sem";if(ex&&ex.sem)sm.value=ex.sem;
    var dt=document.createElement("input");dt.className="f-date";dt.placeholder="dd.mm.yyyy";
    dt.value=ex&&ex.date?ex.date:"";
    var x=document.createElement("button");x.type="button";x.textContent="✕";x.title="Remove exam";
    x.addEventListener("click",function(){row.remove();});
    row.appendChild(n);row.appendChild(sm);row.appendChild(dt);row.appendChild(x);
    return row;
  }
  document.getElementById("addPool").addEventListener("click",function(){
    document.getElementById("poolRows").appendChild(poolRow(null));});
  document.getElementById("savePool").addEventListener("click",function(){
    var next=[];
    Array.prototype.forEach.call(document.querySelectorAll("#poolRows .exam-row"),function(row){
      var ins=row.querySelectorAll("input");   /* name, sem, date */
      var name=ins[0].value.trim();if(!name)return;
      next.push({id:row.dataset.id,name:name,
        sem:ins[1].value?+ins[1].value:"",date:ins[2].value.trim()});
    });
    var keep={};next.forEach(function(e){keep[e.id]=true;});
    /* removing an exam removes its session entries, result and prep */
    DATA.sessions.forEach(function(sn){
      sn.entries=(sn.entries||[]).filter(function(en){return keep[en.examId];});});
    Object.keys(DATA.results).forEach(function(k){if(!keep[k])delete DATA.results[k];});
    Object.keys(DATA.prep).forEach(function(k){if(!keep[k])delete DATA.prep[k];});
    DATA.pool=next;
    save();buildAll();
  });

  function sessRow(sn){
    var row=document.createElement("div");row.className="exam-row";
    row.dataset.id=sn?sn.id:("s"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36));
    var l=document.createElement("input");l.className="f-name";l.placeholder="Label (e.g. September 2026)";
    l.value=sn?sn.label:"";
    var y=document.createElement("input");y.className="f-year";y.type="number";y.min=2020;y.max=2100;
    y.placeholder="year";y.value=sn?sn.year:NOW.getFullYear();
    var m=document.createElement("select");m.className="mon";
    MON_FULL.forEach(function(nm,i){
      var o=document.createElement("option");o.value=i+1;o.textContent=MON[i];
      if(sn&&sn.month===i+1)o.selected=true;m.appendChild(o);});
    var x=document.createElement("button");x.type="button";x.textContent="✕";x.title="Remove session";
    x.addEventListener("click",function(){row.remove();});
    row.appendChild(l);row.appendChild(y);row.appendChild(m);row.appendChild(x);
    return row;
  }
  document.getElementById("addSess").addEventListener("click",function(){
    document.getElementById("sessRows").appendChild(sessRow(null));});
  document.getElementById("saveSess").addEventListener("click",function(){
    var rows=document.querySelectorAll("#sessRows .exam-row");
    if(!rows.length){alert("Keep at least one session — add a row first.");return;}
    var oldById={};DATA.sessions.forEach(function(sn){oldById[sn.id]=sn;});
    var next=[];
    Array.prototype.forEach.call(rows,function(row){
      var year=+row.querySelector(".f-year").value||NOW.getFullYear();
      var month=+row.querySelector("select.mon").value||1;
      var label=row.querySelector(".f-name").value.trim()||MON_FULL[month-1]+" "+year;
      var old=oldById[row.dataset.id];
      next.push({id:row.dataset.id,label:label,year:year,month:month,
        entries:old?old.entries:[]});
    });
    if(!next.length){alert("Keep at least one session.");return;}
    DATA.sessions=next;
    if(!next.some(function(sn){return sn.id===UI.session;}))
      UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
    save();buildAll();
  });

  document.getElementById("saveDetails").addEventListener("click",function(){
    var p=DATA.profile;
    p.name=document.getElementById("setName").value.trim();
    p.baseCount=Math.max(0,parseInt(document.getElementById("setCount").value,10)||0);
    p.baseAvg=Math.min(10,Math.max(5,parseFloat(document.getElementById("setAvg").value)||8));
    p.targetMin=parseFloat(document.getElementById("setTmin").value)||p.baseAvg;
    p.targetMax=parseFloat(document.getElementById("setTmax").value)||p.targetMin;
    if(p.targetMax<p.targetMin){var t=p.targetMin;p.targetMin=p.targetMax;p.targetMax=t;}
    p.totalCourses=Math.max(p.baseCount,
      parseInt(document.getElementById("setTotal").value,10)||p.baseCount);
    save();buildAll();
  });

  /* ---------- export / import / reset ---------- */
  document.getElementById("exportBtn").addEventListener("click",function(){
    var out=JSON.stringify({app:"ubt-exam-tracker",version:3,data:DATA},null,2);
    var blob=new Blob([out],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="exam-tracker-"+(DATA.profile.name||"data").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".json";
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},400);
  });
  document.getElementById("importBtn").addEventListener("click",function(){
    document.getElementById("importFile").click();});
  document.getElementById("importFile").addEventListener("change",function(ev){
    var f=ev.target.files&&ev.target.files[0];if(!f)return;
    var rd=new FileReader();
    rd.onload=function(){
      try{
        var next=importAny(JSON.parse(rd.result));
        if(!next)throw new Error("shape");
        DATA=next;
        UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
        save();buildAll();
      }catch(e){alert("That file doesn't look like an exam-tracker export.");}
      ev.target.value="";
    };
    rd.readAsText(f);
  });
  document.getElementById("resetBtn").addEventListener("click",function(){
    if(!confirm("Reset everything back to the default setup? Grades, prep ticks and any pool edits will be lost."))return;
    DATA=seedData();
    UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
    save();buildAll();
  });

  function setSaveState(){
    var dot=document.getElementById("saveDot"),txt=document.getElementById("saveText");
    var m=store.mode();
    if(m==="claude"){dot.className="dot";txt.textContent="Progress saves automatically";}
    else if(m==="local"){dot.className="dot";txt.textContent="Progress saves on this device";}
    else{dot.className="dot off";txt.textContent="Session only — use Export to keep your data";}
  }

  document.getElementById("footNotes").textContent=
    "Averages assume a simple (unweighted) mean of passed course grades, matching how UBT displays the "
    +"transcript average — failed sittings don't enter it, the course simply stays in your pool. Exam dates "
    +"come from the official “Orari i Provimeve — Shtator 2026”; which Dukagjini time window applies depends "
    +"on the professor, so always confirm your section and campus before each exam. Use Export to back up "
    +"or move your data between devices.";

  /* ---------- bottom nav scrollspy ---------- */
  var SPY=[["navHome","top"],["navExams","examsSection"],["navCal","calSection"],
           ["navStats","gpaSection"],["navSet","setupSection"]];
  var spyQueued=false;
  function runSpy(){
    spyQueued=false;
    var y=window.scrollY+150,curId="top";
    SPY.forEach(function(s){var el=document.getElementById(s[1]);
      if(el&&!el.hidden&&el.offsetTop<=y)curId=s[1];});
    SPY.forEach(function(s){var a=document.getElementById(s[0]);
      if(a)a.classList.toggle("on",s[1]===curId);});
  }
  window.addEventListener("scroll",function(){
    if(!spyQueued){spyQueued=true;requestAnimationFrame(runSpy);}
  },{passive:true});

  /* ---------- init ---------- */
  function init(){
    setSaveState();
    store.get(K).then(function(v){
      if(v){try{DATA=normalise(JSON.parse(v));}catch(e){DATA=seedData();}}
      UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
      buildAll();runSpy();
    }).catch(function(){
      UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
      buildAll();runSpy();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();

  // PWA service worker (only when served over http/https, e.g. GitHub Pages)
  if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("./sw.js").catch(function(){});
    });
  }
})(typeof window!=="undefined"?window:globalThis);
