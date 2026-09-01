/* Afati core acceptance suite — pure-logic checks against TrackerCore.
   Fixtures are synthetic; course names/dates below are from public
   university curricula only. Run: node test/core.test.js */
const assert = require("assert");
const path = require("path");
require(path.join(__dirname, "..", "app.js"));
const C = globalThis.TrackerCore;
let pass = 0, fail = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("  ok " + name); }
  catch (e) { fail++; console.log("  FAIL " + name + " — " + e.message); process.exitCode = 1; }
}

/* synthetic student: 12 passed courses (avg 8.75, 61 ECTS, 8.80 weighted),
   the public UBT CSE year-1/2 remainder as the pool, September planned */
const GRADES = [10,10,7,10,10,10,7,8,8,7,8,10];
const ECTS   = [5,5,5,4,6,6,5,4,5,5,5,6];
const POOL = [
  {id:"os",       name:"Sistemet Operative",                   sem:2,date:"10.09.2026"},
  {id:"diskrete2",name:"Struktura Diskrete 2",                 sem:4,date:"11.09.2026"},
  {id:"bigdata",  name:"Big Data",                             sem:4,date:"15.09.2026"},
  {id:"algoritme",name:"Algoritme dhe Struktura e të Dhënave", sem:4,date:"18.09.2026"},
  {id:"shkenca2", name:"Shkenca Kompjuterike 2",               sem:3,date:"21.09.2026"},
  {id:"sinjalet", name:"Sistemet dhe Sinjalet",                sem:4,date:"22.09.2026"},
  {id:"web",      name:"Dizajni dhe Zhvillimi i Webit",        sem:3,date:"23.09.2026"},
  {id:"mat2",     name:"Matematikë 2",                         sem:2,date:"24.09.2026"},
  {id:"hyrjealg", name:"Hyrje në Algoritme",                   sem:3,date:"25.09.2026"},
  {id:"db",       name:"Sistemet e Bazës së të Dhënave",       sem:3,date:"28.09.2026"},
  {id:"diskrete1",name:"Struktura Diskrete 1",                 sem:3,date:"30.09.2026"},
  {id:"mat1",     name:"Matematikë 1",                         sem:1,date:"01.10.2026"}
];
function fixture() {
  return C.normalise({
    profile:{name:"Test",uni:"ubt",major:"cse",year:3,spec:"web",
      targetMin:8.5,targetMax:9,totalCourses:24},
    completed:GRADES.map((g,i)=>({id:"f"+i,name:"Lënda "+(i+1),grade:g,ects:ECTS[i]})),
    pool:JSON.parse(JSON.stringify(POOL)),
    sessions:[
      {id:"s-2026-9",label:"September 2026",year:2026,month:9,entries:
        ["diskrete2","bigdata","algoritme","shkenca2","hyrjealg","db"]
          .map(id=>({examId:id,slot:"13:00–14:30"}))},
      {id:"s-2026-11",label:"November 2026",year:2026,month:11,entries:[]},
      {id:"s-2027-1",label:"January 2027",year:2027,month:1,entries:[]},
      {id:"s-2027-4",label:"April 2027",year:2027,month:4,entries:[]},
      {id:"s-2027-6",label:"June–July 2027",year:2027,month:6,entries:[]},
      {id:"s-2027-9",label:"September 2027",year:2027,month:9,entries:[]},
      {id:"s-2027-11",label:"November 2027",year:2027,month:11,entries:[]}
    ],
    results:{},prep:{},schedule:[],due:[],v:2
  });
}
const F = fixture();

console.log("Neutral seed:");
{
  const s = C.seedData();
  ok("blank profile, empty pool/transcript/schedule/due", () => {
    assert.strictEqual(s.profile.name, "");
    assert.strictEqual(s.profile.baseCount, 0);
    assert.strictEqual(s.pool.length, 0);
    assert.strictEqual(s.completed.length, 0);
    assert.strictEqual(s.schedule.length, 0);
    assert.strictEqual(s.due.length, 0);
  });
  ok("carries all seven 2026-2027 sitting periods", () => {
    const months = s.sessions.map(x => x.year + "-" + x.month).sort();
    assert.deepStrictEqual(months,
      ["2026-11","2026-9","2027-1","2027-11","2027-4","2027-6","2027-9"]);
  });
  ok("blank profile yields sane GPA rows (no out-of-range targets)", () => {
    C.targetRows(s.profile).rows.forEach(r =>
      assert.ok(+r.target >= 5 && +r.target <= 10));
  });
  ok("trendPoints has no bogus zero base point when baseCount is 0", () => {
    assert.strictEqual(C.trendPoints(s.profile, [], {}, s.sessions).length, 0);
  });
  ok("totalEcts defaults to 180", () =>
    assert.strictEqual(C.normalise(C.seedData()).profile.totalEcts, 180));
}

