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
  var MON_SQ=["Jan","Shk","Mar","Pri","Maj","Qer","Kor","Gsh","Sht","Tet","Nën","Dhj"];
  var MON_FULL_SQ=["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht",
                   "Shtator","Tetor","Nëntor","Dhjetor"];
  var DOW_SQ=["Die","Hën","Mar","Mër","Enj","Pre","Sht"];
  var DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  var DAYS_SQ=["E hënë","E martë","E mërkurë","E enjte","E premte","E shtunë","E diel"];
  var SLOTS=["","13:00–14:30","17:30–19:00","15:00–16:30 (Prizren)","9:00–10:30 (Ferizaj)"];
  /* month/day names currently in use — swapped by the language toggle */
  var LOC={MON:MON,DOW:DOW,MON_FULL:MON_FULL,DAYS:DAYS};

  /* ---------- year-3 curriculum (from "Specializimet Semestri 5 & 6") ---------- */
  var SPECS={
    cyber:{sq:"Siguria Kibernetike",en:"Cybersecurity",
      s5:["Kriptografia","Siguria Kibernetike"],
      s6:["Infrastruktura dhe Siguria e IT-së","Siguria e Big Data"]},
    se:{sq:"Inxhinieria Softwerike",en:"Software Engineering",
      s5:["Dizajni i Sistemit të Softuerit","Paternat e Dizajnit dhe Refaktorimi i Kodit"],
      s6:["Arkitektura Softuerike","Testimi i Softuerit dhe Sigurimi i Cilësisë"]},
    data:{sq:"Inxhinieria e të Dhënave & AI",en:"Data Engineering & AI",
      s5:["Modelet e të Dhënave dhe Bazat e të Dhënave","Sistemet e Procesimit të të Dhënave Dizajnuese"],
      s6:["Modelet e Mësimit Makinor","Shkenca e të Dhënave dhe Vizualizimi me Python"]},
    web:{sq:"Web Developing",en:"Web & Mobile",
      s5:["Programimi në Anën e Serverit","Web Shërbimet / Web API's"],
      s6:["Zhvillimi i Web-it në Anën e Klientit","Zhvillimi i Aplikacioneve Mobile"]},
    net:{sq:"Inxhinieria e Komunikimit",en:"Networking & Telecom",
      s5:["Rrjetat Kompjuterike 2","Bazat e Telekomunikacionit dhe Rrjeteve pa Tela"],
      s6:["Komunikimet Mobile","Menaxhimi dhe Siguria e Rrjeteve"]}
  };
  var COMMON={
    s5:["Bazat e Inteligjencës Artificiale","Sistemet e Ndërlidhura","Menaxhimi i Projekteve dhe Ndërmarrësia"],
    s6:["Cloud Computing","Lënda Laboratorike 2 – Projekt Grupor"],
    e5:["Infrastruktura e Serverëve","Interneti i Gjërave (IoT)"],
    e6:["Orientimi në Karrierë, Komunikim dhe Zhvillim","Programimi i Lojërave"]
  };
  /* every year-3 subject for a specialization, tagged by kind */
  function curriculum(k){
    var sp=SPECS[k];if(!sp)return [];
    var out=[];
    COMMON.s5.forEach(function(n){out.push({name:n,sem:5,kind:"oblig"});});
    sp.s5.forEach(function(n){out.push({name:n,sem:5,kind:"spec"});});
    COMMON.e5.forEach(function(n){out.push({name:n,sem:5,kind:"elect"});});
    COMMON.s6.forEach(function(n){out.push({name:n,sem:6,kind:"oblig"});});
    sp.s6.forEach(function(n){out.push({name:n,sem:6,kind:"spec"});});
    COMMON.e6.forEach(function(n){out.push({name:n,sem:6,kind:"elect"});});
    return out;
  }

  /* ---------- weekly schedule: what's on now, what's next ----------
     Entries: {day: 1(Mon)–7(Sun), start "HH:MM", end "HH:MM", name, room}.
     Pure clock math on local data, so it works with no connection at all. */
  function toMin(s){
    var m=/^(\d{1,2}):(\d{2})$/.exec(String(s||"").trim());
    return m?(+m[1])*60+(+m[2]):null;
  }
  function schedNow(schedule,now){
    var mins=now.getHours()*60+now.getMinutes();
    var today=((now.getDay()+6)%7)+1;   /* Mon=1 */
    var cur=null,next=null,best=Infinity;
    (schedule||[]).forEach(function(en){
      var s=toMin(en.start);if(s==null)return;
      var e=toMin(en.end);if(e==null)e=s+90;
      if(en.day===today&&s<=mins&&mins<e)cur={entry:en,endsIn:e-mins};
      var delta=((en.day-today+7)%7)*1440+(s-mins);
      if(delta<=0)delta+=7*1440;
      if(delta<best){best=delta;next={entry:en,inMin:delta};}
    });
    return {current:cur,next:next};
  }

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
  function dayLabel(ex){var d=parseDMY(ex&&ex.date);return d?d.getDate()+" "+LOC.MON[d.getMonth()]:"–";}
  function fullDate(ex){
    var d=parseDMY(ex&&ex.date);
    return d?LOC.DOW[d.getDay()]+" "+d.getDate()+" "+LOC.MON[d.getMonth()]+" "+d.getFullYear():null;
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
  /* total failed sittings: frozen past fails + the current grade if it's a fail */
  function attempts(res){
    return (res?(+res.fails||0):0)+(isFailed(res)?1:0);
  }
  function nthTry(n){return n===1?"1st":n===2?"2nd":n===3?"3rd":n+"th";}
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
    /* only grade-shaped targets: a blank profile has baseAvg 0, which would
       otherwise produce nonsense rows */
    var cands=[p.baseAvg-0.75,p.targetMin,p.baseAvg,p.targetMax,ceil]
      .filter(function(t){return t>=5&&t<=10;});
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
        kind:isCeil?"ceil":isHold?"hold":over?"over":isTgt?"tgt":""
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

  /* ECTS-weighted average: weighted base + each passing grade × its credits.
     Exams without an ECTS value count as 5 (the typical UBT course). */
  function weightedAvg(profile,pool,results){
    var be=+profile.baseEcts||0;
    if(!be)return null;
    var sum=(+profile.baseAvgW||profile.baseAvg)*be,w=be;
    var byId=poolIndex(pool);
    Object.keys(results||{}).forEach(function(k){
      var r=results[k];if(!isPassed(r))return;
      var ex=byId[k];if(!ex)return;
      var e=+ex.ects||5;
      sum+=r.grade*e;w+=e;
    });
    return w?sum/w:null;
  }

  /* running average after each passing grade, in exam-date order —
     the data behind the trend sparkline */
  function trendPoints(profile,pool,results,sessions){
    var byId=poolIndex(pool),sessIdx={};
    (sessions||[]).forEach(function(s){sessIdx[s.id]=s;});
    var items=[];
    Object.keys(results||{}).forEach(function(k){
      var r=results[k];if(!isPassed(r))return;
      var ex=byId[k];if(!ex)return;
      var d=parseDMY(ex.date),s=sessIdx[r.sessionId];
      items.push({t:d?d.getTime():(s?new Date(s.year,s.month,0).getTime():0),
        g:r.grade,name:ex.name});
    });
    items.sort(function(a,b){return a.t-b.t;});
    var sum=profile.baseCount*profile.baseAvg,n=profile.baseCount;
    var pts=n>0?[{avg:sum/n,name:null,g:null}]:[];
    items.forEach(function(it){sum+=it.g;n++;pts.push({avg:sum/n,name:it.name,g:it.g});});
    return pts;
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

  /* ---------- work due: homework, projects, labs ----------
     Items: {id, title, type, subject, date "dd.mm.yyyy", time "HH:MM",
     team, notes, done}. Undated items are allowed and sort last. */
  var DUE_TYPES=["hw","project","lab","pres","other"];
  function dueWhen(item){
    var d=parseDMY(item.date);if(!d)return null;
    var m=toMin(item.time);
    return new Date(d.getFullYear(),d.getMonth(),d.getDate(),
      m!=null?Math.floor(m/60):23,m!=null?m%60:59);
  }
  function dueSplit(due,now){
    var open=[],done=[];
    var mid=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    (due||[]).forEach(function(it){
      if(it.done){done.push(it);return;}
      var w=dueWhen(it),days=null,over=false;
      if(w){
        days=Math.round((parseDMY(it.date)-mid)/864e5);
        over=w<now;
      }
      open.push({item:it,when:w,days:days,overdue:over});
    });
    open.sort(function(a,b){
      if(a.when&&b.when)return a.when-b.when;
      if(a.when)return -1;if(b.when)return 1;
      return String(a.item.title).localeCompare(String(b.item.title));
    });
    return {open:open,done:done};
  }

  /* ---------- .ics calendar export ---------- */
  function icsEsc(s){
    return String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
  }
  function icsFold(line){
    var out=[];
    while(line.length>70){out.push(line.slice(0,70));line=" "+line.slice(70);}
    out.push(line);
    return out.join("\r\n");
  }
  /* ungraded dated exams of a session as calendar events; slot times become
     event times, slotless exams become all-day events; -1 day display alarm */
  function buildICS(sn,byId,results,summaryPrefix){
    var lines=["BEGIN:VCALENDAR","VERSION:2.0",
      "PRODID:-//ubt-exam-tracker//EN","CALSCALE:GREGORIAN"];
    var now=new Date();
    var stamp=now.getUTCFullYear()+pad2(now.getUTCMonth()+1)+pad2(now.getUTCDate())
      +"T"+pad2(now.getUTCHours())+pad2(now.getUTCMinutes())+pad2(now.getUTCSeconds())+"Z";
    (sn.entries||[]).forEach(function(en){
      var ex=byId[en.examId],d=ex&&parseDMY(ex.date);
      if(!d)return;
      var r=(results||{})[ex.id];
      if(r&&r.grade!=null)return;              /* already sat — no event needed */
      var ymd=""+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate());
      var m=/^(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})/.exec(en.slot||"");
      lines.push("BEGIN:VEVENT");
      lines.push("UID:"+ex.id+"-"+sn.id+"@ubt-exam-tracker");
      lines.push("DTSTAMP:"+stamp);
      if(m){
        lines.push("DTSTART:"+ymd+"T"+pad2(+m[1])+m[2]+"00");
        lines.push("DTEND:"+ymd+"T"+pad2(+m[3])+m[4]+"00");
      }else{
        var nd=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
        lines.push("DTSTART;VALUE=DATE:"+ymd);
        lines.push("DTEND;VALUE=DATE:"+nd.getFullYear()+pad2(nd.getMonth()+1)+pad2(nd.getDate()));
      }
      lines.push(icsFold("SUMMARY:"+icsEsc((summaryPrefix||"Exam: ")+ex.name)));
      lines.push(icsFold("DESCRIPTION:"+icsEsc(sn.label+(en.slot?" · "+en.slot:""))));
      lines.push("BEGIN:VALARM","ACTION:DISPLAY",
        icsFold("DESCRIPTION:"+icsEsc(ex.name)),"TRIGGER:-P1D","END:VALARM");
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  /* open deadlines as calendar events, day-before alarm included */
  function buildDueICS(due,prefix){
    var lines=["BEGIN:VCALENDAR","VERSION:2.0",
      "PRODID:-//ubt-exam-tracker//EN","CALSCALE:GREGORIAN"];
    var now=new Date();
    var stamp=now.getUTCFullYear()+pad2(now.getUTCMonth()+1)+pad2(now.getUTCDate())
      +"T"+pad2(now.getUTCHours())+pad2(now.getUTCMinutes())+pad2(now.getUTCSeconds())+"Z";
    (due||[]).forEach(function(it){
      if(it.done)return;
      var d=parseDMY(it.date);if(!d)return;
      var ymd=""+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate());
      var m=toMin(it.time);
      lines.push("BEGIN:VEVENT");
      lines.push("UID:due-"+it.id+"@ubt-exam-tracker");
      lines.push("DTSTAMP:"+stamp);
      if(m!=null){
        lines.push("DTSTART:"+ymd+"T"+pad2(Math.floor(m/60))+pad2(m%60)+"00");
        lines.push("DTEND:"+ymd+"T"+pad2(Math.floor(m/60))+pad2(m%60)+"00");
      }else{
        var nd=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
        lines.push("DTSTART;VALUE=DATE:"+ymd);
        lines.push("DTEND;VALUE=DATE:"+nd.getFullYear()+pad2(nd.getMonth()+1)+pad2(nd.getDate()));
      }
      lines.push(icsFold("SUMMARY:"+icsEsc((prefix||"Due: ")+it.title
        +(it.subject?" ("+it.subject+")":""))));
      if(it.notes||it.team)
        lines.push(icsFold("DESCRIPTION:"+icsEsc((it.team?it.team+" — ":"")+(it.notes||""))));
      lines.push("BEGIN:VALARM","ACTION:DISPLAY",
        icsFold("DESCRIPTION:"+icsEsc(it.title)),"TRIGGER:-P1D","END:VALARM");
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  /* ---------- seed & shape ----------
     The seed is deliberately NEUTRAL: this is a public static site, so a
     first-time visitor gets a blank tracker with only the institutional
     sitting periods. Personal data enters through Set up or Import only. */
  function seedData(){
    return {
      profile:{name:"",baseCount:0,baseAvg:0,targetMin:8,targetMax:9,totalCourses:24,
               baseEcts:0,baseAvgW:0,uniEmail:"",uniId:"",year:1,spec:""},
      pool:[],
      completed:[],
      sessions:[
        {id:"s-2026-9",label:"September 2026",year:2026,month:9,entries:[]},
        {id:"s-2026-11",label:"November 2026",year:2026,month:11,entries:[]},
        {id:"s-2027-1",label:"January 2027",year:2027,month:1,entries:[]},
        {id:"s-2027-4",label:"April 2027",year:2027,month:4,entries:[]},
        {id:"s-2027-6",label:"June–July 2027",year:2027,month:6,entries:[]},
        {id:"s-2027-9",label:"September 2027",year:2027,month:9,entries:[]},
        {id:"s-2027-11",label:"November 2027",year:2027,month:11,entries:[]}
      ],
      results:{},prep:{},schedule:[],due:[],v:2
    };
  }
  /* when a transcript exists, the base numbers are computed from it */
  function deriveBase(d){
    var c=d.completed||[];
    if(!c.length)return;
    var p=d.profile,sum=0;
    c.forEach(function(r){sum+=r.grade;});
    p.baseCount=c.length;
    p.baseAvg=sum/c.length;
    if(c.some(function(r){return r.ects!==""&&r.ects!=null;})){
      var es=0,gs=0;
      c.forEach(function(r){var e=+r.ects||5;es+=e;gs+=r.grade*e;});
      p.baseEcts=es;p.baseAvgW=gs/es;
    }
  }
  /* sessions added in later versions, folded into older stored data once */
  var MIGRATE_SESSIONS=[
    {id:"s-2026-11",label:"November 2026",year:2026,month:11},
    {id:"s-2027-6", label:"June–July 2027",year:2027,month:6},
    {id:"s-2027-9", label:"September 2027",year:2027,month:9},
    {id:"s-2027-11",label:"November 2027",year:2027,month:11}
  ];

  function normalise(d){
    if(!d||typeof d!=="object")return seedData();
    d.profile=d.profile||{};
    var p=d.profile,s=seedData().profile;
    ["name","uniEmail","uniId","spec"].forEach(function(k){
      if(typeof p[k]!=="string")p[k]=p[k]!=null?String(p[k]):(s[k]||"");});
    if(!SPECS[p.spec])p.spec="";
    ["baseCount","baseAvg","targetMin","targetMax","totalCourses","baseEcts","baseAvgW","year"].forEach(function(k){
      p[k]=isFinite(+p[k])?+p[k]:s[k];});
    d.schedule=(d.schedule||[]).filter(function(en){
      return en&&en.name&&toMin(en.start)!=null&&+en.day>=1&&+en.day<=7;});
    d.schedule.forEach(function(en){
      en.day=+en.day;en.start=String(en.start);en.end=en.end?String(en.end):"";
      en.name=String(en.name);en.room=en.room?String(en.room):"";});
    d.completed=(d.completed||[]).filter(function(r){
      return r&&r.name&&isFinite(+r.grade)&&+r.grade>=6&&+r.grade<=10;});
    d.completed.forEach(function(r){
      if(!r.id)r.id="f"+Math.random().toString(36).slice(2,9);
      r.name=String(r.name);r.grade=+r.grade;
      r.ects=r.ects!==""&&r.ects!=null&&isFinite(+r.ects)?+r.ects:"";});
    deriveBase(d);
    if(p.totalCourses<p.baseCount)p.totalCourses=p.baseCount;
    d.due=(d.due||[]).filter(function(it){return it&&it.id&&it.title;});
    d.due.forEach(function(it){
      it.title=String(it.title);
      it.type=DUE_TYPES.indexOf(it.type)>=0?it.type:"other";
      it.subject=it.subject?String(it.subject):"";
      it.date=it.date?String(it.date):"";it.time=it.time?String(it.time):"";
      it.team=it.team?String(it.team):"";it.notes=it.notes?String(it.notes):"";
      it.done=!!it.done;});
    if(p.targetMax<p.targetMin){var t=p.targetMin;p.targetMin=p.targetMax;p.targetMax=t;}
    if(p.totalCourses<p.baseCount)p.totalCourses=p.baseCount;
    d.pool=(d.pool||[]).filter(function(e){return e&&e.id&&e.name;});
    d.pool.forEach(function(e){
      e.sem=e.sem!=null&&e.sem!==""?+e.sem||"":"";
      e.ects=e.ects!=null&&e.ects!==""?+e.ects||"":"";
      e.date=e.date||"";});
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
    /* one-time additive migration: fold in sitting periods introduced later,
       matched by year+month so renamed/imported sessions don't duplicate */
    if((+d.v||1)<2){
      MIGRATE_SESSIONS.forEach(function(def){
        if(!d.sessions.some(function(sn){return sn.year===def.year&&sn.month===def.month;}))
          d.sessions.push({id:def.id,label:def.label,year:def.year,month:def.month,entries:[]});
      });
    }
    d.v=2;
    d.results=d.results||{};d.prep=d.prep||{};
    Object.keys(d.results).forEach(function(k){
      var r=d.results[k];
      if(!byId[k]||!r||(r.grade==null&&!r.sat&&!(+r.fails>0))){delete d.results[k];return;}
      if(r.grade!=null)r.grade=+r.grade;
      r.fails=+r.fails||0;
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
      pool:[],sessions:[],results:{},prep:{},completed:[]};
    /* old exports carried the transcript as [name, ects, grade, letter] rows */
    (op.completed||[]).forEach(function(r,i){
      if(r&&r[0]&&isFinite(+r[2]))
        d.completed.push({id:"f"+i,name:String(r[0]),grade:+r[2],ects:+r[1]||""});
    });
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

  var CORE={MON:MON,MON_FULL:MON_FULL,DOW:DOW,SLOTS:SLOTS,LOC:LOC,
    n2:n2,nice:nice,esc:esc,pad2:pad2,parseDMY:parseDMY,dayLabel:dayLabel,fullDate:fullDate,
    poolIndex:poolIndex,sessionEnd:sessionEnd,sortSessions:sortSessions,autoSelect:autoSelect,
    isPassed:isPassed,isFailed:isFailed,attempts:attempts,nthTry:nthTry,
    unfinished:unfinished,running:running,
    targetRows:targetRows,reckonerRows:reckonerRows,monthsSpanned:monthsSpanned,
    weightedAvg:weightedAvg,trendPoints:trendPoints,deriveBase:deriveBase,
    SPECS:SPECS,COMMON:COMMON,curriculum:curriculum,schedNow:schedNow,toMin:toMin,
    DUE_TYPES:DUE_TYPES,dueWhen:dueWhen,dueSplit:dueSplit,buildDueICS:buildDueICS,
    buildICS:buildICS,seedData:seedData,normalise:normalise,importAny:importAny};
  root.TrackerCore=CORE;

  /* ================================================================
     APP — everything below needs a DOM.
     ================================================================ */
  if(typeof document==="undefined")return;

  var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var CHECK_BTN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/></svg>';
  var MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z"/></svg>';

  /* ---------- i18n ---------- */
  var DICT={
  en:{
    eyebrow:"Kolegji UBT · Exam session tracker",
    defaultTitle:"Exam Tracker & GPA Planner",
    setup:"Set up",
    coursesDone:"courses done",passedHere:"passed here",leftIn:"left in the pool",aiming:"aiming",
    runningAvg:"Running average",atWater:"at the waterline",above:"above",below:"below",
    sessionProgress:"Session progress",satWord:"sat",prepWord:"prep",
    waterGauge:"Waterline gauge",
    passedSession:"passed this session",leftPool:"left in the pool",startAvg:"start average",
    targetBand:"target band",nextExam:"next exam",firstExam:"first exam",lastExam:"last exam",
    today:"today",tomorrow:"tomorrow",inD:"in {n}d",
    kn1:"Passing grades above <b>{x}</b> lift your average — a fail (5) doesn't count, the exam just stays in the pool",
    kn2:"Degree ceiling <b>{x}</b>",kn3:"{n} pending at ~9 → <b>{x}</b>",
    sessH:"Exam sessions",
    sessHint:"the green dot marks where “now” is — grades count toward your average from any session",
    nowTitle:"current period",
    nothingPlanned:"nothing planned",allPassed:"all {n} passed",ofPassed:"{a} of {b} passed",
    yourExams:"Your exams — ",dukagjini:"which Dukagjini window applies depends on the professor",
    whatif:"🎲 What-if mode",whatifOn:"✕ Exit what-if",
    whatifBanner:"Sandbox — grades you tap now are pretend and are not saved.",
    addExams:"Add exams to this session",toPick:"{n} to pick from",poolClear:"pool is clear",
    poolClearMsg:"Everything in the pool has been passed 🎉 — add more courses in <b>Set up → Exam pool</b>.",
    pickSub:"Tick exams from your pool above — nothing is retyped. Passing an exam (grade 6+) removes it from the pool everywhere; a 5 keeps it there flagged <b>retake</b>.",
    retake:"retake",alsoIn:"also in ",
    noneFor:"Nothing planned for <b>{s}</b> yet.",noneSub:"Tick exams from your pool — no retyping.",
    pickCta:"Pick exams for this session",
    markSat:"Mark as sat",satIt:"Sat it",grade:"Grade",timeDash:"time —",noDate:"date not set",
    tapClear:"Tap again to clear",removeFrom:"Remove from this session",
    removeConfirm:"“{name}” has a grade logged. Remove it from {sess}? The grade is kept.",
    noGrade:"no grade yet",attemptUp:"no grade yet — {n} attempt coming up",
    failedStays:"✗ failed{x} — stays in the pool for a retake",
    lifts:"↑ lifts average",dips:"↓ dips average",holds:"· holds level",
    passedTry:" · passed on the {n} try",alreadyPassed:"✓ already passed",inWord:" in ",
    prepNotes:"notes",prepPapers:"past papers",prepMock:"mock run",
    calHint:"exam days get a ✓ once a grade is logged",
    legendExam:"your exam",legendWknd:"weekend",icsBtn:"📅 Add to phone calendar",
    clearedH:"Cleared so far",clearedSum:"Show the {n} passed",
    thCourse:"Course",thGrade:"Grade",thWhere:"Session",thTry:"Attempt",
    gpaH:"GPA reference",
    gpaSub:"Left: what your remaining course grades must average for each final-GPA target. Right: where the open session lands you if every pending exam comes in at a given grade. Both recalculate live.",
    targetCap:"Target final average — all {n} courses",needHead:"Need on remaining {n}",
    thTarget:"Target",thNote:"Note",
    noteCeil:"ceiling — perfect run",noteHold:"hold current pace",noteOver:"not reachable",noteTgt:"your target",
    targetFormula:"Formula: remaining grades must sum to",
    rrCap:"Ready-reckoner — {n} pending in {s}",
    thIf:"If grades average",thNew:"Your new average",thVs:"vs waterline",
    rrFormula:"Live base: <code>{c}</code> passing grades, sum <code>{s}</code>, average <code>{a}</code>",
    setupHint:"finished → pool → sessions → details",
    poolSum:"Exam pool — everything you still have to sit",poolBadge:"{n} exams · {m} open",
    poolHint:"Name · semester · date as <b>dd.mm.yyyy</b> (places it on the calendar). Removing an exam here also removes its grade and session entries.",
    addPool:"+ Add exam",savePool:"Save pool",
    sessSum:"Exam sessions — the sitting periods you plan around",
    sessHint2:"Label · year · month. A session keeps its picked exams when you edit it.",
    addSess:"+ Add session",saveSess:"Save sessions",
    keepOne:"Keep at least one session — add a row first.",
    detSum:"Your details — name, average and targets",
    lblName:"Your name",phName:"e.g. Alex",lblCount:"Courses completed",lblAvg:"Current average",
    lblTotal:"Total courses in degree",lblTmin:"Target from",lblTmax:"Target to",
    saveDetails:"Save details",
    exName:"Exam name",exSem:"sem",labelPh:"Label (e.g. September 2026)",yearPh:"year",
    removeExam:"Remove exam",removeSess:"Remove session",
    exportB:"↓ Export data",importB:"↑ Import data",resetB:"Reset all",
    resetConfirm:"Reset everything back to the default setup? Grades, prep ticks and any pool edits will be lost.",
    badImport:"That file doesn't look like an exam-tracker export.",
    saves:"Progress saves automatically",savesLocal:"Progress saves on this device",
    savesMem:"Session only — use Export to keep your data",
    navOverview:"Overview",navExams:"Exams",navCal:"Calendar",navStats:"Insights",navSet:"Set up",
    icsSummary:"Exam: ",
    knW:"ECTS-weighted average <b>{x}</b>",
    trendH:"Average over time",
    lblEcts:"ECTS completed",lblAvgW:"Weighted average (optional)",ectsPh:"ECTS",
    shareB:"📤 Share backup",startPoint:"start",
    lblUniEmail:"Uni email",lblUniId:"Student ID",lblYear:"Year of studies",lblSpec:"Specialization",
    phUniEmail:"name.surname@ubt-uni.net",phUniId:"e.g. 22-123-456",
    specNone:"— not chosen yet",yearOpt:"Year {n}",
    specPanelH:"Year-3 curriculum — {s}",
    specPanelSub:"Tick what you'll take and add it straight to your exam pool. Electives: pick 1 of the 2 per semester.",
    addSel:"Add selected to exam pool",inPool:"already in the pool",
    kOblig:"obligatory",kSpec:"specialization",kElect:"elective — 1 of 2",
    navMore:"More",
    tabsSum:"Bottom bar (phone) — pick your tabs",
    tabsHint:"Tick up to 4 tabs to keep in the bar; everything else waits under “More”.",
    navSched:"Schedule",schedH:"University schedule",
    schedHint:"works offline — it always knows where you are in the week",
    nowPill:"Now",nextPill:"Next",
    endsIn:"ends in {x}",inX:"in {x}",noClassNow:"No class right now",
    noSched:"No schedule yet — add your classes once the timetable is out, and this tab will always show where you should be.",
    addSchedCta:"Add your classes",
    editSched:"Edit schedule — day, time, subject, room",
    addClass:"+ Add class",saveSched:"Save schedule",
    phSubject:"Subject",phRoom:"room (optional)",
    navDue:"Due",dueH:"Work due",
    dueHint:"projects, homework and labs — with who you're doing them with",
    noDue:"Nothing due 🌤 — add a project or homework and it shows up here with a countdown.",
    addWorkCta:"Add work",addWork:"Add work — title, type, subject, deadline, people",
    lblTitle:"Title",phTitle:"e.g. Big Data group project",
    lblType:"Type",lblSubject:"Subject",lblDueDate:"Due date",lblDueTime:"Time (optional)",
    lblTeam:"People (comma-separated)",phTeam:"e.g. Arta, Blend",
    lblNotes:"Notes / requirements",phNotes:"e.g. report + presentation, upload on Moodle",
    typeHw:"homework",typeProject:"project",typeLab:"lab",typePres:"presentation",typeOther:"other",
    saveWork:"Save work",addToList:"Add to the list",
    dueToday:"due today",dueTomorrow:"due tomorrow",dueInD:"due in {n}d",
    overdueNow:"past due today",overdueD:"overdue {n}d",
    withTeam:"with",editWork:"Edit",deleteWork:"Remove",
    deleteConfirm:"Remove “{name}” for good?",
    markDoneW:"Done",undoW:"Reopen",
    doneListW:"Finished ({n})",
    nextDueLbl:"Next due",moreOpen:"+{n} more open",
    dueIcs:"📅 Add deadlines to calendar",
    generalW:"— general",
    compSum:"Completed courses — what you've already passed",
    compHint:"Name · grade · ECTS (optional). Your starting average, course count and ECTS are computed from these rows.",
    addComp:"+ Add course",saveComp:"Save courses",
    compBadge:"{n} courses · avg {a}",
    fromTranscript:"Course count, average and ECTS are computed from the {n} completed courses above.",
    noBaseYet:"add your finished courses in Set up to start",
    kn0:"Start in Set up: add the courses you've already passed and the exams you still owe — everything else fills in by itself.",
    welcomeLede:"Your private exam planner — everything stays on this device.",
    onboardMsg:"<b>Welcome!</b> This tracker is all yours — nothing you enter leaves this device. Start in <b>Set up</b>: ① add the courses you've already passed, ② add the exams you still have to sit, ③ tick them into a session.",
    onboardCta:"Open Set up",
    footNotes:"Averages assume a simple (unweighted) mean of passed course grades, matching how UBT displays the transcript average — failed sittings don't enter it, the course simply stays in your pool. Exam dates come from the official “Orari i Provimeve — Shtator 2026”; which Dukagjini time window applies depends on the professor, so always confirm your section and campus before each exam. Use Export to back up or move your data between devices."
  },
  sq:{
    eyebrow:"Kolegji UBT · Gjurmuesi i provimeve",
    defaultTitle:"Gjurmuesi i Provimeve",
    setup:"Cilësimet",
    coursesDone:"lëndë të kryera",passedHere:"të kaluara këtu",leftIn:"të mbetura në listë",aiming:"synimi",
    runningAvg:"Mesatarja aktuale",atWater:"në vijën e ujit",above:"mbi",below:"nën",
    sessionProgress:"Ecuria e sesionit",satWord:"të dhëna",prepWord:"përgatitja",
    waterGauge:"Matësi i nivelit",
    passedSession:"të kaluara në sesion",leftPool:"të mbetura në listë",startAvg:"mesatarja fillestare",
    targetBand:"objektivi",nextExam:"provimi i radhës",firstExam:"provimi i parë",lastExam:"provimi i fundit",
    today:"sot",tomorrow:"nesër",inD:"pas {n} ditësh",
    kn1:"Notat kaluese mbi <b>{x}</b> e ngritin mesataren — 5-shi nuk llogaritet, provimi thjesht mbetet në listë",
    kn2:"Tavani i studimeve <b>{x}</b>",kn3:"{n} në pritje me ~9 → <b>{x}</b>",
    sessH:"Sesionet e provimeve",
    sessHint:"pika e gjelbër tregon ku është “tani” — notat llogariten në mesatare nga çdo sesion",
    nowTitle:"afati aktual",
    nothingPlanned:"asgjë e planifikuar",allPassed:"të gjitha {n} të kaluara",ofPassed:"{a} nga {b} të kaluara",
    yourExams:"Provimet e tua — ",dukagjini:"cili orar i Dukagjinit vlen varet nga profesori",
    whatif:"🎲 Modaliteti 'po sikur'",whatifOn:"✕ Dil nga 'po sikur'",
    whatifBanner:"Provë — notat që i prek tani janë sa për të parë dhe nuk ruhen.",
    addExams:"Shto provime në këtë sesion",toPick:"{n} për të zgjedhur",poolClear:"lista është e pastër",
    poolClearMsg:"Gjithçka në listë është kaluar 🎉 — shto lëndë te <b>Cilësimet → Lista e provimeve</b>.",
    pickSub:"Zgjidhi provimet nga lista më lart — asgjë nuk rishkruhet. Kalimi i provimit (nota 6+) e heq nga lista kudo; 5-shi e mban aty me shenjën <b>rimarrje</b>.",
    retake:"rimarrje",alsoIn:"edhe në ",
    noneFor:"Asgjë e planifikuar për <b>{s}</b> ende.",noneSub:"Zgjidhi provimet nga lista — pa rishkruar asgjë.",
    pickCta:"Zgjidh provimet për këtë sesion",
    markSat:"Shëno si të dhënë",satIt:"I dhënë",grade:"Nota",timeDash:"ora —",noDate:"data s'është caktuar",
    tapClear:"Prek prapë për ta pastruar",removeFrom:"Hiqe nga ky sesion",
    removeConfirm:"“{name}” ka notë të shënuar. Ta heq nga {sess}? Nota ruhet.",
    noGrade:"ende pa notë",attemptUp:"ende pa notë — prova e {n} në radhë",
    failedStays:"✗ dështoi{x} — mbetet në listë për rimarrje",
    lifts:"↑ e ngrit mesataren",dips:"↓ e ul mesataren",holds:"· e mban nivelin",
    passedTry:" · kaluar në provën e {n}",alreadyPassed:"✓ kaluar tashmë",inWord:" në ",
    prepNotes:"shënimet",prepPapers:"provimet e vjetra",prepMock:"prova gjenerale",
    calHint:"ditët e provimeve marrin ✓ kur shënohet nota",
    legendExam:"provimi yt",legendWknd:"fundjavë",icsBtn:"📅 Shto në kalendarin e telefonit",
    clearedH:"Të kaluara deri tani",clearedSum:"Shfaq {n} të kaluarat",
    thCourse:"Lënda",thGrade:"Nota",thWhere:"Sesioni",thTry:"Prova",
    gpaH:"Referenca e mesatares",
    gpaSub:"Majtas: sa duhet të jetë mesatarja e notave të mbetura për çdo objektiv final. Djathtas: ku të çon sesioni i hapur nëse çdo provim në pritje merr një notë të caktuar. Të dyja rillogariten live.",
    targetCap:"Mesatarja finale e synuar — të gjitha {n} lëndët",needHead:"Duhet në {n} e mbetura",
    thTarget:"Objektivi",thNote:"Shënim",
    noteCeil:"tavani — vetëm 10-ta",noteHold:"mbaje ritmin aktual",noteOver:"e paarritshme",noteTgt:"objektivi yt",
    targetFormula:"Formula: shuma e notave të mbetura duhet të jetë",
    rrCap:"Llogaritësi — {n} në pritje në {s}",
    thIf:"Nëse notat mesatarisht",thNew:"Mesatarja e re",thVs:"ndaj vijës",
    rrFormula:"Baza live: <code>{c}</code> nota kaluese, shuma <code>{s}</code>, mesatarja <code>{a}</code>",
    setupHint:"të kryerat → lista → sesionet → detajet",
    poolSum:"Lista e provimeve — gjithçka që ende s'e ke dhënë",poolBadge:"{n} provime · {m} të hapura",
    poolHint:"Emri · semestri · data si <b>dd.mm.yyyy</b> (e vendos në kalendar). Heqja e provimit këtu fshin edhe notën dhe regjistrimet e tij.",
    addPool:"+ Shto provim",savePool:"Ruaj listën",
    sessSum:"Sesionet e provimeve — afatet rreth të cilave planifikon",
    sessHint2:"Emërtimi · viti · muaji. Sesioni i ruan provimet e zgjedhura kur e ndryshon.",
    addSess:"+ Shto sesion",saveSess:"Ruaj sesionet",
    keepOne:"Mbaj së paku një sesion — shto një rresht së pari.",
    detSum:"Detajet e tua — emri, mesatarja dhe objektivat",
    lblName:"Emri yt",phName:"p.sh. Alex",lblCount:"Lëndë të përfunduara",lblAvg:"Mesatarja aktuale",
    lblTotal:"Gjithsej lëndë në studime",lblTmin:"Objektivi nga",lblTmax:"Objektivi deri",
    saveDetails:"Ruaj detajet",
    exName:"Emri i provimit",exSem:"sem",labelPh:"Emërtimi (p.sh. Shtator 2026)",yearPh:"viti",
    removeExam:"Hiq provimin",removeSess:"Hiq sesionin",
    exportB:"↓ Eksporto",importB:"↑ Importo",resetB:"Rifillo gjithçka",
    resetConfirm:"Ta rikthej gjithçka në fillim? Notat, përgatitja dhe ndryshimet e listës humbin.",
    badImport:"Ky fajll s'duket si eksport i gjurmuesit të provimeve.",
    saves:"Progresi ruhet automatikisht",savesLocal:"Progresi ruhet në këtë pajisje",
    savesMem:"Vetëm për këtë sesion — përdor Eksporto për t'i ruajtur të dhënat",
    navOverview:"Kryesore",navExams:"Provimet",navCal:"Kalendari",navStats:"Analiza",navSet:"Cilësimet",
    icsSummary:"Provim: ",
    knW:"Mesatarja me peshë ECTS <b>{x}</b>",
    trendH:"Mesatarja në kohë",
    lblEcts:"ECTS të përfunduara",lblAvgW:"Mesatarja me peshë (ops.)",ectsPh:"ECTS",
    shareB:"📤 Ndaje kopjen",startPoint:"fillimi",
    lblUniEmail:"Email-i i UBT-së",lblUniId:"ID e studentit",lblYear:"Viti i studimeve",lblSpec:"Specializimi",
    phUniEmail:"emri.mbiemri@ubt-uni.net",phUniId:"p.sh. 22-123-456",
    specNone:"— ende pa zgjedhur",yearOpt:"Viti {n}",
    specPanelH:"Plani i vitit 3 — {s}",
    specPanelSub:"Zgjidh çka do të ndjekësh dhe shtoje direkt në listën e provimeve. Zgjedhoret: 1 nga 2 për semestër.",
    addSel:"Shto të zgjedhurat në listën e provimeve",inPool:"tashmë në listë",
    kOblig:"obligative",kSpec:"specializim",kElect:"zgjedhore — 1 nga 2",
    navMore:"Më shumë",
    tabsSum:"Shiriti i poshtëm (telefon) — zgjidhi skedat",
    tabsHint:"Shëno deri në 4 skeda që rrinë në shirit; të tjerat presin te “Më shumë”.",
    navSched:"Orari",schedH:"Orari i universitetit",
    schedHint:"punon pa internet — e di gjithmonë ku je gjatë javës",
    nowPill:"Tani",nextPill:"Pas",
    endsIn:"mbaron pas {x}",inX:"pas {x}",noClassNow:"S'ka orë tani",
    noSched:"Ende pa orar — shtoji orët kur të dalë orari, dhe kjo pjesë ta tregon gjithmonë ku duhet të jesh.",
    addSchedCta:"Shto orët e tua",
    editSched:"Ndrysho orarin — dita, ora, lënda, salla",
    addClass:"+ Shto orë",saveSched:"Ruaj orarin",
    phSubject:"Lënda",phRoom:"salla (ops.)",
    navDue:"Detyrat",dueH:"Detyrat & projektet",
    dueHint:"projekte, detyra dhe lab-e — bashkë me ekipin",
    noDue:"Asgjë në afat 🌤 — shto një projekt a detyrë dhe shfaqet këtu me numërim mbrapsht.",
    addWorkCta:"Shto detyrë",addWork:"Shto detyrë — titulli, lloji, lënda, afati, njerëzit",
    lblTitle:"Titulli",phTitle:"p.sh. Projekti grupor i Big Data",
    lblType:"Lloji",lblSubject:"Lënda",lblDueDate:"Afati",lblDueTime:"Ora (ops.)",
    lblTeam:"Njerëzit (me presje)",phTeam:"p.sh. Arta, Blend",
    lblNotes:"Shënime / kërkesat",phNotes:"p.sh. raport + prezantim, ngarkohet në Moodle",
    typeHw:"detyrë",typeProject:"projekt",typeLab:"lab",typePres:"prezantim",typeOther:"tjetër",
    saveWork:"Ruaj detyrën",addToList:"Shtoje në listë",
    dueToday:"afati sot",dueTomorrow:"afati nesër",dueInD:"afati pas {n} ditësh",
    overdueNow:"kaloi afati sot",overdueD:"vonuar {n} ditë",
    withTeam:"me",editWork:"Ndrysho",deleteWork:"Hiqe",
    deleteConfirm:"Ta heq “{name}” përgjithmonë?",
    markDoneW:"Kryer",undoW:"Rihape",
    doneListW:"Të kryera ({n})",
    nextDueLbl:"Afati i radhës",moreOpen:"+{n} të tjera hapur",
    dueIcs:"📅 Shto afatet në kalendar",
    generalW:"— e përgjithshme",
    compSum:"Lëndët e përfunduara — çka ke kaluar tashmë",
    compHint:"Emri · nota · ECTS (ops.). Mesatarja fillestare, numri i lëndëve dhe ECTS llogariten nga këto rreshta.",
    addComp:"+ Shto lëndë",saveComp:"Ruaj lëndët",
    compBadge:"{n} lëndë · mes. {a}",
    fromTranscript:"Numri i lëndëve, mesatarja dhe ECTS llogariten nga {n} lëndët e përfunduara më lart.",
    noBaseYet:"shto lëndët e kryera te Cilësimet për të filluar",
    kn0:"Fillo te Cilësimet: shto lëndët që i ke kaluar dhe provimet që t'kanë mbetur — gjithçka tjetër plotësohet vetë.",
    welcomeLede:"Planifikuesi yt privat i provimeve — gjithçka mbetet në këtë pajisje.",
    onboardMsg:"<b>Mirë se erdhe!</b> Ky gjurmues është krejt yti — asgjë që shkruan s'e lëshon këtë pajisje. Fillo te <b>Cilësimet</b>: ① shto lëndët që i ke kaluar, ② shto provimet që t'kanë mbetur, ③ zgjidhi në një sesion.",
    onboardCta:"Hap Cilësimet",
    footNotes:"Mesataret llogariten si mesatare e thjeshtë (pa peshë) e notave kaluese, ashtu si e shfaq UBT-ja në transkriptë — provimet e dështuara nuk hyjnë fare, lënda thjesht mbetet në listë. Datat e provimeve vijnë nga “Orari i Provimeve — Shtator 2026” zyrtar; cili orar i Dukagjinit vlen varet nga profesori, prandaj gjithmonë konfirmoje seksionin dhe kampusin para çdo provimi. Përdor Eksporto për ta ruajtur ose bartur progresin mes pajisjeve."
  }};
  var LANG="en";
  function t(k,vars){
    var s=DICT[LANG][k]!=null?DICT[LANG][k]:(DICT.en[k]!=null?DICT.en[k]:k);
    if(vars)Object.keys(vars).forEach(function(v){s=s.split("{"+v+"}").join(vars[v]);});
    return s;
  }
  /* language-aware ordinal: 2 → "2nd" / "2-të" */
  function ord(n){return LANG==="sq"?(n===1?"1-rë":n+"-të"):nthTry(n);}
  function setLang(l){
    LANG=l==="sq"?"sq":"en";
    LOC.MON=LANG==="sq"?MON_SQ:MON;
    LOC.DOW=LANG==="sq"?DOW_SQ:DOW;
    LOC.MON_FULL=LANG==="sq"?MON_FULL_SQ:MON_FULL;
    LOC.DAYS=LANG==="sq"?DAYS_SQ:DAYS;
    document.documentElement.lang=LANG;
    try{localStorage.setItem("ubt-lang",LANG);}catch(e){}
    var lb=document.getElementById("langBtn");
    if(lb)lb.textContent=LANG==="en"?"SQ":"EN";
    translatePage();
  }
  function translatePage(){
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"),function(el){
      el.textContent=t(el.dataset.i18n);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-html]"),function(el){
      el.innerHTML=t(el.dataset.i18nHtml);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-ph]"),function(el){
      el.placeholder=t(el.dataset.i18nPh);});
  }

  /* ---------- theme ---------- */
  function prefersDark(){
    try{return matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){return false;}
  }
  function effectiveDark(){
    var v=document.documentElement.getAttribute("data-theme");
    return v?v==="dark":prefersDark();
  }
  function applyTheme(v){   /* "dark" | "light" | null (follow system) */
    if(v)document.documentElement.setAttribute("data-theme",v);
    else document.documentElement.removeAttribute("data-theme");
    try{v?localStorage.setItem("ubt-theme",v):localStorage.removeItem("ubt-theme");}catch(e){}
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",effectiveDark()?"#1f1b15":"#f6f1e8");
    var b=document.getElementById("themeBtn");
    if(b)b.innerHTML=effectiveDark()?SUN:MOON;
    var b2=document.getElementById("themeBtn2");
    if(b2)b2.innerHTML=effectiveDark()?SUN:MOON;
  }

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
  var UI={session:null,view:"home"};   /* view state only — never persisted */
  var WHATIF=null;              /* sandbox overlay of results, or null */

  function save(){if(!WHATIF)store.set(K,JSON.stringify(DATA));}
  function R(){return WHATIF?WHATIF.results:DATA.results;}
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
  function sessById(id){
    for(var i=0;i<DATA.sessions.length;i++)
      if(DATA.sessions[i].id===id)return DATA.sessions[i];
    return null;
  }
  /* start a result for (exam, session), carrying history forward: a fail
     logged in ANOTHER session gets frozen into the fails counter */
  function freshResult(ex,sn){
    var r=R()[ex.id];
    var fails=r?(+r.fails||0):0,grade=null,sat=false;
    if(r){
      if(r.sessionId===sn.id){grade=r.grade;sat=!!r.sat;}
      else if(isFailed(r))fails++;
    }
    return {grade:grade,sessionId:sn.id,sat:sat,fails:fails};
  }
  function setResult(id,r){
    if(r.grade==null&&!r.sat&&!r.fails)delete R()[id];
    else R()[id]=r;
  }
  function fdate(ex){return fullDate(ex)||t("noDate");}

  /* ---------- confetti (skipped for reduced-motion users) ---------- */
  function confetti(card){
    try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;}catch(e){}
    var colors=["#c05f3c","#4f7d5c","#d9a441","#7fb6bd","#b4483d","#8a6db1"];
    var rect=card.getBoundingClientRect();
    for(var i=0;i<20;i++){
      var p=document.createElement("i");p.className="confetti";
      p.style.left=(rect.left+rect.width/2)+"px";
      p.style.top=(rect.top+50)+"px";
      p.style.background=colors[i%colors.length];
      p.style.setProperty("--dx",(Math.random()*260-130)+"px");
      p.style.setProperty("--dy",(-(Math.random()*180)-30)+"px");
      p.style.setProperty("--rot",(Math.random()*720-360)+"deg");
      document.body.appendChild(p);
      setTimeout((function(el){return function(){el.remove();};})(p),950);
    }
  }

  /* ---------- build everything (cheap — the app is small) ---------- */
  function buildAll(){
    /* keep collapsibles as the user left them across rebuilds */
    var open={};
    Array.prototype.forEach.call(document.querySelectorAll("details[data-keep]"),function(el){
      open[el.id]=el.open;});
    buildHeader();buildYearBar();buildSessBar();buildExamsHead();buildPicker();buildCards();
    buildCalendar();buildCleared();buildTables();buildSetup();render();buildTrend();
    renderNow();buildSchedList();fillSchedEditor();renderBnav();buildTabsEditor();buildDue();
    Object.keys(open).forEach(function(id){
      var el=document.getElementById(id);if(el)el.open=open[id];});
    var wb=document.getElementById("whatifBtn");
    if(wb)wb.textContent=WHATIF?t("whatifOn"):t("whatif");
  }

  function buildHeader(){
    var p=DATA.profile;
    document.getElementById("hTitle").textContent=
      p.name?p.name+"'s Exam Tracker":t("defaultTitle");
    var blank=!DATA.pool.length&&!DATA.completed.length;
    var left=unfinished(DATA.pool,R()).length;
    var passed=DATA.pool.length-left;
    var parts=[];
    if(SPECS[p.spec])parts.push(SPECS[p.spec].sq);
    if(p.baseCount)parts.push(p.baseCount+" "+t("coursesDone"));
    if(passed)parts.push(passed+" "+t("passedHere"));
    if(DATA.pool.length)parts.push(left+" "+t("leftIn"));
    parts.push(t("aiming")+" "+nice(p.targetMin)+"–"+nice(p.targetMax));
    document.getElementById("hLede").textContent=
      blank?t("welcomeLede"):parts.join(" · ");
    /* first-run guide until anything personal exists */
    var ob=document.getElementById("onboardCard");
    ob.hidden=!blank;
    document.getElementById("stBase").textContent=p.baseCount?n2(p.baseAvg):"–";
    document.getElementById("stTarget").textContent=nice(p.targetMin)+"–"+nice(p.targetMax);
    var span=0.45;
    document.getElementById("wlineLbl").textContent=p.baseCount?n2(p.baseAvg):"–";
    document.getElementById("gaugeScale").textContent=
      p.baseCount?n2(p.baseAvg-span)+" – "+n2(p.baseAvg+span):"";
  }

  function buildYearBar(){
    var years=[];sortSessions(DATA.sessions).forEach(function(sn){
      if(years.indexOf(sn.year)<0)years.push(sn.year);});
    var curYear=cur().year;
    var upSn=sessById(upcomingId());
    var bar=document.getElementById("yearBar");bar.innerHTML="";
    years.forEach(function(y){
      var b=document.createElement("button");b.type="button";
      b.className="ytab"+(y===curYear?" on":"");
      b.innerHTML=esc(y)+(upSn&&upSn.year===y?'<span class="now-dot" title="'+esc(t("nowTitle"))+'"></span>':"");
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
      var done=list.filter(function(en){return isPassed(R()[en.examId]);}).length;
      var b=document.createElement("button");b.type="button";
      b.className="stab"+(sn.id===UI.session?" on":"")+(n&&done===n?" done":"")+(n?"":" empty");
      var meta=!n?t("nothingPlanned"):(done===n?t("allPassed",{n:n}):t("ofPassed",{a:done,b:n}));
      b.innerHTML='<span class="st-l">'+esc(sn.label)
        +(sn.id===up?'<span class="now-dot" title="'+esc(t("nowTitle"))+'"></span>':"")+'</span>'
        +'<span class="st-m">'+esc(meta)+'</span>';
      b.addEventListener("click",function(){UI.session=sn.id;buildAll();});
      bar.appendChild(b);
    });
  }

  function buildExamsHead(){
    var sn=cur();
    document.getElementById("examHead").textContent=t("yourExams")+sn.label;
    var ex=sessionExams(sn);
    /* countdown to the nearest upcoming ungraded exam in this session */
    var today=new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate());
    var next=null;
    ex.forEach(function(it){
      if(next)return;
      var d=parseDMY(it.ex.date),r=R()[it.ex.id];
      if(d&&d>=today&&!(r&&r.grade!=null))next={d:d,ex:it.ex};
    });
    var fv=document.getElementById("stFirst"),fl=document.getElementById("stFirstL");
    if(next){
      var days=Math.round((next.d-today)/864e5);
      fv.textContent=dayLabel(next.ex);
      fl.textContent=t("nextExam")+" · "+(days===0?t("today"):days===1?t("tomorrow"):t("inD",{n:days}));
    }else{
      fv.textContent=ex.length?dayLabel(ex[0].ex):"–";
      fl.textContent=t("firstExam");
    }
    document.getElementById("stLast").textContent=ex.length?dayLabel(ex[ex.length-1].ex):"–";
    var segs=document.getElementById("segs");segs.innerHTML="";
    segs.style.gridTemplateColumns="repeat("+Math.max(ex.length,1)+",1fr)";
    ex.forEach(function(){var s=document.createElement("div");s.className="seg";segs.appendChild(s);});
  }

  function buildPicker(){
    var sn=cur(),idx={};(sn.entries||[]).forEach(function(en){idx[en.examId]=true;});
    var open=unfinished(DATA.pool,R()).slice().sort(function(a,b){
      var da=parseDMY(a.date),db_=parseDMY(b.date);
      if(da&&db_)return da-db_; if(da)return -1; if(db_)return 1;
      return a.name.localeCompare(b.name);
    });
    var badge=document.getElementById("pickBadge");
    badge.textContent=open.length?t("toPick",{n:open.length}):t("poolClear");
    var box=document.getElementById("pickList");box.innerHTML="";
    if(!open.length){
      box.innerHTML='<p class="pick-empty">'+t("poolClearMsg")+'</p>';
      return;
    }
    open.forEach(function(ex){
      var row=document.createElement("label");row.className="pick-row";
      var inp=document.createElement("input");inp.type="checkbox";inp.checked=!!idx[ex.id];
      var box2=document.createElement("span");box2.className="box";box2.innerHTML=CHECK;
      var body=document.createElement("span");body.className="pick-body";
      var other=otherSessionOf(ex.id);
      var att=attempts(R()[ex.id]);
      var flags=(att>0?'<span class="retake-badge">'+esc(t("retake"))+(att>1?" ×"+att:"")+'</span>':"")
        +(other?'<span class="pick-note">'+esc(t("alsoIn"))+esc(other.label)+'</span>':"");
      body.innerHTML='<span class="pick-name">'+esc(ex.name)+'</span>'
        +'<span class="pick-meta">'+(ex.sem?'<span class="sem-badge">'+esc(t("exSem"))+' '+esc(ex.sem)+'</span>':"")
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
        +'<p>'+t("noneFor",{s:esc(sn.label)})+'</p>'
        +'<p class="sub2">'+esc(t("noneSub"))+'</p>';
      var cta=document.createElement("button");cta.type="button";
      cta.className="btn primary";cta.textContent=t("pickCta");
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
      x.title=t("removeFrom");x.setAttribute("aria-label",t("removeFrom")+": "+ex.name);
      x.textContent="✕";
      x.addEventListener("click",function(){
        var r=R()[ex.id];
        if(r&&r.grade!=null&&!confirm(t("removeConfirm",{name:ex.name,sess:sn.label})))return;
        sn.entries=sn.entries.filter(function(e2){return e2.examId!==ex.id;});
        save();buildAll();
      });
      card.appendChild(x);

      var head=document.createElement("div");head.className="exam-head";
      var nm=document.createElement("div");nm.className="exam-info";
      nm.innerHTML='<div class="t">'+esc(ex.name)+'</div>'
        +'<div class="d">'+esc(fdate(ex))
        +(ex.sem?' <span class="sem-badge">'+esc(t("exSem"))+' '+esc(ex.sem)+'</span>':"")
        +'<span class="retake-badge" id="rt-'+ex.id+'" hidden></span></div>';
      var db=document.createElement("button");db.type="button";
      db.className="done-btn";db.id="done-"+ex.id;db.setAttribute("aria-pressed","false");
      db.addEventListener("click",function(){
        var r=R()[ex.id];
        var was=!!(r&&r.sessionId===sn.id&&r.sat);
        var r2=freshResult(ex,sn);
        r2.sat=!was;
        setResult(ex.id,r2);
        save();buildAll();
      });
      head.appendChild(nm);head.appendChild(db);

      var meta=document.createElement("div");meta.className="slot-row";
      var sl=document.createElement("select");sl.className="slot";
      sl.setAttribute("aria-label",ex.name);
      var opts=SLOTS.slice();
      if(en.slot&&opts.indexOf(en.slot)<0)opts.push(en.slot);
      opts.forEach(function(s){
        var o=document.createElement("option");o.value=s;o.textContent=s||t("timeDash");
        if(s===en.slot)o.selected=true;sl.appendChild(o);});
      sl.addEventListener("change",function(){en.slot=sl.value;save();});
      meta.appendChild(sl);

      var gr=document.createElement("div");gr.className="g-row";
      var lab=document.createElement("span");lab.className="g-label";lab.textContent=t("grade");
      var gp=document.createElement("div");gp.className="g-pills";gp.id="gp-"+ex.id;
      gp.setAttribute("role","group");gp.setAttribute("aria-label",t("grade")+": "+ex.name);
      [5,6,7,8,9,10].forEach(function(g){
        var pb=document.createElement("button");pb.type="button";
        pb.className="gpill";pb.dataset.g=String(g);pb.textContent=g;
        pb.title=t("tapClear");
        pb.addEventListener("click",function(){
          var r=R()[ex.id];
          var wasPassed=isPassed(r);
          var same=!!(r&&r.sessionId===sn.id&&r.grade===g);
          var r2=freshResult(ex,sn);
          if(same)r2.grade=null;          /* tap again to clear (same session only) */
          else{r2.grade=g;r2.sat=true;}
          setResult(ex.id,r2);
          save();buildAll();
          if(!WHATIF&&!same&&g>=6&&!wasPassed){
            var el=document.getElementById("card-"+ex.id);
            if(el)confetti(el);
          }
        });
        gp.appendChild(pb);
      });
      gr.appendChild(lab);gr.appendChild(gp);

      var contrib=document.createElement("div");contrib.className="contrib none";
      contrib.id="contrib-"+ex.id;contrib.textContent=t("noGrade");

      var prep=document.createElement("div");prep.className="prep";
      var pr=ensurePrep(ex.id);
      [["notes","prepNotes"],["papers","prepPapers"],["mock","prepMock"]].forEach(function(kv){
        prep.appendChild(makeCheck(ex.id+"-"+kv[0],t(kv[1]),function(v){
          ensurePrep(ex.id)[kv[0]]=v;save();render();},pr[kv[0]]));});
      var pc=document.createElement("span");pc.className="prep-count";pc.id="pc-"+ex.id;
      prep.appendChild(pc);

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
    document.getElementById("calHead").textContent=sn.label;
    if(!months.length)return;

    months.forEach(function(mo){
      var block=document.createElement("div");
      if(months.length>1){
        var h=document.createElement("div");h.className="cal-month-h";
        h.textContent=LOC.MON[mo.m-1]+" "+mo.y;block.appendChild(h);
      }
      var grid=document.createElement("div");grid.className="cal-grid";
      var hd=LANG==="sq"?["Hën","Mar","Mër","Enj","Pre","Sht","Die"]
                        :["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      hd.forEach(function(h2){
        var c=document.createElement("div");c.className="cal-h";c.textContent=h2;grid.appendChild(c);});
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

  /* ---------- trend sparkline ---------- */
  function buildTrend(){
    var card=document.getElementById("trendCard");
    var pts=trendPoints(DATA.profile,DATA.pool,R(),DATA.sessions);
    if(pts.length<2){card.hidden=true;return;}
    card.hidden=false;
    var svg=document.getElementById("trendSvg");
    var W=Math.max(svg.clientWidth||card.clientWidth-36,280),H=64,PAD=9,PL=8,PR=8;
    var base=DATA.profile.baseAvg;
    var vals=pts.map(function(p){return p.avg;}).concat([base]);
    var lo=Math.min.apply(null,vals)-0.04,hi=Math.max.apply(null,vals)+0.04;
    if(hi-lo<0.16){var mid=(hi+lo)/2;lo=mid-0.08;hi=mid+0.08;}
    function X(i){return PL+(W-PL-PR)*(i/(pts.length-1));}
    function Y(v){return PAD+(H-2*PAD)*(1-(v-lo)/(hi-lo));}
    var line=pts.map(function(p,i){
      return (i?"L":"M")+X(i).toFixed(1)+" "+Y(p.avg).toFixed(1);}).join("");
    var out='<line x1="0" x2="'+W+'" y1="'+Y(base).toFixed(1)+'" y2="'+Y(base).toFixed(1)
      +'" stroke="var(--faint)" stroke-dasharray="3 4" stroke-width="1" opacity=".7"/>';
    out+='<path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function(p,i){
      var col=p.avg>base+1e-9?"var(--good)":p.avg<base-1e-9?"var(--bad)":"var(--accent)";
      out+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.avg).toFixed(1)+'" r="'+(i===pts.length-1?4:3)
        +'" fill="'+col+'" stroke="var(--surface)" stroke-width="2"/>';
    });
    /* larger invisible hit targets carry the tooltips */
    pts.forEach(function(p,i){
      out+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.avg).toFixed(1)
        +'" r="11" fill="transparent"><title>'
        +esc((p.name?p.name+" · "+p.g+" → ":t("startPoint")+" ")+n2(p.avg))
        +'</title></circle>';
    });
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
    svg.setAttribute("height",H);
    svg.innerHTML=out;
    document.getElementById("trendDelta").textContent=
      n2(pts[0].avg)+" → "+n2(pts[pts.length-1].avg);
  }
  var trendRsz;
  window.addEventListener("resize",function(){
    clearTimeout(trendRsz);trendRsz=setTimeout(buildTrend,150);});

  /* ---------- cleared history ---------- */
  function buildCleared(){
    var res=R();
    var passed=DATA.pool.filter(function(ex){return isPassed(res[ex.id]);});
    var sec=document.getElementById("clearedSection");
    sec.hidden=!passed.length;
    if(!passed.length)return;
    document.getElementById("clearedLabel").textContent=t("clearedSum",{n:passed.length});
    var sum=0;passed.forEach(function(ex){sum+=res[ex.id].grade;});
    document.getElementById("clearedBadge").textContent=
      passed.length+" ✓ · "+t("thGrade").toLowerCase()+" ~"+n2(sum/passed.length);
    ["chCourse","chGrade","chWhere","chTry"].forEach(function(id,i){
      document.getElementById(id).textContent=t(["thCourse","thGrade","thWhere","thTry"][i]);});
    var tb=document.getElementById("clearedBody");tb.innerHTML="";
    passed.sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(ex){
      var r=res[ex.id],where=sessById(r.sessionId);
      var tr=document.createElement("tr");
      tr.innerHTML='<td>'+esc(ex.name)+'</td><td class="mono r">'+r.grade+'</td>'
        +'<td>'+esc(where?where.label:"–")+'</td>'
        +'<td>'+esc(ord((r.fails||0)+1))+(r.fails?' <span class="retake-badge">×'+r.fails+'</span>':"")+'</td>';
      tb.appendChild(tr);
    });
  }

  function buildTables(){
    var p=DATA.profile;
    var tt=targetRows(p);
    document.getElementById("targetCap").textContent=t("targetCap",{n:p.totalCourses});
    document.getElementById("needHead").textContent=t("needHead",{n:Math.max(tt.rem,0)});
    document.getElementById("thTarget").textContent=t("thTarget");
    document.getElementById("thNote").textContent=t("thNote");
    document.getElementById("thIf").textContent=t("thIf");
    document.getElementById("thNew").textContent=t("thNew");
    document.getElementById("thVs").textContent=t("thVs");
    var NOTE={ceil:"noteCeil",hold:"noteHold",over:"noteOver",tgt:"noteTgt"};
    var tb=document.getElementById("targetBody");tb.innerHTML="";
    tt.rows.forEach(function(r){
      var tr=document.createElement("tr");if(r.hl)tr.className="hl";
      tr.innerHTML='<td class="mono">'+r.target+'</td><td class="mono r">'+r.needDisp
        +(r.over?'<span style="color:var(--bad)">+</span>':"")+'</td><td>'
        +esc(r.kind?t(NOTE[r.kind]):"")+'</td>';
      tb.appendChild(tr);
    });
    document.getElementById("targetFormula").innerHTML=
      esc(t("targetFormula"))+' <code>'+p.totalCourses+' × '+t("thTarget").toLowerCase()
      +' − '+nice(tt.bs)+'</code>';

    var sn=cur(),run=running(p,R());
    var pending=(sn.entries||[]).filter(function(en){
      var r=R()[en.examId];return !r||r.grade==null;}).length;
    document.getElementById("rrCap").textContent=t("rrCap",{n:pending,s:sn.label});
    var rb=document.getElementById("rrBody");rb.innerHTML="";
    reckonerRows(run,pending,p.baseAvg).forEach(function(r){
      var tr=document.createElement("tr");if(r.g===9)tr.className="hl";
      tr.innerHTML='<td class="mono">'+r.g+'</td><td class="mono r">'+n2(r.avg)+'</td>'
        +'<td style="color:'+(r.delta>=0?"var(--good)":"var(--bad)")+'">'
        +(r.delta>=0?"▲ +":"▼ −")+Math.abs(r.delta).toFixed(2)+'</td>';
      rb.appendChild(tr);
    });
    document.getElementById("rrFormula").innerHTML=
      t("rrFormula",{c:run.count,s:nice(run.sum),a:n2(run.avg)});
  }

  /* ---------- render (live values that don't need a rebuild) ---------- */
  function render(){
    var p=DATA.profile,run=running(p,R());
    var base=p.baseAvg,span=0.45,avg=run.avg;
    var val=document.getElementById("avgVal");
    var d=document.getElementById("avgDelta");
    var water=document.getElementById("water");
    if(run.count===0){
      /* nothing to average yet — calm empty state instead of a red 0.00 */
      val.textContent="–";val.style.color="var(--ink)";
      d.textContent=t("noBaseYet");d.style.color="var(--muted)";
      water.style.height="8%";
      water.style.background="linear-gradient(180deg,#7fb6bd,#4f8b94)";
    }else{
      var pct=Math.max(0,Math.min(1,(avg-(base-span))/(2*span)))*100;
      water.style.height=pct+"%";
      var above=avg>base+1e-9,below=avg<base-1e-9;
      water.style.background=above?"linear-gradient(180deg,#8fc49a,#4f7d5c)"
        :below?"linear-gradient(180deg,#dc9484,#b4483d)"
        :"linear-gradient(180deg,#7fb6bd,#4f8b94)";
      val.textContent=n2(avg);
      val.style.color=above?"var(--good)":below?"var(--bad)":"var(--ink)";
      var diff=avg-base;
      if(Math.abs(diff)<1e-9){d.textContent=t("atWater");d.style.color="var(--muted)";}
      else if(diff>0){d.textContent="▲ +"+diff.toFixed(2)+" "+t("above")+" "+n2(base);d.style.color="var(--good)";}
      else{d.textContent="▼ −"+Math.abs(diff).toFixed(2)+" "+t("below")+" "+n2(base);d.style.color="var(--bad)";}
    }

    var sn=cur(),list=sessionExams(sn);
    var passed=0,sat=0,prepDone=0;
    list.forEach(function(item){
      var r=R()[item.ex.id];
      if(isPassed(r))passed++;
      if(r&&r.sessionId===sn.id&&(r.sat||r.grade!=null))sat++;
      var pr=DATA.prep[item.ex.id]||{};
      prepDone+=(pr.notes?1:0)+(pr.papers?1:0)+(pr.mock?1:0);
    });
    document.getElementById("stCleared").textContent=passed+"/"+list.length;
    document.getElementById("stPool").textContent=unfinished(DATA.pool,R()).length;
    var prepPct=list.length?Math.round(prepDone/(list.length*3)*100):0;
    document.getElementById("progMeta").textContent=
      sat+" / "+list.length+" "+t("satWord")
      +(list.length?" · "+t("prepWord")+" "+prepPct+"%":"");
    Array.prototype.forEach.call(document.getElementById("segs").children,function(s,i){
      s.className="seg"+(i<sat?" on":"");});

    var pend=list.filter(function(it){
      var r=R()[it.ex.id];return !r||r.grade==null;}).length;
    var all9=pend?(run.sum+9*pend)/(run.count+pend):run.avg;
    var tt=targetRows(p);
    var wAvg=weightedAvg(p,DATA.pool,R());
    document.getElementById("keynums").innerHTML=
      (run.count===0&&!DATA.pool.length)
      ?'<span>'+t("kn0")+'</span>'
      :'<span>'+t("kn1",{x:n2(base)})+'</span>'
        +'<span>'+t("kn2",{x:n2(tt.ceil)})+'</span>'
        +(pend?'<span>'+t("kn3",{n:pend,x:n2(all9)})+'</span>':"")
        +(wAvg!=null?'<span>'+t("knW",{x:n2(wAvg)})+'</span>':"");

    list.forEach(function(item){
      var ex=item.ex,r=R()[ex.id];
      var here=!!(r&&r.sessionId===sn.id);           /* result belongs to this session */
      var g=here&&r.grade!=null?r.grade:null;        /* grades shown where they were earned */
      var isSat=here&&(r.sat||g!=null);
      var att=attempts(r);
      var card=document.getElementById("card-"+ex.id);
      if(card){
        card.classList.toggle("cleared",isPassed(r));
        card.classList.toggle("failed",here&&isFailed(r));
      }
      var db=document.getElementById("done-"+ex.id);
      if(db){
        db.classList.toggle("is-done",isSat);
        db.setAttribute("aria-pressed",isSat?"true":"false");
        db.innerHTML=(isSat?CHECK_BTN:"")+"<span>"+esc(isSat?t("satIt"):t("markSat"))+"</span>";
      }
      var rt=document.getElementById("rt-"+ex.id);
      if(rt){
        rt.hidden=!(att>0&&!isPassed(r));
        rt.textContent=t("retake")+(att>1?" ×"+att:"");
      }
      var gp=document.getElementById("gp-"+ex.id);
      if(gp)Array.prototype.forEach.call(gp.children,function(pb){
        pb.classList.toggle("sel",g!=null&&String(g)===pb.dataset.g);});
      var cd=document.getElementById("cal-"+ex.id);
      if(cd)cd.classList.toggle("done",g!=null);
      var pr=DATA.prep[ex.id]||{};
      var pn=(pr.notes?1:0)+(pr.papers?1:0)+(pr.mock?1:0);
      var pc=document.getElementById("pc-"+ex.id);
      if(pc){pc.textContent=pn+"/3";pc.classList.toggle("full",pn===3);}
      var c=document.getElementById("contrib-"+ex.id);
      if(!c)return;
      var tryNote=(r&&(+r.fails||0)>0&&isPassed(r))?t("passedTry",{n:ord(r.fails+1)}):"";
      if(isPassed(r)&&!here){
        var where=sessById(r.sessionId);
        c.className="contrib up";
        c.textContent=t("alreadyPassed")+(where?t("inWord")+where.label:"")+tryNote;
      }
      else if(g==null){
        c.className="contrib none";
        c.textContent=att>0?t("attemptUp",{n:ord(att+1)}):t("noGrade");
      }
      else if(g<6){c.className="contrib down";
        c.textContent=t("failedStays",{x:att>1?" ×"+att:""});}
      else if(g>base){c.className="contrib up";c.textContent=t("lifts")+tryNote;}
      else if(g<base){c.className="contrib down";c.textContent=t("dips")+tryNote;}
      else{c.className="contrib none";c.textContent=t("holds")+tryNote;}
    });
  }

  /* ---------- setup editors ---------- */
  function openSetup(){location.hash="#/setup";}
  document.getElementById("customizeBtn").addEventListener("click",openSetup);

  function buildSetup(){
    /* completed-courses editor */
    var cr=document.getElementById("compRows");cr.innerHTML="";
    DATA.completed.forEach(function(c){cr.appendChild(compRow(c));});
    document.getElementById("compBadge").textContent=DATA.completed.length
      ?t("compBadge",{n:DATA.completed.length,a:n2(DATA.profile.baseAvg)}):"";
    /* pool editor */
    var pr=document.getElementById("poolRows");pr.innerHTML="";
    DATA.pool.forEach(function(ex){pr.appendChild(poolRow(ex));});
    document.getElementById("poolBadge").textContent=
      t("poolBadge",{n:DATA.pool.length,m:unfinished(DATA.pool,R()).length});
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
    document.getElementById("setEcts").value=p.baseEcts||"";
    document.getElementById("setAvgW").value=p.baseAvgW||"";
    /* the transcript, when present, owns the base numbers */
    var derived=!!DATA.completed.length;
    ["setCount","setAvg","setEcts","setAvgW"].forEach(function(id){
      document.getElementById(id).disabled=derived;});
    var dn=document.getElementById("derivedNote");
    dn.hidden=!derived;
    if(derived)dn.textContent=t("fromTranscript",{n:DATA.completed.length});
    document.getElementById("setUniEmail").value=p.uniEmail||"";
    document.getElementById("setUniId").value=p.uniId||"";
    var ys=document.getElementById("setYear");ys.innerHTML="";
    [1,2,3].forEach(function(y){
      var o=document.createElement("option");o.value=y;o.textContent=t("yearOpt",{n:y});
      if((p.year||3)===y)o.selected=true;ys.appendChild(o);});
    var ss=document.getElementById("setSpec");ss.innerHTML="";
    var o0=document.createElement("option");o0.value="";o0.textContent=t("specNone");ss.appendChild(o0);
    Object.keys(SPECS).forEach(function(k){
      var o=document.createElement("option");o.value=k;
      o.textContent=SPECS[k].sq+" · "+SPECS[k].en;
      if(p.spec===k)o.selected=true;ss.appendChild(o);});
    renderSpecPanel();
  }

  /* year-3 curriculum picker: appears when a specialization + year 3 are set */
  function renderSpecPanel(){
    var panel=document.getElementById("specPanel");
    var spec=document.getElementById("setSpec").value;
    var year=+document.getElementById("setYear").value||0;
    if(!spec||year<3||!SPECS[spec]){panel.hidden=true;panel.innerHTML="";return;}
    panel.hidden=false;panel.innerHTML="";
    var h=document.createElement("h4");
    h.innerHTML=t("specPanelH",{s:esc(SPECS[spec].sq)});
    var sub=document.createElement("p");sub.className="set-hint";sub.textContent=t("specPanelSub");
    panel.appendChild(h);panel.appendChild(sub);
    var inPool={};DATA.pool.forEach(function(e){inPool[e.name.trim().toLowerCase()]=true;});
    var KIND={oblig:"kOblig",spec:"kSpec",elect:"kElect"};
    var boxes=[];
    curriculum(spec).forEach(function(it){
      var had=!!inPool[it.name.trim().toLowerCase()];
      var row=document.createElement("label");row.className="pick-row";
      var inp=document.createElement("input");inp.type="checkbox";
      inp.checked=had||it.kind!=="elect";inp.disabled=had;
      var box=document.createElement("span");box.className="box";box.innerHTML=CHECK;
      var body=document.createElement("span");body.className="pick-body";
      body.innerHTML='<span class="pick-name">'+esc(it.name)+'</span>'
        +'<span class="pick-meta"><span class="sem-badge">'+esc(t("exSem"))+' '+it.sem+'</span>'
        +'<span class="pick-note">'+esc(t(KIND[it.kind]))+'</span>'
        +(had?'<span class="pick-date">✓ '+esc(t("inPool"))+'</span>':"")+'</span>';
      row.appendChild(inp);row.appendChild(box);row.appendChild(body);
      panel.appendChild(row);
      if(!had)boxes.push({inp:inp,it:it});
    });
    var act=document.createElement("div");act.className="set-actions";
    var add=document.createElement("button");add.type="button";add.className="btn primary";
    add.textContent=t("addSel");
    add.addEventListener("click",function(){
      boxes.forEach(function(b){
        if(!b.inp.checked)return;
        DATA.pool.push({
          id:"c"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),
          name:b.it.name,sem:b.it.sem,ects:"",date:""});
      });
      /* the picker doubles as the spec/year form — keep those choices */
      DATA.profile.spec=spec;DATA.profile.year=year;
      save();buildAll();
    });
    act.appendChild(add);panel.appendChild(act);
  }
  document.getElementById("setSpec").addEventListener("change",renderSpecPanel);
  document.getElementById("setYear").addEventListener("change",renderSpecPanel);
  function compRow(c){
    var row=document.createElement("div");row.className="exam-row";
    row.dataset.id=c?c.id:("f"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36));
    var n=document.createElement("input");n.className="f-name";n.placeholder=t("exName");
    n.value=c?c.name:"";
    var g=document.createElement("select");g.className="mon f-grade";
    [6,7,8,9,10].forEach(function(gr){
      var o=document.createElement("option");o.value=gr;o.textContent=gr;
      if(c&&c.grade===gr)o.selected=true;g.appendChild(o);});
    var ec=document.createElement("input");ec.className="f-sem";ec.type="number";ec.min=1;ec.max=30;
    ec.placeholder=t("ectsPh");if(c&&c.ects)ec.value=c.ects;
    var x=document.createElement("button");x.type="button";x.textContent="✕";x.title=t("removeExam");
    x.addEventListener("click",function(){row.remove();});
    row.appendChild(n);row.appendChild(g);row.appendChild(ec);row.appendChild(x);
    return row;
  }

  function poolRow(ex){
    var row=document.createElement("div");row.className="exam-row";
    row.dataset.id=ex?ex.id:("x"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36));
    var n=document.createElement("input");n.className="f-name";n.placeholder=t("exName");n.value=ex?ex.name:"";
    var sm=document.createElement("input");sm.className="f-sem";sm.type="number";sm.min=1;sm.max=8;
    sm.placeholder=t("exSem");if(ex&&ex.sem)sm.value=ex.sem;
    var ec=document.createElement("input");ec.className="f-sem";ec.type="number";ec.min=1;ec.max=30;
    ec.placeholder=t("ectsPh");if(ex&&ex.ects)ec.value=ex.ects;
    var dt=document.createElement("input");dt.className="f-date";dt.placeholder="dd.mm.yyyy";
    dt.value=ex&&ex.date?ex.date:"";
    var x=document.createElement("button");x.type="button";x.textContent="✕";x.title=t("removeExam");
    x.addEventListener("click",function(){row.remove();});
    row.appendChild(n);row.appendChild(sm);row.appendChild(ec);row.appendChild(dt);row.appendChild(x);
    return row;
  }
  document.getElementById("addComp").addEventListener("click",function(){
    document.getElementById("compRows").appendChild(compRow(null));});
  document.getElementById("saveComp").addEventListener("click",function(){
    var next=[];
    Array.prototype.forEach.call(document.querySelectorAll("#compRows .exam-row"),function(row){
      var ins=row.querySelectorAll("input");   /* name, ects */
      var name=ins[0].value.trim();if(!name)return;
      next.push({id:row.dataset.id,name:name,
        grade:+row.querySelector("select").value||6,
        ects:ins[1].value?+ins[1].value:""});
    });
    DATA.completed=next;
    deriveBase(DATA);
    if(DATA.profile.totalCourses<DATA.profile.baseCount)
      DATA.profile.totalCourses=DATA.profile.baseCount;
    save();buildAll();
  });
  document.getElementById("onboardBtn").addEventListener("click",function(){
    location.hash="#/setup";
    document.getElementById("compBox").open=true;
  });
  document.getElementById("addPool").addEventListener("click",function(){
    document.getElementById("poolRows").appendChild(poolRow(null));});
  document.getElementById("savePool").addEventListener("click",function(){
    var next=[];
    Array.prototype.forEach.call(document.querySelectorAll("#poolRows .exam-row"),function(row){
      var ins=row.querySelectorAll("input");   /* name, sem, ects, date */
      var name=ins[0].value.trim();if(!name)return;
      next.push({id:row.dataset.id,name:name,
        sem:ins[1].value?+ins[1].value:"",
        ects:ins[2].value?+ins[2].value:"",
        date:ins[3].value.trim()});
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
    var l=document.createElement("input");l.className="f-name";l.placeholder=t("labelPh");
    l.value=sn?sn.label:"";
    var y=document.createElement("input");y.className="f-year";y.type="number";y.min=2020;y.max=2100;
    y.placeholder=t("yearPh");y.value=sn?sn.year:NOW.getFullYear();
    var m=document.createElement("select");m.className="mon";
    LOC.MON_FULL.forEach(function(nm,i){
      var o=document.createElement("option");o.value=i+1;o.textContent=LOC.MON[i];
      if(sn&&sn.month===i+1)o.selected=true;m.appendChild(o);});
    var x=document.createElement("button");x.type="button";x.textContent="✕";x.title=t("removeSess");
    x.addEventListener("click",function(){row.remove();});
    row.appendChild(l);row.appendChild(y);row.appendChild(m);row.appendChild(x);
    return row;
  }
  document.getElementById("addSess").addEventListener("click",function(){
    document.getElementById("sessRows").appendChild(sessRow(null));});
  document.getElementById("saveSess").addEventListener("click",function(){
    var rows=document.querySelectorAll("#sessRows .exam-row");
    if(!rows.length){alert(t("keepOne"));return;}
    var oldById={};DATA.sessions.forEach(function(sn){oldById[sn.id]=sn;});
    var next=[];
    Array.prototype.forEach.call(rows,function(row){
      var year=+row.querySelector(".f-year").value||NOW.getFullYear();
      var month=+row.querySelector("select.mon").value||1;
      var label=row.querySelector(".f-name").value.trim()||LOC.MON_FULL[month-1]+" "+year;
      var old=oldById[row.dataset.id];
      next.push({id:row.dataset.id,label:label,year:year,month:month,
        entries:old?old.entries:[]});
    });
    if(!next.length){alert(t("keepOne"));return;}
    DATA.sessions=next;
    if(!next.some(function(sn){return sn.id===UI.session;}))
      UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
    save();buildAll();
  });

  document.getElementById("saveDetails").addEventListener("click",function(){
    var p=DATA.profile;
    p.name=document.getElementById("setName").value.trim();
    if(!DATA.completed.length){   /* manual base only while no transcript */
      p.baseCount=Math.max(0,parseInt(document.getElementById("setCount").value,10)||0);
      p.baseAvg=Math.min(10,Math.max(0,parseFloat(document.getElementById("setAvg").value)||0));
      p.baseEcts=Math.max(0,parseFloat(document.getElementById("setEcts").value)||0);
      p.baseAvgW=parseFloat(document.getElementById("setAvgW").value)||0;
    }
    p.targetMin=parseFloat(document.getElementById("setTmin").value)||p.baseAvg||8;
    p.targetMax=parseFloat(document.getElementById("setTmax").value)||p.targetMin;
    if(p.targetMax<p.targetMin){var t2=p.targetMin;p.targetMin=p.targetMax;p.targetMax=t2;}
    p.totalCourses=Math.max(p.baseCount,
      parseInt(document.getElementById("setTotal").value,10)||p.baseCount);
    p.uniEmail=document.getElementById("setUniEmail").value.trim();
    p.uniId=document.getElementById("setUniId").value.trim();
    p.year=+document.getElementById("setYear").value||3;
    p.spec=document.getElementById("setSpec").value;
    save();buildAll();
  });

  /* ---------- university schedule (fully offline) ---------- */
  function fmtDur(min){
    if(min<60)return min+" min";
    var h=Math.floor(min/60),m=min%60;
    return h+"h"+(m?" "+m+"m":"");
  }
  function renderNow(){
    var card=document.getElementById("nowCard");
    var sched=DATA.schedule||[];
    if(!sched.length){
      card.innerHTML='<div class="now-empty"><div class="emoji">🕰️</div><p>'+esc(t("noSched"))+'</p></div>';
      var b=document.createElement("button");b.type="button";b.className="btn primary";
      b.textContent=t("addSchedCta");
      b.addEventListener("click",function(){
        var d=document.getElementById("schedBox");d.open=true;
        d.scrollIntoView({behavior:"smooth",block:"center"});});
      card.querySelector(".now-empty").appendChild(b);
      return;
    }
    var r=schedNow(sched,new Date());
    var html="";
    if(r.current){
      var ce=r.current.entry;
      html+='<div class="now-block live"><span class="now-pill on">'+esc(t("nowPill"))+'</span>'
        +'<div class="now-main"><div class="now-name">'+esc(ce.name)+'</div>'
        +'<div class="now-sub">'+esc(ce.start+"–"+(ce.end||"?"))
        +(ce.room?" · "+esc(ce.room):"")
        +' · '+esc(t("endsIn",{x:fmtDur(r.current.endsIn)}))+'</div></div></div>';
    }else{
      html+='<div class="now-block idle"><span class="now-pill">'+esc(t("nowPill"))+'</span>'
        +'<div class="now-main"><div class="now-name idle-name">'+esc(t("noClassNow"))+'</div></div></div>';
    }
    if(r.next){
      var ne=r.next.entry;
      var when=r.next.inMin<1440?t("inX",{x:fmtDur(r.next.inMin)})
        :LOC.DAYS[ne.day-1]+" · "+ne.start;
      html+='<div class="now-block next"><span class="now-pill nx">'+esc(t("nextPill"))+'</span>'
        +'<div class="now-main"><div class="now-name">'+esc(ne.name)+'</div>'
        +'<div class="now-sub">'+esc(ne.start+"–"+(ne.end||"?"))
        +(ne.room?" · "+esc(ne.room):"")+' · '+esc(when)+'</div></div></div>';
    }
    card.innerHTML=html;
  }
  function buildSchedList(){
    var wrap=document.getElementById("schedList");
    var sched=(DATA.schedule||[]).slice().sort(function(a,b){
      return (a.day-b.day)||((toMin(a.start)||0)-(toMin(b.start)||0));});
    wrap.hidden=!sched.length;
    wrap.innerHTML="";
    if(!sched.length)return;
    var now=new Date(),today=((now.getDay()+6)%7)+1;
    var r=schedNow(sched,now);
    for(var d=1;d<=7;d++){
      /* eslint-disable no-loop-func */
      var items=sched.filter(function(en){return en.day===d;});
      if(!items.length)continue;
      var day=document.createElement("div");
      day.className="sched-day"+(d===today?" is-today":"");
      day.innerHTML='<div class="sd-h">'+esc(LOC.DAYS[d-1])
        +(d===today?'<span class="today-pill">'+esc(t("today"))+'</span>':"")+'</div>';
      items.forEach(function(en){
        var live=!!(r.current&&r.current.entry===en);
        var row=document.createElement("div");row.className="sd-row"+(live?" live":"");
        row.innerHTML='<span class="sd-time">'+esc(en.start+"–"+(en.end||"?"))+'</span>'
          +'<span class="sd-name">'+esc(en.name)+'</span>'
          +(en.room?'<span class="sd-room">'+esc(en.room)+'</span>':"")
          +(live?'<span class="live-dot"></span>':"");
        day.appendChild(row);
      });
      wrap.appendChild(day);
    }
  }
  /* keep "now / next" honest while the app sits open */
  setInterval(function(){
    if(!document.hidden){renderNow();buildSchedList();}
  },30000);
  document.addEventListener("visibilitychange",function(){
    if(!document.hidden){renderNow();buildSchedList();}
  });

  function schedRow(en){
    var row=document.createElement("div");row.className="exam-row";
    var day=document.createElement("select");day.className="mon f-day7";
    LOC.DAYS.forEach(function(nm,i){
      var o=document.createElement("option");o.value=i+1;o.textContent=nm;
      if(en&&en.day===i+1)o.selected=true;day.appendChild(o);});
    var st=document.createElement("input");st.type="time";st.className="f-time";
    if(en&&en.start)st.value=en.start;
    var et=document.createElement("input");et.type="time";et.className="f-time";
    if(en&&en.end)et.value=en.end;
    var nm2=document.createElement("input");nm2.className="f-name";
    nm2.placeholder=t("phSubject");if(en)nm2.value=en.name;
    var rm=document.createElement("input");rm.className="f-note";
    rm.placeholder=t("phRoom");if(en&&en.room)rm.value=en.room;
    var x=document.createElement("button");x.type="button";x.textContent="✕";
    x.addEventListener("click",function(){row.remove();});
    row.appendChild(day);row.appendChild(st);row.appendChild(et);
    row.appendChild(nm2);row.appendChild(rm);row.appendChild(x);
    return row;
  }
  function fillSchedEditor(){
    var box=document.getElementById("schedRows");box.innerHTML="";
    (DATA.schedule||[]).slice().sort(function(a,b){
      return (a.day-b.day)||((toMin(a.start)||0)-(toMin(b.start)||0));
    }).forEach(function(en){box.appendChild(schedRow(en));});
  }
  document.getElementById("addSched").addEventListener("click",function(){
    document.getElementById("schedRows").appendChild(schedRow(null));});
  document.getElementById("saveSched").addEventListener("click",function(){
    var next=[];
    Array.prototype.forEach.call(document.querySelectorAll("#schedRows .exam-row"),function(row){
      var day=+row.querySelector("select").value||1;
      var ins=row.querySelectorAll("input");   /* start, end, name, room */
      var name=ins[2].value.trim();
      if(!name||!ins[0].value)return;
      next.push({day:day,start:ins[0].value,end:ins[1].value||"",
        name:name,room:ins[3].value.trim()});
    });
    DATA.schedule=next;
    save();buildAll();
  });

  /* ---------- work due ---------- */
  var editingDue=null;
  function dueTypeLabel(k){
    return t({hw:"typeHw",project:"typeProject",lab:"typeLab",pres:"typePres",other:"typeOther"}[k]||"typeOther");
  }
  function dueChip(o){
    if(!o.when)return {cls:"none",txt:t("noDate")};
    var tm=o.item.time?" · "+o.item.time:"";
    if(o.overdue)return {cls:"down",
      txt:o.days<0?t("overdueD",{n:-o.days}):t("overdueNow")};
    if(o.days===0)return {cls:"down",txt:t("dueToday")+tm};
    if(o.days===1)return {cls:"up",txt:t("dueTomorrow")+tm};
    return {cls:"none",txt:t("dueInD",{n:o.days})};
  }
  function subjectOptions(){
    var seen={},out=[];
    DATA.pool.forEach(function(e){if(!seen[e.name]){seen[e.name]=1;out.push(e.name);}});
    (DATA.schedule||[]).forEach(function(en){if(!seen[en.name]){seen[en.name]=1;out.push(en.name);}});
    return out.sort(function(a,b){return a.localeCompare(b);});
  }
  function isoToDmy(v){  /* input[type=date] value → dd.mm.yyyy */
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");
    return m?m[3]+"."+m[2]+"."+m[1]:"";
  }
  function dmyToIso(v){
    var d=parseDMY(v);
    return d?d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()):"";
  }
  function fillDueForm(it){
    document.getElementById("dwTitle").value=it?it.title:"";
    document.getElementById("dwType").value=it?it.type:"hw";
    var subj=document.getElementById("dwSubject");subj.innerHTML="";
    var o0=document.createElement("option");o0.value="";o0.textContent=t("generalW");subj.appendChild(o0);
    var cur2=it?it.subject:"";var seenCur=false;
    subjectOptions().forEach(function(n){
      var o=document.createElement("option");o.value=n;o.textContent=n;
      if(n===cur2){o.selected=true;seenCur=true;}
      subj.appendChild(o);});
    if(cur2&&!seenCur){
      var ox=document.createElement("option");ox.value=cur2;ox.textContent=cur2;ox.selected=true;
      subj.appendChild(ox);
    }
    document.getElementById("dwDate").value=it?dmyToIso(it.date):"";
    document.getElementById("dwTime").value=it&&it.time?it.time:"";
    document.getElementById("dwTeam").value=it?it.team:"";
    document.getElementById("dwNotes").value=it?it.notes:"";
    document.getElementById("saveWork").textContent=it?t("saveWork"):t("addToList");
  }
  function buildDue(){
    /* type select options (rebuilt for language switches) */
    var ts=document.getElementById("dwType");
    var curType=ts.value||"hw";ts.innerHTML="";
    DUE_TYPES.forEach(function(k){
      var o=document.createElement("option");o.value=k;o.textContent=dueTypeLabel(k);
      if(k===curType)o.selected=true;ts.appendChild(o);});
    if(!editingDue)fillDueForm(null);

    var s=dueSplit(DATA.due,new Date());
    var list=document.getElementById("dueList");list.innerHTML="";
    if(!s.open.length){
      var empty=document.createElement("div");empty.className="card empty-state";
      empty.innerHTML='<div class="emoji">📌</div><p>'+esc(t("noDue"))+'</p>';
      var cta=document.createElement("button");cta.type="button";cta.className="btn primary";
      cta.textContent=t("addWorkCta");
      cta.addEventListener("click",function(){
        var d=document.getElementById("dueBox");d.open=true;
        d.scrollIntoView({behavior:"smooth",block:"center"});});
      empty.appendChild(cta);list.appendChild(empty);
    }
    s.open.forEach(function(o){
      var it=o.item,chip=dueChip(o);
      var card=document.createElement("article");
      card.className="card due-item"+(o.overdue?" overdue":"");
      var head=document.createElement("div");head.className="due-head";
      head.innerHTML='<span class="sem-badge">'+esc(dueTypeLabel(it.type))+'</span>'
        +'<span class="contrib '+chip.cls+'">'+esc(chip.txt)+'</span>';
      var body=document.createElement("div");body.className="due-body";
      body.innerHTML='<div class="t">'+esc(it.title)+'</div>'
        +'<div class="d">'+(o.when?esc(fullDate(it))+(it.time?" · "+esc(it.time):""):esc(t("noDate")))
        +(it.subject?' · '+esc(it.subject):"")+'</div>'
        +(it.team?'<div class="due-team">'+esc(t("withTeam"))+" "
          +it.team.split(",").map(function(p){return '<span class="team-chip">'+esc(p.trim())+'</span>';}).join("")+'</div>':"")
        +(it.notes?'<div class="due-notes">'+esc(it.notes)+'</div>':"");
      var act=document.createElement("div");act.className="due-actions";
      var done=document.createElement("button");done.type="button";done.className="done-btn";
      done.innerHTML=CHECK_BTN+"<span>"+esc(t("markDoneW"))+"</span>";
      done.addEventListener("click",function(){it.done=true;save();buildAll();});
      var ed=document.createElement("button");ed.type="button";ed.className="btn small";
      ed.textContent=t("editWork");
      ed.addEventListener("click",function(){
        editingDue=it.id;fillDueForm(it);
        var d=document.getElementById("dueBox");d.open=true;
        d.scrollIntoView({behavior:"smooth",block:"center"});});
      var del=document.createElement("button");del.type="button";del.className="x-btn";
      del.title=t("deleteWork");del.textContent="✕";
      del.addEventListener("click",function(){
        if(!confirm(t("deleteConfirm",{name:it.title})))return;
        DATA.due=DATA.due.filter(function(x){return x.id!==it.id;});
        if(editingDue===it.id){editingDue=null;fillDueForm(null);}
        save();buildAll();});
      act.appendChild(done);act.appendChild(ed);
      card.appendChild(del);card.appendChild(head);card.appendChild(body);card.appendChild(act);
      list.appendChild(card);
    });

    /* finished list */
    var doneBox=document.getElementById("dueDoneBox");
    doneBox.hidden=!s.done.length;
    document.getElementById("dueDoneLabel").textContent=t("doneListW",{n:s.done.length});
    var db2=document.getElementById("dueDoneList");db2.innerHTML="";
    s.done.forEach(function(it){
      var row=document.createElement("div");row.className="sd-row due-done-row";
      row.innerHTML='<span class="sd-name done-name">'+esc(it.title)+'</span>'
        +(it.subject?'<span class="sd-room">'+esc(it.subject)+'</span>':"");
      var back=document.createElement("button");back.type="button";back.className="btn small";
      back.textContent=t("undoW");
      back.addEventListener("click",function(){it.done=false;save();buildAll();});
      row.appendChild(back);db2.appendChild(row);
    });

    document.getElementById("dueIcsBtn").hidden=
      !s.open.some(function(o){return !!o.when;});

    /* overview strip + nav badge */
    var strip=document.getElementById("dueStrip");
    var first=null;
    s.open.forEach(function(o){if(!first&&o.when)first=o;});
    if(first){
      var chip2=dueChip(first);
      strip.hidden=false;
      strip.innerHTML='<span class="due-pin">📌</span><b>'+esc(t("nextDueLbl"))+':</b> '
        +'<span class="due-strip-t">'+esc(first.item.title)+'</span>'
        +'<span class="contrib '+chip2.cls+'">'+esc(chip2.txt)+'</span>'
        +(s.open.length>1?'<span class="due-more">'+esc(t("moreOpen",{n:s.open.length-1}))+'</span>':"");
    }else{strip.hidden=true;strip.innerHTML="";}
    var soon=s.open.some(function(o){
      return o.when&&(o.overdue||o.when-new Date()<48*3600e3);});
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav="due"] .nav-dot'),
      function(el){el.hidden=!soon;});
    /* when Due isn't pinned, the dot rides on the More button instead */
    var md=document.getElementById("moreDot");
    if(md)md.hidden=!(soon&&getTabs().indexOf("due")<0);
  }
  document.getElementById("saveWork").addEventListener("click",function(){
    var title=document.getElementById("dwTitle").value.trim();
    if(!title)return;
    var it=editingDue?DATA.due.filter(function(x){return x.id===editingDue;})[0]:null;
    if(!it){
      it={id:"w"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),done:false};
      DATA.due.push(it);
    }
    it.title=title;
    it.type=document.getElementById("dwType").value;
    it.subject=document.getElementById("dwSubject").value;
    it.date=isoToDmy(document.getElementById("dwDate").value);
    it.time=document.getElementById("dwTime").value||"";
    it.team=document.getElementById("dwTeam").value.trim();
    it.notes=document.getElementById("dwNotes").value.trim();
    editingDue=null;
    save();buildAll();
    fillDueForm(null);
  });
  document.getElementById("dueStrip").addEventListener("click",function(){
    location.hash="#/due";});
  document.getElementById("dueIcsBtn").addEventListener("click",function(){
    download("deadlines-"+slug(DATA.profile.name)+".ics",
      buildDueICS(DATA.due,t("nextDueLbl")+": "),"text/calendar;charset=utf-8");
  });

  /* ---------- what-if sandbox ---------- */
  document.getElementById("whatifBtn").addEventListener("click",function(){
    WHATIF=WHATIF?null:{results:JSON.parse(JSON.stringify(DATA.results))};
    document.body.classList.toggle("whatif",!!WHATIF);
    buildAll();
  });
  function exitWhatIf(){
    if(!WHATIF)return;
    WHATIF=null;
    document.body.classList.remove("whatif");
  }

  /* ---------- ics / export / import / reset ---------- */
  function download(name,content,type){
    var blob=new Blob([content],{type:type});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},400);
  }
  function slug(s){return String(s||"data").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
  document.getElementById("icsBtn").addEventListener("click",function(){
    var sn=cur();
    download(slug(sn.label)+".ics",
      buildICS(sn,byId(),DATA.results,t("icsSummary")),
      "text/calendar;charset=utf-8");
  });
  document.getElementById("exportBtn").addEventListener("click",function(){
    download("exam-tracker-"+slug(DATA.profile.name)+".json",
      JSON.stringify({app:"ubt-exam-tracker",version:3,data:DATA},null,2),
      "application/json");
  });
  /* share the backup via the OS share sheet where any share support exists;
     if file-sharing is refused, fall back to a plain download so the tap
     always produces the backup */
  (function(){
    var btn=document.getElementById("shareBtn");
    if(!navigator.share)return;   /* desktop browsers keep Export instead */
    btn.hidden=false;
    btn.addEventListener("click",function(){
      var name="exam-tracker-"+slug(DATA.profile.name)+".json";
      var json=JSON.stringify({app:"ubt-exam-tracker",version:3,data:DATA},null,2);
      var file=null;
      try{file=new File([json],name,{type:"application/json"});}catch(e){}
      var fallback=function(){download(name,json,"application/json");};
      if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:"Exam tracker backup"})
          .catch(function(err){if(!err||err.name!=="AbortError")fallback();});
      }else fallback();
    });
  })();
  document.getElementById("importBtn").addEventListener("click",function(){
    document.getElementById("importFile").click();});
  document.getElementById("importFile").addEventListener("change",function(ev){
    var f=ev.target.files&&ev.target.files[0];if(!f)return;
    var rd=new FileReader();
    rd.onload=function(){
      try{
        var next=importAny(JSON.parse(rd.result));
        if(!next)throw new Error("shape");
        exitWhatIf();
        DATA=next;
        UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
        save();buildAll();
      }catch(e){alert(t("badImport"));}
      ev.target.value="";
    };
    rd.readAsText(f);
  });
  document.getElementById("resetBtn").addEventListener("click",function(){
    if(!confirm(t("resetConfirm")))return;
    exitWhatIf();
    DATA=seedData();
    UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
    save();buildAll();
  });

  function setSaveState(){
    var dot=document.getElementById("saveDot"),txt=document.getElementById("saveText");
    var m=store.mode();
    if(m==="claude"){dot.className="dot";txt.textContent=t("saves");}
    else if(m==="local"){dot.className="dot";txt.textContent=t("savesLocal");}
    else{dot.className="dot off";txt.textContent=t("savesMem");}
    document.getElementById("footNotes").textContent=t("footNotes");
  }

  /* ---------- theme & language toggles (header + More sheet) ---------- */
  function toggleTheme(){applyTheme(effectiveDark()?"light":"dark");}
  function toggleLang(){
    setLang(LANG==="en"?"sq":"en");
    setSaveState();buildAll();route();
  }
  document.getElementById("themeBtn").addEventListener("click",toggleTheme);
  document.getElementById("langBtn").addEventListener("click",toggleLang);
  document.getElementById("themeBtn2").addEventListener("click",toggleTheme);
  document.getElementById("langBtn2").addEventListener("click",toggleLang);

  /* ---------- customizable bottom bar + "More" sheet ---------- */
  var NAV_ICONS={
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/></svg>',
    exams:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
    due:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 5h12.5l-2.6 4 2.6 4H5"/></svg>',
    sched:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20v-8M12 20V5M19 20v-5"/></svg>',
    setup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.4" fill="var(--surface)"/><circle cx="15" cy="12" r="2.4" fill="var(--surface)"/><circle cx="8" cy="17" r="2.4" fill="var(--surface)"/></svg>'
  };
  var NAV_DEF=[
    {k:"home",l:"navOverview"},{k:"exams",l:"navExams"},{k:"due",l:"navDue"},
    {k:"sched",l:"navSched"},{k:"stats",l:"navStats"},{k:"setup",l:"navSet"}];
  var MORE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"/></svg>';
  var DEFAULT_TABS=["home","exams","due","sched"];
  function getTabs(){
    try{
      var v=JSON.parse(localStorage.getItem("ubt-tabs")||"null");
      if(Array.isArray(v)){
        v=v.filter(function(k){return VIEW_KEYS.indexOf(k)>=0;});
        return v.slice(0,4);
      }
    }catch(e){}
    return DEFAULT_TABS.slice();
  }
  function setTabsPref(list){
    try{localStorage.setItem("ubt-tabs",JSON.stringify(list));}catch(e){}
  }
  function openSheet(){document.getElementById("moreBackdrop").hidden=false;}
  function closeSheet(){document.getElementById("moreBackdrop").hidden=true;}
  document.getElementById("moreBackdrop").addEventListener("click",function(ev){
    if(ev.target===this)closeSheet();
  });
  function renderBnav(){
    var pinned=getTabs();
    var bar=document.getElementById("bnav");bar.innerHTML="";
    NAV_DEF.forEach(function(d){
      if(pinned.indexOf(d.k)<0)return;
      var a=document.createElement("a");
      a.href="#/"+d.k;a.dataset.nav=d.k;
      a.className=UI.view===d.k?"on":"";
      a.innerHTML=NAV_ICONS[d.k]+'<span>'+esc(t(d.l))+'</span>'
        +(d.k==="due"?'<span class="nav-dot" hidden></span>':"");
      bar.appendChild(a);
    });
    var more=document.createElement("button");more.type="button";more.id="moreBtn";
    more.className=pinned.indexOf(UI.view)<0?"on":"";
    more.innerHTML=MORE_ICON+'<span>'+esc(t("navMore"))+'</span>'
      +'<span class="nav-dot" id="moreDot" hidden></span>';
    more.addEventListener("click",openSheet);
    bar.appendChild(more);
    /* the sheet lists everything NOT pinned */
    var list=document.getElementById("sheetList");list.innerHTML="";
    NAV_DEF.forEach(function(d){
      if(pinned.indexOf(d.k)>=0)return;
      var a=document.createElement("a");
      a.href="#/"+d.k;a.dataset.nav=d.k;
      a.className="sheet-item"+(UI.view===d.k?" on":"");
      a.innerHTML=NAV_ICONS[d.k]+'<span>'+esc(t(d.l))+'</span>'
        +(d.k==="due"?'<span class="nav-dot" hidden></span>':"");
      list.appendChild(a);
    });
    var lb=document.getElementById("langBtn2");
    if(lb)lb.textContent=LANG==="en"?"SQ":"EN";
    var tb=document.getElementById("themeBtn2");
    if(tb)tb.innerHTML=effectiveDark()?SUN:MOON;
  }
  function buildTabsEditor(){
    var box=document.getElementById("tabRows");box.innerHTML="";
    var pinned=getTabs();
    NAV_DEF.forEach(function(d){
      box.appendChild(makeCheck("tab-"+d.k,t(d.l),function(v){
        var cur=getTabs();
        if(v){
          if(cur.indexOf(d.k)<0){
            if(cur.length>=4){buildTabsEditor();return;}   /* cap reached — revert */
            cur.push(d.k);
          }
        }else cur=cur.filter(function(k){return k!==d.k;});
        /* canonical order, like the full nav */
        cur=NAV_DEF.map(function(x){return x.k;})
          .filter(function(k){return cur.indexOf(k)>=0;});
        setTabsPref(cur);
        renderBnav();buildTabsEditor();buildDue();
      },pinned.indexOf(d.k)>=0));
    });
  }

  /* ---------- hash router: every tab is its own page ---------- */
  var VIEW_KEYS=["home","exams","due","sched","stats","setup"];
  function route(){
    var v=(location.hash||"").replace(/^#\/?/,"");
    if(v==="cal")v="exams";   /* legacy link — calendar lives on the exams page */
    if(VIEW_KEYS.indexOf(v)<0)v="home";
    UI.view=v;
    document.body.dataset.view=v;
    /* the mobile header shows the current page's name on sub-pages */
    var NAVKEY={home:"navOverview",exams:"navExams",due:"navDue",
                sched:"navSched",stats:"navStats",setup:"navSet"};
    document.getElementById("pageTitle").textContent=t(NAVKEY[v]);
    Array.prototype.forEach.call(document.querySelectorAll("[data-view]"),function(el){
      el.classList.toggle("view-off",el.dataset.view!==v);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"),function(a){
      a.classList.toggle("on",a.dataset.nav===v);});
    var mb=document.getElementById("moreBtn");
    if(mb)mb.classList.toggle("on",getTabs().indexOf(v)<0);
    closeSheet();
    /* things that size or tick against the live page */
    if(v==="home")buildTrend();
    if(v==="sched"){renderNow();buildSchedList();}
    window.scrollTo(0,0);
  }
  window.addEventListener("hashchange",route);

  /* ---------- init ---------- */
  function init(){
    var lang="en";
    try{
      lang=localStorage.getItem("ubt-lang")
        ||((navigator.language||"").slice(0,2)==="sq"?"sq":"en");
    }catch(e){}
    setLang(lang);
    var theme=null;
    try{theme=localStorage.getItem("ubt-theme");}catch(e){}
    applyTheme(theme);
    try{
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){
        if(!document.documentElement.getAttribute("data-theme"))applyTheme(null);
      });
    }catch(e){}
    setSaveState();
    store.get(K).then(function(v){
      if(v){try{DATA=normalise(JSON.parse(v));}catch(e){DATA=seedData();}}
      UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
      buildAll();route();
    }).catch(function(){
      UI.session=autoSelect(DATA.sessions,DATA.pool,NOW);
      buildAll();route();
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
