(function(){
  "use strict";
  var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var CHECK_BTN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  /* ---------- exam periods ----------
     UBT runs five sitting periods a year. The two short ones (April, November)
     are catch-up windows and cap at 2 exams; the main three cap at 10. */
  var PERIODS=[
    {key:"jan", label:"January",   short:"Jan",     cap:10, months:[0]},
    {key:"apr", label:"April",     short:"Apr",     cap:2,  months:[3]},
    {key:"jun", label:"June–July", short:"Jun–Jul", cap:10, months:[5,6]},
    {key:"sep", label:"September", short:"Sep",     cap:10, months:[8]},
    {key:"nov", label:"November",  short:"Nov",     cap:2,  months:[10]}
  ];
  function periodOf(key){
    for(var i=0;i<PERIODS.length;i++)if(PERIODS[i].key===key)return PERIODS[i];
    return PERIODS[3];
  }
  function sessLabel(sn){return periodOf(sn.period).label+" "+sn.year;}
  function sessCap(sn){return periodOf(sn.period).cap;}
  /* last calendar day of a period, used to decide whether it has passed */
  function sessEnd(year,p){var m=p.months[p.months.length-1];return new Date(year,m+1,0,23,59,59);}

  /* Every period still ahead of us this year, plus all of next year. */
  function upcomingSessions(now){
    var y=now.getFullYear(),out=[];
    [y,y+1].forEach(function(yy){
      PERIODS.forEach(function(p){
        if(yy===y&&sessEnd(yy,p)<now)return;
        out.push({key:yy+"-"+p.key,year:yy,period:p.key,exams:[],deferred:""});
      });
    });
    return out;
  }

  /* Neutral starter profile. Personal data never lives in this file — it is a
     public static site, so anything here is visible to every visitor. Load your
     own setup with Import (see my-profile.json, kept out of git). */
  function makeDefaultProfile(now){
    var sessions=upcomingSessions(now||new Date());
    var first=sessions[0];
    if(first){
      var m=periodOf(first.period).months[0];
      first.exams=[
        {id:"s1",name:"Course One",  date:"",day:11,mon:m},
        {id:"s2",name:"Course Two",  date:"",day:18,mon:m},
        {id:"s3",name:"Course Three",date:"",day:25,mon:m}
      ];
    }
    return {
      name:"",
      tagline:"Sample data — tap Customize to set your own average, exams and targets.",
      baseCount:10, baseAvg:8.00, targetMin:8.0, targetMax:8.5, totalCourses:24,
      sample:true, completed:[], scenarios:[],
      sessions:sessions,
      active:first?first.key:null
    };
  }

  /* Bring any stored/imported profile up to the current shape. Older exports
     carried a single flat `exams` list with no session around it. */
  function normalise(p,now){
    now=now||new Date();
    if(!p.completed)p.completed=[];
    if(!p.scenarios)p.scenarios=[];
    if(!p.tagline)p.tagline=p.session||"";
    if(!p.sessions||!p.sessions.length){
      p.sessions=upcomingSessions(now);
      if(p.exams&&p.exams.length){
        /* land the legacy list on the period its dates fall in, else the first */
        var mon=null;
        p.exams.forEach(function(e){if(mon==null&&e.mon!=null)mon=e.mon;});
        if(mon==null)mon=8;
        var target=null;
        p.sessions.forEach(function(sn){
          if(!target&&periodOf(sn.period).months.indexOf(mon)>=0)target=sn;});
        target=target||p.sessions[0];
        target.exams=p.exams.map(function(e){
          return {id:e.id,name:e.name,date:e.date||"",day:e.day||null,
                  mon:e.mon!=null?e.mon:periodOf(target.period).months[0]};
        });
        target.deferred=p.deferred||"";
        p.active=target.key;
      }
    }
    delete p.exams; delete p.deferred; delete p.session;
    /* keep every stored session (they hold grades), but fold in any period that
       has since come into range, so the list stays current over time */
    var have={};p.sessions.forEach(function(sn){have[sn.key]=true;});
    upcomingSessions(now).forEach(function(sn){if(!have[sn.key])p.sessions.push(sn);});
    p.sessions.sort(function(a,b){
      if(a.year!==b.year)return a.year-b.year;
      return periodOf(a.period).months[0]-periodOf(b.period).months[0];
    });
    p.sessions.forEach(function(sn){
      if(!sn.exams)sn.exams=[];
      if(sn.deferred==null)sn.deferred="";
      var months=periodOf(sn.period).months;
      sn.exams.forEach(function(e){if(e.mon==null)e.mon=months[0];});
    });
    if(!p.active||!sessionByKey(p,p.active))p.active=p.sessions.length?p.sessions[0].key:null;
    return p;
  }
  function sessionByKey(p,key){
    for(var i=0;i<p.sessions.length;i++)if(p.sessions[i].key===key)return p.sessions[i];
    return null;
  }
  var DEFAULT_PROFILE=makeDefaultProfile(new Date());

  var profile=JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  var state={grades:{},done:{},prep:{}};

  var P_KEY="ubt-tracker-profile-v2", S_KEY="ubt-tracker-state-v2";
  // storage adapter: claude.ai window.storage -> localStorage (GitHub Pages) -> memory
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

  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];});}
  function n2(x){return (Math.round(x*100)/100).toFixed(2);}
  function baseSum(){return profile.baseCount*profile.baseAvg;}

  function act(){return sessionByKey(profile,profile.active)||profile.sessions[0]||{exams:[],deferred:"",year:0,period:"sep"};}
  function actExams(){return act().exams||[];}
  function allExams(){
    var out=[];profile.sessions.forEach(function(sn){
      (sn.exams||[]).forEach(function(e){out.push(e);});});
    return out;
  }
  function clearedIn(sn){
    return (sn.exams||[]).filter(function(e){return state.done[e.id];}).length;
  }

  function ensureState(){
    var g={},d={},p={};
    allExams().forEach(function(e){
      g[e.id]=state.grades[e.id]!=null?state.grades[e.id]:"";
      d[e.id]=!!state.done[e.id];
      p[e.id]=state.prep[e.id]||{notes:false,papers:false,mock:false};
    });
    state={grades:g,done:d,prep:p};
  }

  /* the average is cumulative — every graded exam in every session counts */
  function computeAvg(){
    var sum=baseSum(),n=profile.baseCount,logged=0;
    allExams().forEach(function(e){var g=state.grades[e.id];
      if(g!==""&&g!=null){sum+=Number(g);n++;logged++;}});
    return {avg:n>0?sum/n:0,logged:logged};
  }

  /* ---------- builders ---------- */
  function buildAll(){
    ensureState();
    buildHeader();buildSessBar();buildCap();buildSegs();buildCards();buildCalendar();buildTables();
    buildCompleted();buildScenarios();buildDeferred();toggleDataSections();buildNotes();render();
  }

  function buildHeader(){
    document.getElementById("hTitle").innerHTML=profile.name
      ? esc(profile.name)+"'s Exam Tracker"
      : "Exam Tracker &amp; GPA Planner";
    document.getElementById("hLede").textContent=profile.tagline||"";
    document.getElementById("stBase").textContent=n2(profile.baseAvg);
    document.getElementById("stTarget").textContent=n2(profile.targetMin).replace(/\.00$/,"")+"–"+n2(profile.targetMax).replace(/\.00$/,"");
    document.getElementById("wlineLbl").textContent=n2(profile.baseAvg);
    var span=0.45;
    document.getElementById("gaugeScale").textContent=n2(profile.baseAvg-span)+" – "+n2(profile.baseAvg+span);
    var ex=sortedExams(act());
    document.getElementById("stFirst").textContent=ex.length?dayLabel(ex[0]):"–";
    document.getElementById("stLast").textContent=ex.length?dayLabel(ex[ex.length-1]):"–";
    document.getElementById("progTotal").textContent=ex.length;
    var kn=document.getElementById("keynums");
    var N=allExams().length, bs=baseSum(), bc=profile.baseCount;
    var all9=N?((bs+9*N)/(bc+N)):profile.baseAvg;
    var ceil=profile.totalCourses>bc?((bs+10*(profile.totalCourses-bc))/profile.totalCourses):profile.baseAvg;
    kn.innerHTML='<span>Grades above <b>'+n2(profile.baseAvg)+'</b> lift your average, below it drag it down</span>'
      +'<span>Degree ceiling <b>'+n2(ceil)+'</b></span>'
      +(N?'<span>All '+N+' planned at ~9 → <b>'+n2(all9)+'</b></span>':'');
  }
  var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  /* Dates are derived from (year, month, day) rather than typed as free text,
     so the weekday can never disagree with the calendar. */
  function dayLabel(e){
    if(!e||!e.day)return "–";
    return e.day+" "+MON[e.mon];
  }
  function fullDate(sn,e){
    if(!e||!e.day)return "date not set";
    var d=new Date(sn.year,e.mon,e.day);
    return DOW[d.getDay()]+" "+e.day+" "+MON[e.mon]+" "+sn.year+(e.date?" · "+e.date:"");
  }
  function sortedExams(sn){
    return (sn.exams||[]).slice().sort(function(a,b){
      return (a.mon-b.mon)||((a.day||0)-(b.day||0));});
  }

  function buildSessBar(){
    var bar=document.getElementById("sessBar");bar.innerHTML="";
    profile.sessions.forEach(function(sn){
      var b=document.createElement("button");b.type="button";
      var n=(sn.exams||[]).length,cap=sessCap(sn),cl=clearedIn(sn);
      b.className="stab"+(sn.key===profile.active?" on":"")
        +(n&&cl===n?" done":"")+(n?"":" empty");
      var meta=!n?"nothing planned":(cl===n?"all "+n+" cleared":cl+" of "+n+" cleared");
      b.innerHTML='<span class="st-l">'+esc(sessLabel(sn))+'</span>'
        +'<span class="st-m">'+esc(meta)+' · max '+cap+'</span>';
      b.addEventListener("click",function(){
        profile.active=sn.key;saveProfile();buildAll();fillSettings();});
      bar.appendChild(b);
    });
  }

  function buildCap(){
    var sn=act(),n=(sn.exams||[]).length,cap=sessCap(sn);
    document.getElementById("examHead").textContent="Your exams — "+sessLabel(sn);
    var el=document.getElementById("capBar");
    el.className="cap-bar"+(n>=cap?" full":"");
    el.innerHTML='<span><b>'+n+'</b> of '+cap+' slots used</span>'
      +'<span class="cap-track"><span class="cap-fill" style="width:'+Math.min(100,cap?n/cap*100:0)+'%"></span></span>'
      +'<span>'+(n>=cap?"session full":(cap-n)+" left")+'</span>';
  }

  function buildSegs(){
    var segs=document.getElementById("segs");segs.innerHTML="";
    segs.style.gridTemplateColumns="repeat("+Math.max(actExams().length,1)+",1fr)";
    actExams().forEach(function(){var s=document.createElement("div");s.className="seg";segs.appendChild(s);});
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
    var sn=act();
    var list=sortedExams(sn);
    if(!list.length){
      var empty=document.createElement("div");
      empty.className="card empty-state";
      empty.innerHTML='<div class="emoji">🗓️</div>'
        +'<p>No exams planned for <b>'+esc(sessLabel(sn))+'</b> yet.</p>'
        +'<p class="sub2">You can add up to '+sessCap(sn)+' for this session.</p>';
      var cta=document.createElement("button");cta.type="button";
      cta.className="btn primary";cta.textContent="Plan this session";
      cta.addEventListener("click",openSettings);
      empty.appendChild(cta);
      grid.appendChild(empty);
      return;
    }
    list.forEach(function(e){
      var card=document.createElement("article");card.className="card exam";card.id="card-"+e.id;

      var head=document.createElement("div");head.className="exam-head";
      var nm=document.createElement("div");nm.className="exam-info";
      nm.innerHTML='<div class="t">'+esc(e.name)+'</div><div class="d">'+esc(fullDate(sn,e))+'</div>';
      var db=document.createElement("button");db.type="button";
      db.className="done-btn";db.id="done-"+e.id;db.setAttribute("aria-pressed","false");
      db.addEventListener("click",function(){
        state.done[e.id]=!state.done[e.id];saveState();render();});
      head.appendChild(nm);head.appendChild(db);

      var gr=document.createElement("div");gr.className="g-row";
      var lab=document.createElement("span");lab.className="g-label";lab.textContent="Grade";
      var gp=document.createElement("div");gp.className="g-pills";gp.id="gp-"+e.id;
      gp.setAttribute("role","group");gp.setAttribute("aria-label","Grade for "+e.name);
      [5,6,7,8,9,10].forEach(function(g){
        var pb=document.createElement("button");pb.type="button";
        pb.className="gpill";pb.dataset.g=String(g);pb.textContent=g;
        pb.title="Tap again to clear";
        pb.addEventListener("click",function(){
          state.grades[e.id]=String(state.grades[e.id])===String(g)?"":String(g);
          saveState();render();});
        gp.appendChild(pb);
      });
      gr.appendChild(lab);gr.appendChild(gp);

      var contrib=document.createElement("div");contrib.className="contrib none";
      contrib.id="contrib-"+e.id;contrib.textContent="no grade yet";

      var prep=document.createElement("div");prep.className="prep";
      [["notes","notes"],["papers","past papers"],["mock","mock run"]].forEach(function(x){
        prep.appendChild(makeCheck(e.id+"-"+x[0],x[1],function(v){state.prep[e.id][x[0]]=v;saveState();},state.prep[e.id][x[0]]));});

      card.appendChild(head);card.appendChild(gr);card.appendChild(contrib);card.appendChild(prep);
      grid.appendChild(card);
    });
  }

  function monthWeeks(year,month){
    var offset=(new Date(year,month,1).getDay()+6)%7;     /* Mon-first */
    var days=new Date(year,month+1,0).getDate();
    var cells=[],i;
    for(i=0;i<offset;i++)cells.push(null);
    for(i=1;i<=days;i++)cells.push(i);
    while(cells.length%7)cells.push(null);
    var weeks=[];
    for(i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
    return weeks;
  }

  function buildCalendar(){
    var sn=act(),cal=document.getElementById("cal");cal.innerHTML="";
    var months=periodOf(sn.period).months;
    var placed=(sn.exams||[]).filter(function(e){return e.day>=1&&e.day<=31;});
    document.getElementById("calSection").hidden=!placed.length;
    var navCal=document.getElementById("navCal");
    if(navCal)navCal.style.display=placed.length?"":"none";
    document.getElementById("calHead").textContent=sessLabel(sn);
    if(!placed.length)return;

    months.forEach(function(m){
      var byDay={};
      placed.forEach(function(e){if(e.mon===m)byDay[e.day]=e;});

      var block=document.createElement("div");
      if(months.length>1){
        var h=document.createElement("div");h.className="cal-month-h";
        h.textContent=MON[m]+" "+sn.year;block.appendChild(h);
      }
      var grid=document.createElement("div");grid.className="cal-grid";
      ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(function(hd){
        var c=document.createElement("div");c.className="cal-h";c.textContent=hd;grid.appendChild(c);});

      monthWeeks(sn.year,m).forEach(function(wk){wk.forEach(function(d,ci){
        var c=document.createElement("div");
        if(d==null){c.className="blank";c.innerHTML='<span class="dnum">0</span>';}
        else{
          c.innerHTML='<span class="dnum">'+d+'</span>';
          if(byDay[d]){
            c.className="exam-day";c.id="cal-"+byDay[d].id;
            c.innerHTML+='<span class="tag">'+esc(shortName(byDay[d].name))+'</span>'
              +'<span class="tick">'+CHECK+'</span>';
          } else if(ci>=5){c.className="wknd";}
        }
        grid.appendChild(c);
      });});
      block.appendChild(grid);cal.appendChild(block);
    });

    document.getElementById("calNote").textContent=
      sn.deferred?"Skipped subjects listed at the bottom of the page":"";
  }

  function shortName(n){
    n=String(n);
    if(n.length<=14)return n;
    var words=n.split(" ").filter(Boolean);
    return words.length>=2?(words[0]+" "+words[words.length-1]).slice(0,16):n.slice(0,14)+"…";
  }

  function buildTables(){
    var bc=profile.baseCount,bs=baseSum(),T=profile.totalCourses,rem=T-bc;
    var tb=document.getElementById("targetBody");tb.innerHTML="";
    document.getElementById("targetCap").textContent="Target final average — all "+T+" courses";
    document.getElementById("needHead").textContent="Need on remaining "+Math.max(rem,0);
    var ceil=rem>0?(bs+10*rem)/T:profile.baseAvg;
    var targets=[];
    [8.0,profile.targetMin,profile.baseAvg,profile.targetMax,Math.round(ceil*1000)/1000].forEach(function(t){
      if(!targets.some(function(x){return Math.abs(x-t)<1e-9;}))targets.push(t);});
    targets.sort(function(a,b){return a-b;});
    targets.forEach(function(t){
      var need=rem>0?(T*t-bs)/rem:null;
      var isT=(Math.abs(t-profile.targetMin)<1e-9||Math.abs(t-profile.targetMax)<1e-9);
      var isC=Math.abs(t-ceil)<1e-6, isH=Math.abs(t-profile.baseAvg)<1e-9;
      var note=isC?"ceiling — perfect run":isH?"hold current pace":(need!=null&&need>10)?"not reachable":isT?"your target":"";
      var tr=document.createElement("tr");if(isT)tr.className="hl";
      tr.innerHTML='<td class="mono">'+n2(t)+'</td><td class="mono r">'+(need==null?"—":n2(Math.min(need,10)))
        +(need!=null&&need>10?'<span style="color:var(--bad)">+</span>':'')+'</td><td>'+esc(note)+'</td>';
      tb.appendChild(tr);
    });
    document.getElementById("targetFormula").innerHTML=
      'Formula: remaining grades must sum to <code>'+T+' × target − '+n2(bs).replace(/\.00$/,"")+'</code>';

    var N=actExams().length;
    var rb=document.getElementById("rrBody");rb.innerHTML="";
    document.getElementById("rrCap").textContent="Ready-reckoner — all "+N+" in "+sessLabel(act());
    [8,8.5,9,9.5,10].forEach(function(g){
      var nv=N?(bs+g*N)/(bc+N):profile.baseAvg;
      var d=nv-profile.baseAvg;
      var tr=document.createElement("tr");if(Math.abs(g-9)<1e-9)tr.className="hl";
      tr.innerHTML='<td class="mono">'+(g%1?g.toFixed(1):g)+'</td><td class="mono r">'+n2(nv)+'</td>'
        +'<td style="color:'+(d>=0?"var(--good)":"var(--bad)")+'">'+(d>=0?"▲ +":"▼ −")+Math.abs(d).toFixed(2)+'</td>';
      rb.appendChild(tr);
    });
    document.getElementById("rrFormula").innerHTML=
      'Base: '+bc+' courses, grade sum <code>'+n2(bs).replace(/\.00$/,"")+'</code>, average <code>'+n2(profile.baseAvg)+'</code>';
  }

  function buildCompleted(){
    var rows=profile.completed||[];
    var tbody=document.getElementById("ccBody");tbody.innerHTML="";
    rows.forEach(function(r){
      var tr=document.createElement("tr");
      tr.innerHTML='<td>'+esc(r[0])+'</td><td class="mono r">'+r[1]+'</td><td class="mono r">'+r[2]+'</td><td class="mono">'+r[3]+'</td>';
      tbody.appendChild(tr);});
    var ects=0,gsum=0;
    rows.forEach(function(r){ects+=parseFloat(r[1])||0;gsum+=parseFloat(r[2])||0;});
    document.getElementById("ccLabel").textContent="Show the "+rows.length+" completed course"+(rows.length===1?"":"s");
    document.getElementById("ccBadge").textContent=
      n2(ects).replace(/\.00$/,"")+" ECTS · avg "+(rows.length?n2(gsum/rows.length):"–");
  }

  function buildScenarios(){
    var list=profile.scenarios||[];
    var box=document.getElementById("scenBox");box.innerHTML="";
    list.forEach(function(sc){
      var d=document.createElement("div");
      d.className="card s"+(sc.pick?" pick":"");
      d.innerHTML='<div class="tag">'+esc(sc.tag||"")+'</div><h3>'+esc(sc.title||"")+'</h3>'
        +'<p>'+esc(sc.desc||"")+'</p><div class="avg">'+esc(sc.avg||"")+'</div>';
      box.appendChild(d);});
  }

  function buildDeferred(){
    var sec=document.getElementById("defSection"),box=document.getElementById("defChips");
    box.innerHTML="";
    var items=String(act().deferred||"").split(",").map(function(s){return s.trim();}).filter(Boolean);
    sec.hidden=items.length===0;
    items.forEach(function(t){var c=document.createElement("span");c.className="chip";c.textContent=t;box.appendChild(c);});
  }

  function toggleDataSections(){
    document.getElementById("ccSection").hidden=!(profile.completed&&profile.completed.length);
    document.getElementById("scenSection").hidden=!(profile.scenarios&&profile.scenarios.length);
    document.getElementById("sampleBanner").hidden=!profile.sample;
  }

  function buildNotes(){
    var el=document.getElementById("footNotes");
    el.textContent="Averages assume a simple (unweighted) mean of course grades, matching how UBT displays the "
      +"transcript average — if the final degree GPA is ECTS-weighted, heavier courses count more. Exam dates and "
      +"Prishtina (UBT-Dukagjini) windows come from the official “Orari i Provimeve — Shtator 2026”; always confirm "
      +"your section, professor and campus before each exam. Use Export to back up or move your data between devices.";
  }

  /* ---------- render (live values) ---------- */
  function render(){
    var r=computeAvg(),avg=r.avg,base=profile.baseAvg,span=0.45;
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

    var sn=act(),list=sn.exams||[];
    var cleared=clearedIn(sn);
    document.getElementById("stCleared").textContent=cleared+"/"+list.length;
    document.getElementById("stLogged").textContent=r.logged;
    document.getElementById("progCount").textContent=cleared;
    Array.prototype.forEach.call(document.getElementById("segs").children,function(s,i){
      s.className="seg"+(i<cleared?" on":"");});
    list.forEach(function(e){
      var done=!!state.done[e.id],g=state.grades[e.id];
      var card=document.getElementById("card-"+e.id);
      if(card)card.classList.toggle("cleared",done);
      var db=document.getElementById("done-"+e.id);
      if(db){
        db.classList.toggle("is-done",done);
        db.setAttribute("aria-pressed",done?"true":"false");
        db.innerHTML=(done?CHECK_BTN:"")+"<span>"+(done?"Done":"Mark done")+"</span>";
      }
      var gp=document.getElementById("gp-"+e.id);
      if(gp)Array.prototype.forEach.call(gp.children,function(pb){
        pb.classList.toggle("sel",g!==""&&g!=null&&String(g)===pb.dataset.g);});
      var cd=document.getElementById("cal-"+e.id);
      if(cd)cd.classList.toggle("done",done);
      var c=document.getElementById("contrib-"+e.id);
      if(!c)return;
      if(g===""||g==null){c.className="contrib none";c.textContent="no grade yet";}
      else if(Number(g)>base){c.className="contrib up";c.textContent="↑ lifts average";}
      else if(Number(g)<base){c.className="contrib down";c.textContent="↓ dips average";}
      else{c.className="contrib none";c.textContent="· holds level";}
    });
  }

  /* ---------- persistence ---------- */
  function saveState(){store.set(S_KEY,JSON.stringify(state));}
  function saveProfile(){store.set(P_KEY,JSON.stringify(profile));}

  /* ---------- settings panel ---------- */
  function openSettings(){
    var s=document.getElementById("settingsBox");
    s.open=true;
    s.scrollIntoView({behavior:"smooth",block:"start"});
  }
  document.getElementById("customizeBtn").addEventListener("click",openSettings);
  document.getElementById("navSet").addEventListener("click",function(ev){
    ev.preventDefault();openSettings();});

  function fillSettings(){
    var sn=act();
    document.getElementById("setName").value=profile.name||"";
    document.getElementById("setSession").value=profile.tagline||"";
    document.getElementById("setCount").value=profile.baseCount;
    document.getElementById("setAvg").value=profile.baseAvg;
    document.getElementById("setTmin").value=profile.targetMin;
    document.getElementById("setTmax").value=profile.targetMax;
    document.getElementById("setTotal").value=profile.totalCourses;
    document.getElementById("setDeferred").value=sn.deferred||"";
    document.getElementById("examsFor").textContent=sessLabel(sn)+" — up to "+sessCap(sn);
    var rows=document.getElementById("examRows");rows.innerHTML="";
    sortedExams(sn).forEach(function(e){rows.appendChild(examRow(e,sn));});
    syncAddBtn();
  }
  function rowCount(){return document.querySelectorAll("#examRows .exam-row").length;}
  function syncAddBtn(){
    var cap=sessCap(act()),n=rowCount(),btn=document.getElementById("addExam");
    btn.disabled=n>=cap;
    btn.textContent=n>=cap?("Session full — "+cap+" is the maximum"):("+ Add exam ("+(cap-n)+" left)");
  }
  function examRow(e,sn){
    sn=sn||act();
    var months=periodOf(sn.period).months;
    var row=document.createElement("div");row.className="exam-row";
    row.dataset.id=e&&e.id?e.id:("x"+Date.now()+Math.floor(Math.random()*1e4));
    var n=document.createElement("input");n.className="f-name";n.placeholder="Exam name";n.value=e?e.name:"";
    var dt=document.createElement("input");dt.className="f-note";dt.placeholder="time / room (optional)";dt.value=e&&e.date?e.date:"";
    row.appendChild(n);row.appendChild(dt);
    /* month only matters when the period spans two of them (June–July) */
    if(months.length>1){
      var ms=document.createElement("select");ms.className="mon";
      months.forEach(function(m){
        var o=document.createElement("option");o.value=m;o.textContent=MON[m];
        if(e&&e.mon===m)o.selected=true;ms.appendChild(o);});
      row.appendChild(ms);
    }
    var dy=document.createElement("input");dy.className="f-day";dy.type="number";dy.min=1;dy.max=31;dy.placeholder="day";
    if(e&&e.day)dy.value=e.day;
    row.appendChild(dy);
    var x=document.createElement("button");x.type="button";x.textContent="✕";x.title="Remove exam";
    x.addEventListener("click",function(){row.remove();syncAddBtn();});
    row.appendChild(x);
    return row;
  }
  document.getElementById("addExam").addEventListener("click",function(){
    if(rowCount()>=sessCap(act()))return;
    document.getElementById("examRows").appendChild(examRow(null));
    syncAddBtn();
  });

  document.getElementById("applySet").addEventListener("click",function(){
    var sn=act(),months=periodOf(sn.period).months,cap=sessCap(sn);
    profile.name=document.getElementById("setName").value.trim();
    profile.tagline=document.getElementById("setSession").value.trim();
    profile.baseCount=Math.max(0,parseInt(document.getElementById("setCount").value,10)||0);
    profile.baseAvg=Math.min(10,Math.max(5,parseFloat(document.getElementById("setAvg").value)||8.00));
    profile.targetMin=parseFloat(document.getElementById("setTmin").value)||profile.baseAvg;
    profile.targetMax=parseFloat(document.getElementById("setTmax").value)||profile.targetMin;
    if(profile.targetMax<profile.targetMin){
      var t=profile.targetMin;profile.targetMin=profile.targetMax;profile.targetMax=t;}
    profile.totalCourses=Math.max(profile.baseCount,
      parseInt(document.getElementById("setTotal").value,10)||profile.baseCount);
    profile.sample=false;
    sn.deferred=document.getElementById("setDeferred").value.trim();

    var next=[],overflow=0;
    Array.prototype.forEach.call(document.querySelectorAll("#examRows .exam-row"),function(row){
      var ins=row.querySelectorAll("input");          /* [0] name, [1] note, [2] day */
      var name=ins[0].value.trim();if(!name)return;
      if(next.length>=cap){overflow++;return;}
      var sel=row.querySelector("select.mon");
      var mon=sel?parseInt(sel.value,10):months[0];
      var day=parseInt(ins[2].value,10);
      var maxDay=new Date(sn.year,mon+1,0).getDate();
      next.push({id:row.dataset.id,name:name,date:ins[1].value.trim(),
        mon:mon,day:(day>=1&&day<=maxDay)?day:null});
    });
    sn.exams=next;
    if(overflow)alert(sessLabel(sn)+" allows at most "+cap+" exams, so "+overflow+" row"
      +(overflow===1?" was":"s were")+" not saved.");
    saveProfile();buildAll();fillSettings();saveState();
    document.getElementById("settingsBox").open=false;
  });

  document.getElementById("resetProfile").addEventListener("click",function(){
    if(!confirm("Reset everything to the sample setup? Your entries will be cleared."))return;
    profile=JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    state={grades:{},done:{},prep:{}};
    saveProfile();buildAll();saveState();fillSettings();
  });

  /* ---------- export / import / reset ---------- */
  document.getElementById("exportBtn").addEventListener("click",function(){
    var data=JSON.stringify({app:"ubt-exam-tracker",version:2,profile:profile,state:state},null,2);
    var blob=new Blob([data],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="exam-tracker-"+(profile.name||"data").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".json";
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
        var data=JSON.parse(rd.result);
        if(data&&data.profile){
          profile=normalise(data.profile,new Date());
          profile.sample=false;
        }
        if(data&&data.state){state=data.state;}
        saveProfile();buildAll();saveState();fillSettings();
      }catch(e){alert("That file doesn't look like an exam-tracker export.");}
      ev.target.value="";
    };
    rd.readAsText(f);
  });
  document.getElementById("resetBtn").addEventListener("click",function(){
    var sn=act();
    if(!confirm("Clear ticks and grades for "+sessLabel(sn)+"? Other sessions keep theirs."))return;
    (sn.exams||[]).forEach(function(e){state.grades[e.id]="";state.done[e.id]=false;
      state.prep[e.id]={notes:false,papers:false,mock:false};});
    saveState();buildAll();
  });

  function setSaveState(){
    var dot=document.getElementById("saveDot"),txt=document.getElementById("saveText");
    var m=store.mode();
    if(m==="claude"){dot.className="dot";txt.textContent="Progress saves automatically";}
    else if(m==="local"){dot.className="dot";txt.textContent="Progress saves on this device";}
    else{dot.className="dot off";txt.textContent="Session only — use Export to keep your data";}
  }

  /* ---------- bottom nav scrollspy ---------- */
  var SPY=[["navHome","top"],["navExams","examsSection"],["navCal","calSection"],["navStats","gpaSection"]];
  var spyQueued=false;
  function runSpy(){
    spyQueued=false;
    var y=window.scrollY+150,cur="top";
    SPY.forEach(function(s){var el=document.getElementById(s[1]);
      if(el&&!el.hidden&&el.offsetTop<=y)cur=s[1];});
    SPY.forEach(function(s){var a=document.getElementById(s[0]);
      if(a)a.classList.toggle("on",s[1]===cur);});
  }
  window.addEventListener("scroll",function(){
    if(!spyQueued){spyQueued=true;requestAnimationFrame(runSpy);}
  },{passive:true});

  /* ---------- init ---------- */
  function init(){
    setSaveState();
    store.get(P_KEY).then(function(pv){
      if(pv){try{var p=JSON.parse(pv);
        if(p&&(p.sessions||p.exams))profile=normalise(p,new Date());
      }catch(e){}}
      return store.get(S_KEY);
    }).then(function(sv){
      if(sv){try{var s=JSON.parse(sv);if(s&&s.grades)state=s;}catch(e){}}
      buildAll();fillSettings();runSpy();
    }).catch(function(){buildAll();fillSettings();runSpy();});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();

  // PWA service worker (only when served over http/https, e.g. GitHub Pages)
  if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("./sw.js").catch(function(){});
    });
  }
})();