console.log("Transcript -> derived base:");
{
  ok("12 completed courses derive 8.75 / 61 ECTS / 8.80 weighted", () => {
    assert.strictEqual(F.profile.baseCount, 12);
    assert.strictEqual(C.n2(F.profile.baseAvg), "8.75");
    assert.strictEqual(F.profile.baseEcts, 61);
    assert.strictEqual(C.n2(F.profile.baseAvgW), "8.80");
  });
  ok("manual numbers survive when the transcript is empty", () => {
    const d = C.seedData();
    d.profile.baseCount = 9; d.profile.baseAvg = 7.8;
    const n = C.normalise(d);
    assert.strictEqual(n.profile.baseCount, 9);
    assert.strictEqual(n.profile.baseAvg, 7.8);
  });
  ok("transcript rows validated (grade 6-10, name required)", () => {
    const d = C.seedData();
    d.completed = [
      { id: "a", name: "OK", grade: 9, ects: 5 },
      { id: "b", name: "fail-grade", grade: 5 },
      { id: "c", name: "", grade: 8 },
    ];
    const n = C.normalise(d);
    assert.strictEqual(n.completed.length, 1);
    assert.strictEqual(n.profile.baseCount, 1);
  });
}

console.log("Old v2 export conversion:");
{
  const old = {
    profile: {
      name: "X", baseCount: 2, baseAvg: 9, targetMin: 8, targetMax: 9, totalCourses: 24,
      sessions: [{ key: "2026-sep", year: 2026, period: "sep", deferred: "",
        exams: [
          { id: "a", name: "Prova 1", mon: 8, day: 11, date: "13:00" },
          { id: "b", name: "Prova 2", mon: 8, day: 15 },
        ]},
        { key: "2026-nov", year: 2026, period: "nov", deferred: "", exams: [] }],
      completed: [["Old Course", 5, 10, "A"], ["Old 2", 4, 8, "B"]],
    },
    state: { grades: { a: "9" }, done: { a: true }, prep: {} },
  };
  const conv = C.importAny(old);
  ok("old transcript arrays become completed rows and drive the base", () => {
    assert.strictEqual(conv.completed.length, 2);
    assert.strictEqual(C.n2(conv.profile.baseAvg), "9.00");
    assert.strictEqual(conv.profile.baseEcts, 9);
  });
  ok("old exams/grades map to pool + results; dates convert", () => {
    assert.strictEqual(conv.pool.length, 2);
    assert.strictEqual(conv.pool[0].date, "11.09.2026");
    assert.strictEqual(conv.results["a"].grade, 9);
  });
  ok("migration adds new periods once, matched by year+month (no dup Nov)", () => {
    assert.strictEqual(conv.sessions.filter(s => s.year === 2026 && s.month === 11).length, 1);
    assert.strictEqual(conv.sessions.filter(s => s.year === 2027 && s.month === 6).length, 1);
  });
  ok("garbage import rejected", () => assert.strictEqual(C.importAny({ foo: 1 }), null));
}

console.log("Auto-select upcoming session:");
ok("Aug 2026 -> September 2026", () =>
  assert.strictEqual(C.autoSelect(F.sessions, F.pool, new Date(2026, 7, 31)), "s-2026-9"));
ok("Dec 2026 -> January 2027", () =>
  assert.strictEqual(C.autoSelect(F.sessions, F.pool, new Date(2026, 11, 15)), "s-2027-1"));
ok("all past -> last session", () =>
  assert.strictEqual(C.autoSelect(F.sessions, F.pool, new Date(2028, 5, 1)), "s-2027-11"));
ok("session end = latest exam date; empty month falls back to month end", () => {
  const byId = C.poolIndex(F.pool);
  assert.strictEqual(C.sessionEnd(F.sessions.find(s => s.id === "s-2026-9"), byId).getDate(), 28);
  assert.strictEqual(C.sessionEnd(F.sessions.find(s => s.id === "s-2027-1"), byId).getDate(), 31);
});

