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
  /* electives (lëndët zgjedhore) are deliberately NOT listed — every
     student picks different ones, so those are added manually */
  var COMMON={
    s5:["Bazat e Inteligjencës Artificiale","Sistemet e Ndërlidhura","Menaxhimi i Projekteve dhe Ndërmarrësia"],
    s6:["Cloud Computing","Lënda Laboratorike 2 – Projekt Grupor","Tema e Diplomës (Bachelor Thesis)"]
  };
  /* ECTS per year-3 subject (official curriculum structure);
     specialization stream courses are 5 ECTS each */
  var Y3_ECTS={
    "Bazat e Inteligjencës Artificiale":5,"Sistemet e Ndërlidhura":5,
    "Menaxhimi i Projekteve dhe Ndërmarrësia":5,
    "Cloud Computing":4,"Lënda Laboratorike 2 – Projekt Grupor":5,
    "Tema e Diplomës (Bachelor Thesis)":8,
    "Infrastruktura e Serverëve":5,"Interneti i Gjërave (IoT)":5,
    "Orientimi në Karrierë, Komunikim dhe Zhvillim":3,"Programimi i Lojërave":3
  };
  /* every year-3 subject, tagged by kind; spec streams only when chosen */
  function curriculum(k){
    var sp=SPECS[k]||null;
    var out=[];
    function push(n,sem,kind){out.push({name:n,sem:sem,kind:kind,ects:Y3_ECTS[n]||5});}
    COMMON.s5.forEach(function(n){push(n,5,"oblig");});
    if(sp)sp.s5.forEach(function(n){push(n,5,"spec");});
    COMMON.s6.forEach(function(n){push(n,6,"oblig");});
    if(sp)sp.s6.forEach(function(n){push(n,6,"spec");});
    return out;
  }

  /* full CSE bachelor plan, years 1–2 — verified against the official
     "Struktura e Programit" (ubt-uni.net) and the student's subject lists.
     Each semester's obligatives total exactly 30 ECTS. */
  var CSE_Y12=[
    {name:"Hyrje në Shkenca Kompjuterike dhe Programim",sem:1,ects:5},
    {name:"Matematikë 1",sem:1,ects:5},
    {name:"Bazat e Inxhinierisë Elektronike / Elektrike",sem:1,ects:6},
    {name:"Arkitektura dhe Organizimi i Kompjuterëve",sem:1,ects:5},
    {name:"Shkrim Akademik dhe Seminar",sem:1,ects:5},
    {name:"Gjuhë Angleze për Inxhinieri",sem:1,ects:4},
    {name:"Shkenca Kompjuterike 1",sem:2,ects:6},
    {name:"Matematikë 2",sem:2,ects:5},
    {name:"Sistemet Operative",sem:2,ects:5},
    {name:"Qarqet Digjitale dhe Sinjalet",sem:2,ects:5},
    {name:"Hyrje në Sigurinë e Informacionit",sem:2,ects:4},
    {name:"Ndërveprimi Kompjuter-Njeri",sem:2,ects:5},
    {name:"Shkenca Kompjuterike 2",sem:3,ects:6},
    {name:"Sistemet e Bazës së të Dhënave",sem:3,ects:5},
    {name:"Rrjeta Kompjuterike dhe Komunikimi",sem:3,ects:5},
    {name:"Hyrje në Algoritme",sem:3,ects:4},
    {name:"Strukturat Diskrete 1 (Matematikë)",sem:3,ects:5},
    {name:"Dizajni dhe Zhvillimi i Uebit",sem:3,ects:5},
    {name:"Bazat e Teknologjive Big Data",sem:4,ects:5},
    {name:"Algoritmet dhe Strukturat e të Dhënave",sem:4,ects:5},
    {name:"Strukturat Diskrete 2 (Probabilitet dhe Modelim)",sem:4,ects:4},
    {name:"Sisteme dhe Sinjale",sem:4,ects:5},
    {name:"Inxhinieria Softuerike",sem:4,ects:5},
    {name:"Lënda Laboratorike 1 (Projekt Grupor)",sem:4,ects:6}
  ];
  /* year-gated CSE curriculum: year 1 → sem 1–2, year 2 → +sem 3–4,
     year 3 → +the year-3 plan (streams once a specialization is chosen) */
  function cseCurriculum(year,spec){
    var out=[];
    CSE_Y12.forEach(function(c){
      if(Math.ceil(c.sem/2)<=year)
        out.push({name:c.name,sem:c.sem,ects:c.ects,kind:c.kind||"oblig"});
    });
    if(year>=3)out=out.concat(curriculum(spec));
    return out;
  }

  /* ---------- universities & their built-in study plans ---------- */
  var UNIS={
    ubt:{label:"Kolegji UBT",majors:[{k:"cse",label:"Shkenca Kompjuterike dhe Inxhinieri"}]},
    aab:{label:"Kolegji AAB",majors:[{k:"csse",label:"Computer Science & Software Engineering"}]}
  };
  /* AAB BSc Computer Science and Software Engineering — from the official
     program page (aab-edu.net), listed per year; semester split follows the
     listed order (each year is 60 ECTS). Alternatives and electives are all
     listed as a menu — students tick only what they actually take. */
  var AAB_CSSE=[
    {name:"Programming Fundamentals",sem:1,ects:8},
    {name:"Mathematics I",sem:1,ects:4},
    {name:"Computer Architecture and Operating Systems",sem:1,ects:8},
    {name:"IT Skills",sem:1,ects:4},
    {name:"English for Computer Science",sem:1,ects:6},
    {name:"Object Oriented Programming",sem:2,ects:8},
    {name:"Web Languages and Technologies",sem:2,ects:6},
    {name:"Databases",sem:2,ects:8},
    {name:"Project Management and Entrepreneurship",sem:2,ects:4},
    {name:"Human-Computer Interaction",sem:2,ects:4},
    {name:"Computer Systems Fundamentals",sem:2,ects:4},
    {name:"Advanced English",sem:2,ects:4},
    {name:"Introduction to Artificial Intelligence",sem:3,ects:4},
    {name:"Computer Networks",sem:3,ects:6},
    {name:"Web Programming",sem:3,ects:8},
    {name:"Algorithms and Data Structures",sem:3,ects:6},
    {name:"Algorithms that Implement on Graphs",sem:3,ects:6},
    {name:"Research Methods",sem:4,ects:6},
    {name:"Software Engineering",sem:4,ects:8},
    {name:"Machine Learning",sem:4,ects:4},
    {name:"Data Science",sem:4,ects:8},
    {name:".NET Programming",sem:4,ects:6},
    {name:"Server Administration",sem:4,ects:4},
    {name:"Cryptography in Information Security",sem:4,ects:4},
    {name:"Advanced Software Engineering",sem:5,ects:6},
    {name:"Graphics and Game Programming",sem:5,ects:6},
    {name:"Cloud Computing",sem:5,ects:6},
    {name:"Project / Internship",sem:5,ects:6},
    {name:"NoSQL Databases",sem:5,ects:4},
    {name:"Virtual & Augmented Reality",sem:5,ects:4},
    {name:"Advanced Database Systems",sem:6,ects:6},
    {name:"Data Security",sem:6,ects:6},
    {name:"Mobile Programming",sem:6,ects:4},
    {name:"Diploma Thesis",sem:6,ects:6}
  ];
  function aabCurriculum(year){
    return AAB_CSSE.filter(function(c){return Math.ceil(c.sem/2)<=year;})
      .map(function(c){return {name:c.name,sem:c.sem,ects:c.ects,kind:"oblig"};});
  }
  /* the one entry point: which subjects exist for (uni, major, year, spec) */
  function curricFor(uni,major,year,spec){
    if(uni==="ubt"&&major==="cse")return cseCurriculum(year,spec);
    if(uni==="aab"&&major==="csse")return aabCurriculum(year);
    return [];
  }

  /* tolerant course-name matching, so "Big Data" equals
     "Bazat e Teknologjive Big Data" and definite forms
     ("Sistemet dhe Sinjalet" vs "Sisteme dhe Sinjale") agree */
  function normName(s){
    s=String(s||"").toLowerCase()
      .replace(/\(.*?\)/g," ")
      .replace(/ueb/g,"web")
      .replace(/[^a-z0-9ëç]+/g," ");
    return s.split(" ").filter(Boolean)
      .map(function(w){return w.length>3?w.replace(/t$/,""):w;})
      .join(" ");
  }
  function nameMatch(a,b){
    a=normName(a);b=normName(b);
    if(!a||!b)return false;
    if(a===b)return true;
    if(a.length>=8&&b.indexOf(a)>=0)return true;
    if(b.length>=8&&a.indexOf(b)>=0)return true;
    return false;
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

  /* ECTS banked so far: transcript base + every passed pool exam */
  function earnedEcts(profile,pool,results){
    var sum=+profile.baseEcts||0;
    var byId=poolIndex(pool);
    Object.keys(results||{}).forEach(function(k){
      var r=results[k];if(!isPassed(r))return;
      var ex=byId[k];if(!ex)return;
      sum+=+ex.ects||5;
    });
    return sum;
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
               totalEcts:180,baseEcts:0,baseAvgW:0,uniEmail:"",uniId:"",year:1,spec:"",major:"",uni:""},
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
    ["name","uniEmail","uniId","spec","major","uni"].forEach(function(k){
      if(typeof p[k]!=="string")p[k]=p[k]!=null?String(p[k]):(s[k]||"");});
    if(!SPECS[p.spec])p.spec="";
    /* stored data from before the uni/major fields: CSE implied UBT */
    if(!p.major&&p.spec)p.major="cse";
    if(p.major==="cse"&&!p.uni)p.uni="ubt";
    if(!UNIS[p.uni])p.uni="";
    var okMajors=p.uni?UNIS[p.uni].majors.map(function(m){return m.k;}):[];
    if(okMajors.indexOf(p.major)<0)p.major="";
    if(!(p.uni==="ubt"&&p.major==="cse"))p.spec="";
    ["baseCount","baseAvg","targetMin","targetMax","totalCourses","totalEcts","baseEcts","baseAvgW","year"].forEach(function(k){
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
    weightedAvg:weightedAvg,trendPoints:trendPoints,deriveBase:deriveBase,earnedEcts:earnedEcts,
    SPECS:SPECS,COMMON:COMMON,curriculum:curriculum,
    CSE_Y12:CSE_Y12,cseCurriculum:cseCurriculum,normName:normName,nameMatch:nameMatch,
    UNIS:UNIS,AAB_CSSE:AAB_CSSE,aabCurriculum:aabCurriculum,curricFor:curricFor,
    schedNow:schedNow,toMin:toMin,
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
    kn2:"Degree ceiling <b>{x}</b>",kn3:"{n} pending at ~9 → <b>{x}</b>",knT:"Target band <b>{x}</b>",
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
    setupHint:"details → finished → pool → sessions",
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
    lblMajor:"Major / program",majorNone:"— other program (add subjects manually)",
    lblUni:"University",uniOther:"Other / not listed",
    eyebrowBase:"Exam session tracker",
    wizSetup:"Guided setup",wizWho:"Who are you?",
    wizMajorYear:"Your program and year",
    wizPassedQ:"Which of these have you already passed?",
    wizPassedSub:"Tick the passed ones — everything unticked goes to your exam pool as still-to-sit.",
    wizGrades:"Grades for the passed courses",
    wizManualNote:"There's no built-in plan for this program yet — you'll add your subjects in Set up → Exam pool. Everything else works the same.",
    back:"Back",next:"Next",finish:"Finish",
    aboutNumbers:"How the numbers are counted",
    semLbl:"Semester {n}",
    curricH:"Official study plan — up to year {n}",
    curricSub:"Tick subjects, then send them where they belong: exams you still owe → the pool; exams you've passed → completed courses. Electives (zgjedhore) aren't listed — add yours manually in the exam pool. Semesters stay editable afterwards, so you can move a subject if the plan shifts.",
    toPool:"→ exam pool",toPassed:"→ passed courses",
    inPassed:"✓ already passed",
    gradeNote:"Added with grade 8 as a placeholder — open “Completed courses” and set the real grades.",
    pickSpecFirst:"Choose a specialization above to see the year-3 stream subjects too.",
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
    onboardMsg:"<b>Welcome!</b> This tracker is all yours — nothing you enter leaves this device. Start in <b>Set up</b>: ① choose your major and year, ② add the courses you've already passed, ③ add the exams you still have to sit and tick them into a session.",
    onboardCta:"Open Set up",
    nowClassLbl:"In class",nextClassLbl:"Next class",
    degreeProgress:"Degree progress",lblTotalEcts:"Total ECTS in degree",
    backupNudge:"{n} changes since your last backup — tap to export",
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
    kn2:"Tavani i studimeve <b>{x}</b>",kn3:"{n} në pritje me ~9 → <b>{x}</b>",knT:"Objektivi <b>{x}</b>",
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
    setupHint:"detajet → të kryerat → lista → sesionet",
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
    lblMajor:"Drejtimi / programi",majorNone:"— program tjetër (lëndët shtohen manualisht)",
    lblUni:"Universiteti",uniOther:"Tjetër / s'është në listë",
    eyebrowBase:"Gjurmuesi i provimeve",
    wizSetup:"Konfigurimi hap pas hapi",wizWho:"Kush je ti?",
    wizMajorYear:"Programi dhe viti yt",
    wizPassedQ:"Cilat prej këtyre i ke kaluar tashmë?",
    wizPassedSub:"Shënoji të kaluarat — çka mbetet pa shënuar shkon në listën e provimeve si ende-pa-dhënë.",
    wizGrades:"Notat e lëndëve të kaluara",
    wizManualNote:"S'ka ende plan të gatshëm për këtë program — lëndët i shton te Cilësimet → Lista e provimeve. Gjithçka tjetër punon njëjtë.",
    back:"Prapa",next:"Vazhdo",finish:"Përfundo",
    aboutNumbers:"Si llogariten numrat",
    semLbl:"Semestri {n}",
    curricH:"Plani zyrtar — deri në vitin {n}",
    curricSub:"Shënoji lëndët dhe çoji ku duhet: provimet që t'kanë mbetur → në listë; ato që i ke kaluar → te të përfunduarat. Lëndët zgjedhore s'janë në listë — shtoji vetë në listën e provimeve. Semestrat mbeten të ndryshueshëm më vonë, po lëvizi lëndët nëse ndryshon plani.",
    toPool:"→ lista e provimeve",toPassed:"→ lëndët e kaluara",
    inPassed:"✓ e kaluar tashmë",
    gradeNote:"U shtuan me notën 8 si vendmbajtëse — hape “Lëndët e përfunduara” dhe vendosi notat e vërteta.",
    pickSpecFirst:"Zgjidhe specializimin më lart që të shfaqen edhe lëndët e vitit 3.",
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
    onboardMsg:"<b>Mirë se erdhe!</b> Ky gjurmues është krejt yti — asgjë që shkruan s'e lëshon këtë pajisje. Fillo te <b>Cilësimet</b>: ① zgjidhe drejtimin dhe vitin, ② shto lëndët që i ke kaluar, ③ shto provimet që t'kanë mbetur dhe zgjidhi në një sesion.",
    onboardCta:"Hap Cilësimet",
    nowClassLbl:"Në orë",nextClassLbl:"Ora e radhës",
    degreeProgress:"Progresi i studimeve",lblTotalEcts:"ECTS gjithsej në studime",
    backupNudge:"{n} ndryshime që nga kopja e fundit — prek për ta eksportuar",
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
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-split]"),function(el){
      var s=t(el.dataset.i18nSplit),i=s.indexOf("—");
      var a=i>=0?s.slice(0,i).trim():s,b=i>=0?s.slice(i+1).trim():"";
      el.innerHTML='<span class="sum-t">'+esc(a)+'</span>'
        +(b?'<span class="sum-s">'+esc(b)+'</span>':"");});
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

  /* unbacked-up change counter, device-local — feeds the backup nudge */
  function getDirty(){try{return +localStorage.getItem("ubt-dirty")||0;}catch(e){return 0;}}
  function setDirty(n){try{localStorage.setItem("ubt-dirty",String(n));}catch(e){}}
  function save(){
    if(WHATIF)return;
    store.set(K,JSON.stringify(DATA));
    setDirty(getDirty()+1);
  }
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

  /* time-slot choices differ per university */
  function slotOptions(){
    if(DATA.profile.uni==="ubt")return SLOTS;
    return ["","09:00–10:30","11:00–12:30","13:00–14:30","15:00–16:30","17:30–19:00"];
  }

  function buildHeader(){
    var p=DATA.profile;
    document.getElementById("eyebrow").textContent=
      (UNIS[p.uni]?UNIS[p.uni].label+" · ":"")+t("eyebrowBase");
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
    /* the Dukagjini-windows note is UBT-specific */
    document.getElementById("examHint").hidden=DATA.profile.uni!=="ubt";
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
      var opts=slotOptions().slice();
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
            try{if(navigator.vibrate)navigator.vibrate(35);}catch(e2){}
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

    /* degree ECTS progress */
    var ec=document.getElementById("ectsCard");
    var earned=earnedEcts(p,DATA.pool,R()),totalE=+p.totalEcts||0;
    if(earned>0&&totalE>0){
      ec.hidden=false;
      var pctE=Math.min(100,earned/totalE*100);
      ec.innerHTML='<div class="row"><b>'+esc(t("degreeProgress"))+'</b>'
        +'<span>'+nice(earned)+' / '+nice(totalE)+' ECTS · '+Math.round(pctE)+'%</span></div>'
        +'<span class="cap-track"><span class="cap-fill" style="width:'+pctE+'%"></span></span>';
    }else{ec.hidden=true;ec.innerHTML="";}

    /* quiet backup reminder once enough has changed */
    var bn=document.getElementById("backupNudge");
    var dirty=getDirty();
    var hasData=DATA.pool.length||DATA.completed.length||DATA.schedule.length||DATA.due.length;
    if(dirty>=15&&hasData){
      bn.hidden=false;
      bn.innerHTML='<span class="due-pin">💾</span><span>'+esc(t("backupNudge",{n:dirty}))+'</span>';
    }else{bn.hidden=true;bn.innerHTML="";}
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
    document.getElementById("setAvgW").value=p.baseAvgW?n2(p.baseAvgW):"";
    document.getElementById("setTotalEcts").value=p.totalEcts||"";
    /* the transcript, when present, owns the base numbers */
    var derived=!!DATA.completed.length;
    ["setCount","setAvg","setEcts","setAvgW"].forEach(function(id){
      document.getElementById(id).disabled=derived;});
    var dn=document.getElementById("derivedNote");
    dn.hidden=!derived;
    if(derived)dn.textContent=t("fromTranscript",{n:DATA.completed.length});
    document.getElementById("setUniEmail").value=p.uniEmail||"";
    document.getElementById("setUniId").value=p.uniId||"";
    var us=document.getElementById("setUni");us.innerHTML="";
    [["",t("uniOther")]].concat(Object.keys(UNIS).map(function(k){
      return [k,UNIS[k].label];})).forEach(function(pair){
      var o=document.createElement("option");o.value=pair[0];o.textContent=pair[1];
      if(p.uni===pair[0])o.selected=true;us.appendChild(o);});
    fillMajorOptions(document.getElementById("setMajor"),p.uni,p.major);
    var ys=document.getElementById("setYear");ys.innerHTML="";
    [1,2,3].forEach(function(y){
      var o=document.createElement("option");o.value=y;o.textContent=t("yearOpt",{n:y});
      if((p.year||1)===y)o.selected=true;ys.appendChild(o);});
    var ss=document.getElementById("setSpec");ss.innerHTML="";
    var o0=document.createElement("option");o0.value="";o0.textContent=t("specNone");ss.appendChild(o0);
    Object.keys(SPECS).forEach(function(k){
      var o=document.createElement("option");o.value=k;
      o.textContent=SPECS[k].sq+" · "+SPECS[k].en;
      if(p.spec===k)o.selected=true;ss.appendChild(o);});
    renderCurricPanel();
  }

  /* major choices depend on the chosen university */
  function fillMajorOptions(sel,uni,current){
    sel.innerHTML="";
    var opts=(UNIS[uni]?UNIS[uni].majors.map(function(m){return [m.k,m.label];}):[]);
    opts.push(["",t("majorNone")]);
    opts.forEach(function(pair){
      var o=document.createElement("option");o.value=pair[0];o.textContent=pair[1];
      if(current===pair[0])o.selected=true;sel.appendChild(o);});
  }

  /* curriculum picker: subjects appear only up to the chosen year,
     and each can be sent to the exam pool or straight to "passed" */
  function renderCurricPanel(){
    var panel=document.getElementById("specPanel");
    var uni=document.getElementById("setUni").value;
    var major=document.getElementById("setMajor").value;
    var year=+document.getElementById("setYear").value||1;
    var spec=document.getElementById("setSpec").value;
    /* the specialization row only matters for UBT CSE year 3 */
    document.getElementById("specRow").hidden=!(uni==="ubt"&&major==="cse"&&year>=3);
    if(!curricFor(uni,major,year,spec).length&&!curricFor(uni,major,3,"").length){
      panel.hidden=true;panel.innerHTML="";return;
    }
    panel.hidden=false;panel.innerHTML="";
    var h=document.createElement("h4");h.textContent=t("curricH",{n:year});
    var sub=document.createElement("p");sub.className="set-hint";sub.textContent=t("curricSub");
    panel.appendChild(h);panel.appendChild(sub);
    var KIND={oblig:"kOblig",spec:"kSpec",elect:"kElect"};
    var boxes=[],lastSem=0;
    curricFor(uni,major,year,spec).forEach(function(it){
      if(it.sem!==lastSem){
        lastSem=it.sem;
        var sh=document.createElement("div");sh.className="curric-sem";
        sh.textContent=t("yearOpt",{n:Math.ceil(it.sem/2)})+" · "+t("semLbl",{n:it.sem});
        panel.appendChild(sh);
      }
      var inPool=DATA.pool.some(function(e){return nameMatch(e.name,it.name);});
      var passed=DATA.completed.some(function(c){return nameMatch(c.name,it.name);});
      var row=document.createElement("label");row.className="pick-row";
      var inp=document.createElement("input");inp.type="checkbox";
      inp.checked=inPool||passed;inp.disabled=inPool||passed;
      var box=document.createElement("span");box.className="box";box.innerHTML=CHECK;
      var body=document.createElement("span");body.className="pick-body";
      body.innerHTML='<span class="pick-name">'+esc(it.name)+'</span>'
        +'<span class="pick-meta"><span class="sem-badge">'+esc(t("exSem"))+' '+it.sem+'</span>'
        +'<span class="sem-badge">'+it.ects+' ECTS</span>'
        +(it.kind!=="oblig"?'<span class="pick-note">'+esc(t(KIND[it.kind]))+'</span>':"")
        +(passed?'<span class="pick-date">'+esc(t("inPassed"))+'</span>'
          :inPool?'<span class="pick-date">✓ '+esc(t("inPool"))+'</span>':"")+'</span>';
      row.appendChild(inp);row.appendChild(box);row.appendChild(body);
      panel.appendChild(row);
      if(!inPool&&!passed)boxes.push({inp:inp,it:it});
    });
    if(uni==="ubt"&&major==="cse"&&year>=3&&!spec){
      var note=document.createElement("p");note.className="set-hint";
      note.textContent=t("pickSpecFirst");panel.appendChild(note);
    }
    function keepChoices(){
      DATA.profile.uni=uni;DATA.profile.major=major;
      DATA.profile.spec=spec;DATA.profile.year=year;
    }
    var act=document.createElement("div");act.className="set-actions";
    var toPool=document.createElement("button");toPool.type="button";
    toPool.className="btn primary";toPool.textContent=t("toPool");
    toPool.addEventListener("click",function(){
      boxes.forEach(function(b){
        if(!b.inp.checked)return;
        DATA.pool.push({
          id:"c"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),
          name:b.it.name,sem:b.it.sem,ects:b.it.ects,date:""});
      });
      keepChoices();save();buildAll();
    });
    var toPassed=document.createElement("button");toPassed.type="button";
    toPassed.className="btn";toPassed.textContent=t("toPassed");
    toPassed.addEventListener("click",function(){
      var n=0;
      boxes.forEach(function(b){
        if(!b.inp.checked)return;
        DATA.completed.push({
          id:"f"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),
          name:b.it.name,grade:8,ects:b.it.ects});
        n++;
      });
      keepChoices();
      deriveBase(DATA);
      if(DATA.profile.totalCourses<DATA.profile.baseCount)
        DATA.profile.totalCourses=DATA.profile.baseCount;
      save();buildAll();
      if(n){
        document.getElementById("compBox").open=true;
        alert(t("gradeNote"));
      }
    });
    act.appendChild(toPool);act.appendChild(toPassed);panel.appendChild(act);
  }
  document.getElementById("setUni").addEventListener("change",function(){
    fillMajorOptions(document.getElementById("setMajor"),this.value,"");
    renderCurricPanel();
  });
  document.getElementById("setMajor").addEventListener("change",renderCurricPanel);
  document.getElementById("setSpec").addEventListener("change",renderCurricPanel);
  document.getElementById("setYear").addEventListener("change",renderCurricPanel);
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
    openWizard();   /* university & major first, step by step */
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
    p.totalEcts=Math.max(0,parseFloat(document.getElementById("setTotalEcts").value)||180);
    p.uniEmail=document.getElementById("setUniEmail").value.trim();
    p.uniId=document.getElementById("setUniId").value.trim();
    p.year=+document.getElementById("setYear").value||1;
    p.spec=document.getElementById("setSpec").value;
    p.major=document.getElementById("setMajor").value;
    p.uni=document.getElementById("setUni").value;
    save();buildAll();
  });

  /* ---------- university schedule (fully offline) ---------- */
  function fmtDur(min){
    if(min<60)return min+" min";
    var h=Math.floor(min/60),m=min%60;
    return h+"h"+(m?" "+m+"m":"");
  }
  /* compact "in class / next class" line on the Overview */
  function renderSchedStrip(){
    var strip=document.getElementById("schedStrip");
    var sched=DATA.schedule||[];
    if(!sched.length){strip.hidden=true;strip.innerHTML="";return;}
    var r=schedNow(sched,new Date());
    var html="";
    if(r.current){
      var ce=r.current.entry;
      html='<span class="due-pin">🕰️</span><b>'+esc(t("nowClassLbl"))+':</b> '
        +'<span class="due-strip-t">'+esc(ce.name)+'</span>'
        +'<span class="contrib up">'+esc(t("endsIn",{x:fmtDur(r.current.endsIn)}))
        +(ce.room?" · "+esc(ce.room):"")+'</span>';
    }else if(r.next){
      var ne=r.next.entry;
      var when=r.next.inMin<1440?t("inX",{x:fmtDur(r.next.inMin)})
        :LOC.DAYS[ne.day-1]+" · "+ne.start;
      html='<span class="due-pin">🕰️</span><b>'+esc(t("nextClassLbl"))+':</b> '
        +'<span class="due-strip-t">'+esc(ne.name)+'</span>'
        +'<span class="contrib none">'+esc(when)+(ne.room?" · "+esc(ne.room):"")+'</span>';
    }
    strip.hidden=!html;
    strip.innerHTML=html;
  }
  function renderNow(){
    renderSchedStrip();
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
  document.getElementById("schedStrip").addEventListener("click",function(){
    location.hash="#/sched";});
  document.getElementById("dueIcsBtn").addEventListener("click",function(){
    download("deadlines-"+slug(DATA.profile.name)+".ics",
      buildDueICS(DATA.due,t("nextDueLbl")+": "),"text/calendar;charset=utf-8");
  });

  /* ---------- guided setup wizard (step-by-step popup) ---------- */
  var wiz=null;
  function rid(pre){return pre+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);}
  function openWizard(){
    var p=DATA.profile;
    wiz={step:0,name:p.name||"",uni:p.uni||"",major:p.major||"",
         year:p.year||1,spec:p.spec||"",passed:{},grades:{}};
    document.getElementById("wizBackdrop").hidden=false;
    wizRender();
  }
  function closeWizard(){document.getElementById("wizBackdrop").hidden=true;wiz=null;}
  function wizStepIds(){
    var s=["who","prog"];
    if(curricFor(wiz.uni,wiz.major,wiz.year,wiz.spec).length){
      s.push("passed");
      if(Object.keys(wiz.passed).some(function(k){return wiz.passed[k];}))s.push("grades");
    }else s.push("manual");
    return s;
  }
  function wizRender(){
    var steps=wizStepIds();
    if(wiz.step>=steps.length)wiz.step=steps.length-1;
    var id=steps[wiz.step];
    var dots=document.getElementById("wizDots");dots.innerHTML="";
    steps.forEach(function(_,i){
      var d=document.createElement("span");
      d.className="dotstep"+(i<=wiz.step?" on":"");
      dots.appendChild(d);});
    var body=document.getElementById("wizBody");body.innerHTML="";
    if(id==="who")wizWho(body);
    else if(id==="prog")wizProg(body);
    else if(id==="passed")wizPassed(body);
    else if(id==="grades")wizGrades(body);
    else wizManual(body);
    document.getElementById("wizBack").style.visibility=wiz.step?"visible":"hidden";
    document.getElementById("wizNext").textContent=
      wiz.step===steps.length-1?t("finish"):t("next");
  }
  function wizWho(body){
    var html='<h4>'+esc(t("wizWho"))+'</h4>'
      +'<label class="wiz-lbl">'+esc(t("lblName"))
      +'<input id="wizName" placeholder="'+esc(t("phName"))+'" autocomplete="off" value="'+esc(wiz.name)+'"></label>'
      +'<div class="wiz-lbl">'+esc(t("lblUni"))+'</div><div>';
    Object.keys(UNIS).map(function(k){return [k,UNIS[k].label];})
      .concat([["",t("uniOther")]]).forEach(function(pair){
      html+='<label class="pick-row"><input type="radio" name="wizUni" value="'+esc(pair[0])+'"'
        +(wiz.uni===pair[0]?" checked":"")+'><span class="box">'+CHECK+'</span>'
        +'<span class="pick-body"><span class="pick-name">'+esc(pair[1])+'</span></span></label>';
    });
    body.innerHTML=html+'</div>';
    document.getElementById("wizName").addEventListener("input",function(){wiz.name=this.value;});
    Array.prototype.forEach.call(body.querySelectorAll('input[name="wizUni"]'),function(r){
      r.addEventListener("change",function(){
        wiz.uni=this.value;
        wiz.major=UNIS[wiz.uni]&&UNIS[wiz.uni].majors.length?UNIS[wiz.uni].majors[0].k:"";
        wiz.passed={};wiz.grades={};
      });
    });
  }
  function wizProg(body){
    body.innerHTML='<h4>'+esc(t("wizMajorYear"))+'</h4>'
      +'<label class="wiz-lbl">'+esc(t("lblMajor"))+'<select id="wizMajor"></select></label>'
      +'<div class="wiz-lbl">'+esc(t("lblYear"))+'</div><div class="yearbar" id="wizYears"></div>'
      +'<div id="wizSpecWrap" hidden><label class="wiz-lbl">'+esc(t("lblSpec"))
      +'<select id="wizSpec"></select></label></div>';
    fillMajorOptions(document.getElementById("wizMajor"),wiz.uni,wiz.major);
    var yb=document.getElementById("wizYears");
    [1,2,3].forEach(function(y){
      var b=document.createElement("button");b.type="button";
      b.className="ytab"+(wiz.year===y?" on":"");
      b.textContent=t("yearOpt",{n:y});
      b.addEventListener("click",function(){wiz.year=y;wiz.passed={};wizRender();});
      yb.appendChild(b);
    });
    var needSpec=wiz.uni==="ubt"&&wiz.major==="cse"&&wiz.year>=3;
    document.getElementById("wizSpecWrap").hidden=!needSpec;
    if(needSpec){
      var ss=document.getElementById("wizSpec");ss.innerHTML="";
      var o0=document.createElement("option");o0.value="";o0.textContent=t("specNone");
      ss.appendChild(o0);
      Object.keys(SPECS).forEach(function(k){
        var o=document.createElement("option");o.value=k;
        o.textContent=SPECS[k].sq+" · "+SPECS[k].en;
        if(wiz.spec===k)o.selected=true;ss.appendChild(o);});
      ss.addEventListener("change",function(){wiz.spec=this.value;});
    }
    document.getElementById("wizMajor").addEventListener("change",function(){
      wiz.major=this.value;wiz.passed={};wiz.grades={};wizRender();
    });
  }
  function wizPassed(body){
    body.innerHTML='<h4>'+esc(t("wizPassedQ"))+'</h4>'
      +'<p class="set-hint">'+esc(t("wizPassedSub"))+'</p>';
    var lastSem=0;
    curricFor(wiz.uni,wiz.major,wiz.year,wiz.spec).forEach(function(it){
      if(it.sem!==lastSem){
        lastSem=it.sem;
        var sh=document.createElement("div");sh.className="curric-sem";
        sh.textContent=t("yearOpt",{n:Math.ceil(it.sem/2)})+" · "+t("semLbl",{n:it.sem});
        body.appendChild(sh);
      }
      var inComp=DATA.completed.some(function(c){return nameMatch(c.name,it.name);});
      var inPool=DATA.pool.some(function(e){return nameMatch(e.name,it.name);});
      var row=document.createElement("label");row.className="pick-row";
      var inp=document.createElement("input");inp.type="checkbox";
      inp.checked=inComp||!!wiz.passed[it.name];
      inp.disabled=inComp||inPool;
      var box=document.createElement("span");box.className="box";box.innerHTML=CHECK;
      var b2=document.createElement("span");b2.className="pick-body";
      b2.innerHTML='<span class="pick-name">'+esc(it.name)+'</span>'
        +'<span class="pick-meta"><span class="sem-badge">'+it.ects+' ECTS</span>'
        +(inComp?'<span class="pick-date">'+esc(t("inPassed"))+'</span>':"")
        +(inPool?'<span class="pick-date">✓ '+esc(t("inPool"))+'</span>':"")+'</span>';
      inp.addEventListener("change",function(){
        wiz.passed[it.name]=inp.checked;
        /* ticking adds the grades step — keep the button label honest */
        var steps=wizStepIds();
        document.getElementById("wizNext").textContent=
          wiz.step===steps.length-1?t("finish"):t("next");
      });
      row.appendChild(inp);row.appendChild(box);row.appendChild(b2);
      body.appendChild(row);
    });
  }
  function wizGrades(body){
    body.innerHTML='<h4>'+esc(t("wizGrades"))+'</h4>';
    curricFor(wiz.uni,wiz.major,wiz.year,wiz.spec).forEach(function(it){
      if(!wiz.passed[it.name])return;
      var row=document.createElement("div");row.className="wiz-grade-row";
      var nm=document.createElement("span");nm.textContent=it.name;
      var sel=document.createElement("select");sel.className="mon";
      [6,7,8,9,10].forEach(function(g){
        var o=document.createElement("option");o.value=g;o.textContent=g;
        if((wiz.grades[it.name]||8)===g)o.selected=true;sel.appendChild(o);});
      sel.addEventListener("change",function(){wiz.grades[it.name]=+sel.value;});
      row.appendChild(nm);row.appendChild(sel);
      body.appendChild(row);
    });
  }
  function wizManual(body){
    body.innerHTML='<div class="now-empty"><div class="emoji">🧭</div>'
      +'<p>'+esc(t("wizManualNote"))+'</p></div>';
  }
  function wizFinish(){
    var p=DATA.profile;
    p.name=wiz.name.trim();
    p.uni=wiz.uni;p.major=wiz.major;p.year=wiz.year;
    p.spec=(wiz.uni==="ubt"&&wiz.major==="cse"&&wiz.year>=3)?wiz.spec:"";
    curricFor(wiz.uni,wiz.major,wiz.year,wiz.spec).forEach(function(it){
      var inComp=DATA.completed.some(function(c){return nameMatch(c.name,it.name);});
      var inPool=DATA.pool.some(function(e){return nameMatch(e.name,it.name);});
      if(wiz.passed[it.name]){
        if(!inComp)DATA.completed.push({id:rid("f"),name:it.name,
          grade:wiz.grades[it.name]||8,ects:it.ects});
      }else if(!inComp&&!inPool){
        DATA.pool.push({id:rid("c"),name:it.name,sem:it.sem,ects:it.ects,date:""});
      }
    });
    deriveBase(DATA);
    if(p.totalCourses<p.baseCount)p.totalCourses=p.baseCount;
    save();buildAll();closeWizard();
  }
  document.getElementById("wizBack").addEventListener("click",function(){
    if(wiz&&wiz.step>0){wiz.step--;wizRender();}
  });
  document.getElementById("wizNext").addEventListener("click",function(){
    if(!wiz)return;
    var steps=wizStepIds();
    if(wiz.step<steps.length-1){wiz.step++;wizRender();}
    else wizFinish();
  });
  document.getElementById("wizClose").addEventListener("click",closeWizard);
  document.getElementById("wizBackdrop").addEventListener("click",function(ev){
    if(ev.target===this)closeWizard();
  });
  document.getElementById("wizardBtn").addEventListener("click",openWizard);

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
  function markBackedUp(){setDirty(0);render();}
  function doExport(){
    download("exam-tracker-"+slug(DATA.profile.name)+".json",
      JSON.stringify({app:"ubt-exam-tracker",version:3,data:DATA},null,2),
      "application/json");
    markBackedUp();
  }
  document.getElementById("exportBtn").addEventListener("click",doExport);
  document.getElementById("backupNudge").addEventListener("click",doExport);
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
      var fallback=function(){download(name,json,"application/json");markBackedUp();};
      if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:"Exam tracker backup"})
          .then(markBackedUp)
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
        save();setDirty(0);buildAll();
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
      var show=el.dataset.view===v;
      el.classList.toggle("view-off",!show);
      /* retrigger the entrance animation on the sections coming in */
      el.classList.remove("page-in");
      if(show){void el.offsetWidth;el.classList.add("page-in");}
    });
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