console.log("GPA math:");
{
  const ceil = C.targetRows(F.profile).rows.find(r => r.kind === "ceil");
  ok("ceiling 9.38 requires exactly 10.00", () => {
    assert.strictEqual(ceil.target, "9.38");
    assert.strictEqual(ceil.needDisp, "10.00");
    assert.ok(!ceil.over);
  });
  const p = { baseCount: 9, baseAvg: 7.8, targetMin: 8.0, targetMax: 8.5, totalCourses: 30 };
  const by = {}; C.targetRows(p).rows.forEach(r => by[r.target] = r);
  ok("9 courses / 7.8 / 30 total -> needs 8.09 and 8.80, ceiling 9.34", () => {
    assert.strictEqual(by["8.00"].needDisp, "8.09");
    assert.strictEqual(by["8.50"].needDisp, "8.80");
    assert.strictEqual(by["9.34"].needDisp, "10.00");
  });
  ok("reckoner runs 6-10 off the live total", () => {
    const run = C.running(F.profile, {});
    const rows = C.reckonerRows(run, 6, F.profile.baseAvg);
    assert.deepStrictEqual(rows.map(r => r.g), [6, 7, 8, 9, 10]);
    assert.strictEqual(C.n2(rows[3].avg), C.n2((12 * 8.75 + 9 * 6) / 18));
  });
}

console.log("Pass / fail / attempts:");
{
  const results = {};
  ok("grade 9 clears one and lifts the average", () => {
    assert.strictEqual(C.unfinished(F.pool, results).length, 12);
    results["diskrete2"] = { grade: 9, sessionId: "s-2026-9", sat: true };
    assert.strictEqual(C.unfinished(F.pool, results).length, 11);
    assert.strictEqual(C.n2(C.running(F.profile, results).avg), C.n2((12 * 8.75 + 9) / 13));
  });
  ok("a 5 stays unfinished, flagged failed, never drags the average", () => {
    results["bigdata"] = { grade: 5, sessionId: "s-2026-9", sat: true };
    assert.strictEqual(C.unfinished(F.pool, results).length, 11);
    assert.ok(C.isFailed(results["bigdata"]));
    assert.strictEqual(C.n2(C.running(F.profile, results).avg), C.n2((12 * 8.75 + 9) / 13));
  });
  ok("attempts count frozen fails + a current failing grade", () => {
    assert.strictEqual(C.attempts(null), 0);
    assert.strictEqual(C.attempts({ grade: 5, fails: 1 }), 2);
    assert.strictEqual(C.attempts({ grade: 9, fails: 2 }), 2);
    assert.strictEqual(C.nthTry(2), "2nd");
  });
  ok("a fails-only record survives normalise", () => {
    const d = fixture();
    d.results["os"] = { grade: null, sat: false, fails: 2, sessionId: "s-2026-9" };
    assert.strictEqual(C.normalise(d).results["os"].fails, 2);
  });
}

console.log("Calendar & ICS:");
{
  const byId = C.poolIndex(F.pool);
  const sep = JSON.parse(JSON.stringify(F.sessions.find(s => s.id === "s-2026-9")));
  ok("September spans one month; adding 01.10 adds an October grid", () => {
    assert.strictEqual(C.monthsSpanned(sep, byId).length, 1);
    sep.entries.push({ examId: "mat1", slot: "" });
    assert.deepStrictEqual(C.monthsSpanned(sep, byId).map(m => m.m), [9, 10]);
  });
  const ics = C.buildICS(F.sessions.find(s => s.id === "s-2026-9"), byId, {}, "Exam: ");
  ok("session ICS: 6 events, timed DTSTART from the slot, day-before alarm", () => {
    assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 6);
    assert.ok(ics.includes("DTSTART:20260911T130000"));
    assert.ok(ics.includes("TRIGGER:-P1D"));
  });
  ok("graded exams drop out of the session ICS", () => {
    const i2 = C.buildICS(F.sessions.find(s => s.id === "s-2026-9"), byId,
      { diskrete2: { grade: 9 } }, "Exam: ");
    assert.strictEqual((i2.match(/BEGIN:VEVENT/g) || []).length, 5);
  });
  ok("parseDMY validates real dates", () => {
    assert.strictEqual(C.parseDMY("31.02.2026"), null);
    assert.strictEqual(C.parseDMY("01.10.2026").getMonth(), 9);
  });
}

console.log("Weighted average, ECTS & trend:");
{
  const p = { baseAvg: 8.75, baseAvgW: 8.8, baseEcts: 61 };
  ok("weighted average uses credits (default 5); fails excluded", () => {
    assert.strictEqual(C.weightedAvg(p, F.pool, {}), 8.8);
    assert.strictEqual(C.n2(C.weightedAvg(p, F.pool, { diskrete2: { grade: 9 } })),
      C.n2((8.8 * 61 + 45) / 66));
    assert.strictEqual(C.weightedAvg(p, F.pool, { bigdata: { grade: 5 } }), 8.8);
    assert.strictEqual(C.weightedAvg({ baseAvg: 8, baseEcts: 0 }, F.pool, {}), null);
  });
  ok("earnedEcts = base + passed pool exams", () => {
    assert.strictEqual(C.earnedEcts(F.profile, F.pool, {}), 61);
    assert.strictEqual(C.earnedEcts(F.profile, F.pool, { diskrete2: { grade: 9 } }), 66);
    assert.strictEqual(C.earnedEcts(F.profile, F.pool, { bigdata: { grade: 5 } }), 61);
  });
  ok("trendPoints orders passing grades by exam date", () => {
    const res = {
      db: { grade: 8, sessionId: "s-2026-9" },
      diskrete2: { grade: 9, sessionId: "s-2026-9" },
    };
    const pts = C.trendPoints(F.profile, F.pool, res, F.sessions);
    assert.strictEqual(pts.length, 3);
    assert.strictEqual(pts[1].name, "Struktura Diskrete 2");
    assert.strictEqual(C.n2(pts[2].avg), C.n2((12 * 8.75 + 9 + 8) / 14));
  });
}

console.log("Universities & curricula:");
ok("five UBT specs, 10 year-3 subjects each (no electives, thesis in)", () => {
  assert.strictEqual(Object.keys(C.SPECS).length, 5);
  Object.keys(C.SPECS).forEach(k => {
    const cur = C.curriculum(k);
    assert.strictEqual(cur.length, 10);
    assert.strictEqual(cur.filter(x => x.kind === "elect").length, 0);
    assert.strictEqual(cur.filter(x => x.kind === "spec").length, 4);
  });
});
ok("UBT CSE year-gated 12 -> 24 -> 34 with per-semester 30 ECTS", () => {
  const ob = (y, s) => C.cseCurriculum(y, s).filter(x => x.kind !== "elect");
  assert.strictEqual(ob(1).length, 12);
  assert.strictEqual(ob(2).length, 24);
  assert.strictEqual(ob(3, "web").length, 34);
  [1, 2, 3, 4].forEach(sem => {
    const sum = C.CSE_Y12.filter(x => x.sem === sem && x.kind !== "elect")
      .reduce((a, x) => a + x.ects, 0);
    assert.strictEqual(sum, 30);
  });
});
ok("AAB year-gated 12 -> 24 -> 34; curricFor routes by uni+major", () => {
  assert.strictEqual(C.aabCurriculum(1).length, 12);
  assert.strictEqual(C.aabCurriculum(3).length, 34);
  assert.strictEqual(C.curricFor("ubt", "cse", 1, "").length, 12);
  assert.strictEqual(C.curricFor("aab", "csse", 1, "").length, 12);
  assert.strictEqual(C.curricFor("", "", 3, "").length, 0);
  assert.strictEqual(C.curricFor("aab", "cse", 3, "").length, 0);
});
ok("normalise: legacy CSE gains uni=ubt; invalid combos cleared", () => {
  const d = C.seedData();
  d.profile.major = "cse"; d.profile.spec = "web";
  assert.strictEqual(C.normalise(d).profile.uni, "ubt");
  const d2 = C.seedData();
  d2.profile.uni = "aab"; d2.profile.major = "cse";
  const n2x = C.normalise(d2);
  assert.strictEqual(n2x.profile.major, "");
  assert.strictEqual(n2x.profile.spec, "");
  const d3 = C.seedData(); d3.profile.uni = "harvard";
  assert.strictEqual(C.normalise(d3).profile.uni, "");
});
ok("nameMatch: shortened/definite forms agree, near-misses don't", () => {
  assert.ok(C.nameMatch("Big Data", "Bazat e Teknologjive Big Data"));
  assert.ok(C.nameMatch("Sistemet dhe Sinjalet", "Sisteme dhe Sinjale"));
  assert.ok(C.nameMatch("Struktura Diskrete 1", "Strukturat Diskrete 1 (Matematikë)"));
  assert.ok(C.nameMatch("Dizajni dhe Zhvillimi i Webit", "Dizajni dhe Zhvillimi i Uebit"));
  assert.ok(!C.nameMatch("Shkenca Kompjuterike 1", "Shkenca Kompjuterike 2"));
  assert.ok(!C.nameMatch("Matematikë 1", "Matematikë 2"));
});

console.log("Schedule & work due:");
ok("schedNow finds the running class and the next (with week wrap)", () => {
  const sched = [
    { day: 1, start: "09:00", end: "10:30", name: "AI" },
    { day: 1, start: "11:00", end: "12:30", name: "Cloud" },
  ];
  const r = C.schedNow(sched, new Date(2026, 7, 31, 9, 40));
  assert.strictEqual(r.current.entry.name, "AI");
  assert.strictEqual(r.current.endsIn, 50);
  assert.strictEqual(r.next.entry.name, "Cloud");
  const r2 = C.schedNow([sched[0]], new Date(2026, 8, 2, 15, 0));
  assert.strictEqual(r2.current, null);
  assert.strictEqual(r2.next.inMin, 5 * 1440 - 6 * 60);
});
ok("dueSplit sorts by deadline, undated last, overdue flagged", () => {
  const now = new Date(2026, 8, 4, 12, 0);
  const due = [
    { id: "a", title: "Later", date: "10.09.2026", done: false },
    { id: "b", title: "Overdue", date: "02.09.2026", done: false },
    { id: "c", title: "NoDate", date: "", done: false },
    { id: "d", title: "Today", date: "04.09.2026", time: "23:59", done: false },
    { id: "e", title: "Done", date: "01.09.2026", done: true },
  ];
  const s = C.dueSplit(due, now);
  assert.deepStrictEqual(s.open.map(o => o.item.id), ["b", "d", "a", "c"]);
  assert.ok(s.open[0].overdue && s.open[0].days === -2);
  assert.strictEqual(s.done.length, 1);
});
ok("buildDueICS exports only open dated items", () => {
  const ics = C.buildDueICS([
    { id: "a", title: "Report", date: "05.09.2026", time: "23:00", done: false },
    { id: "b", title: "Done", date: "01.09.2026", done: true },
    { id: "c", title: "NoDate", date: "", done: false },
  ], "Due: ");
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.ok(ics.includes("DTSTART:20260905T230000"));
});
ok("broken schedule/due rows dropped by normalise", () => {
  const d = C.seedData();
  d.schedule = [{ day: 9, start: "10:00", name: "bad" }];
  d.due = [{ id: "", title: "no id" }];
  const n = C.normalise(d);
  assert.strictEqual(n.schedule.length, 0);
  assert.strictEqual(n.due.length, 0);
});
ok("v3 export round-trips through importAny", () => {
  const round = C.importAny({ app: "x", version: 3, data: fixture() });
  assert.strictEqual(round.pool.length, 12);
  assert.strictEqual(round.completed.length, 12);
});

console.log("Sync codes:");
(async () => {
  try {
    const json = JSON.stringify({ app: "x", version: 3, data: fixture() });
    const code = await C.packCode(json);
    assert.ok(/^AFATI[01]:/.test(code));
    const back = await C.unpackCode(code);
    assert.strictEqual(JSON.parse(back).data.pool.length, 12);
    const plain = await C.unpackCode(
      "AFATI0:" + Buffer.from(json, "utf8").toString("base64"));
    assert.strictEqual(JSON.parse(plain).version, 3);
    let bad = null;
    await C.unpackCode("nonsense").catch(e => bad = e);
    assert.ok(bad);
    pass++; console.log("  ok sync codes round-trip (gzip + plain), garbage rejected");
  } catch (e) {
    fail++; console.log("  FAIL sync codes — " + e.message); process.exitCode = 1;
  }
  console.log("");
  console.log(pass + " passed, " + fail + " failed");
  if (fail) process.exit(1);
})();
