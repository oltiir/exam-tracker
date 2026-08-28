<div align="center">

# 🎓 UBT Exam Tracker

Plan every exam sitting of the academic year and watch what each grade does to
your average — before you commit to a session.

[![Live app](https://img.shields.io/badge/live-oltiir.github.io%2Fexam--tracker-2ea44f?style=flat-square)](https://oltiir.github.io/exam-tracker/)
[![No build step](https://img.shields.io/badge/build-none-blue?style=flat-square)](#stack)
[![Dependencies](https://img.shields.io/badge/dependencies-0-lightgrey?style=flat-square)](#stack)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-5a3ec8?style=flat-square)](#install-on-your-phone)

**[→ Open the tracker](https://oltiir.github.io/exam-tracker/)**

</div>

---

## What it does

Every exam you sit either pulls your average up or drags it down, and how hard
depends on how many courses you have already banked. This makes that visible
*before* you register for a sitting.

| | |
|---|---|
| 🧺 **One exam pool** | Every course you still have to sit lives in a single master list — name, semester, official date. Enter it once. |
| 🎯 **Sessions draw from it** | A session (September 2026, January 2027, …) is just a set of ticks against the pool. Change your mind by unticking — nothing is retyped. |
| ✅ **Pass leaves the pool** | Grade 6+ removes the exam from every picker for good. A 5 keeps it in the pool flagged **retake**, ready to tick into a later session. |
| 🔁 **Attempts are counted** | Every failed sitting is remembered — badges show *retake ×2*, cards show *attempt 3rd coming up*, and a pass records which try it took. Fails never touch the average. |
| 🌊 **Waterline gauge** | Your starting average is the waterline. Log a grade and the bar moves — green above the line, red below. Failed sittings don't count against it. |
| 📅 **Live calendars** | Built from the selected session's actual dates, one Monday-first grid per month spanned — an 01.10 exam inside the September session simply adds an October grid. |
| 📊 **GPA tables** | Target bands (full precision, so the ceiling row is honest) and a ready-reckoner over the session's pending exams. |
| 📅 **Add to phone calendar** | One tap exports the open session's pending exams as an `.ics` file — dates, time slots and a day-before reminder land in Google/Apple Calendar. |
| 🎲 **What-if mode** | A sandbox toggle: tap grades freely to see what they'd do to your average, then exit — nothing is saved. |
| ✔️ **Prep progress** | Notes · past papers · mock run per exam, with a per-card 0–3 counter and a session-wide prep % in the hero. |
| 🏆 **Cleared history** | A collapsible list of everything passed — grade, session, and which attempt it took. |
| 🎓 **Specialization aware** | Pick your track (Cybersecurity, Software Eng, Data & AI, Web, Networking) and year — the year-3 curriculum from the official plan appears with checkboxes and drops straight into your pool. |
| 🕰️ **Live schedule** | Enter your weekly timetable once; the Schedule tab always shows which class you're in right now and what's next — fully offline. |
| 🌙 **Dark mode** | Follows the system, with a manual sun/moon toggle. Warm in both directions. |
| 🇦🇱 **Shqip / English** | Full UI translation, month and weekday names included. Auto-detects an Albanian browser; one tap to switch. |
| 💾 **Export / Import** | Full state as JSON — back it up or move it between devices. Old-format exports convert on import. |
| 📴 **Offline** | Service worker caches everything (fonts included) after first load. Installable to the home screen. |

---

## Pool + sessions model

The data model is deliberately small — one localStorage key holding:

```js
{
  profile:  { name, baseCount, baseAvg, targetMin, targetMax, totalCourses },
  pool:     [ { id, name, sem, date } ],              // every exam still to sit
  sessions: [ { id, label, year, month, entries: [ { examId, slot } ] } ],
  results:  { [examId]: { grade, sessionId, sat, fails } },  // one result per exam
  prep:     { [examId]: { notes, papers, mock } }
}
```

Grades live **on the exam**, not on the session — passing a course anywhere
passes it everywhere. On load the app auto-selects the next upcoming session
(latest exam date in it, falling back to the end of its month), and the green
dot marks where "now" is while you browse other sessions. Year tabs appear for
whatever years your sessions cover.

The waterline gauge stays **cumulative**: it counts every passing grade across
every session, because that is what your average actually is. Append
`?today=2026-12-15` to the URL to preview which session a future date would
auto-select.

---

## Install on your phone

Open the [live URL](https://oltiir.github.io/exam-tracker/) on your device:

- **Android / Chrome** — menu ⋮ → *Add to Home screen*
- **iOS / Safari** — Share → *Add to Home Screen*

The session strip scrolls sideways with a thumb, and the exam rows reflow to a
single column on narrow screens.

---

## Your data

Everything you enter lives in that browser's `localStorage`. There is no
account, no server and no analytics — nothing you type leaves the device, and
nobody else opening the link sees any of it.

The app ships pre-seeded with the 12 remaining courses from the official
"Orari i Provimeve — Shtator 2026", a September 2026 session already planned,
and every sitting period through November 2027 (September/November 2026,
January/April/June–July/September/November 2027). Open **Set up** to edit the
pool, the sessions or your details.

> [!IMPORTANT]
> This is a public static site, so anything committed to `app.js` is
> readable by every visitor via view-source. Keep real transcripts out of the
> repo — put them in a gitignored `my-profile.json` and load it through
> **Import** instead.

Use **Export data** to snapshot your progress, and **Import** to restore it or
carry it to another device. Exports from older versions are migrated
automatically on load.

---

## Deploy

Live at **https://oltiir.github.io/exam-tracker/** via GitHub Pages
(`main` / root). To ship a change:

```bash
git add .
git commit -m "Update tracker"
git push
```

> [!TIP]
> Installed copies are served by a service worker, so they keep showing the
> cached version. Bump `CACHE` in `sw.js` and the `activate` handler purges
> every older cache on next load.

---

## Stack

No build step, no dependencies, no framework — three plain files.

```
index.html              markup
app.css                 styles — warm palette, mobile-first, bottom tab bar
app.js                  logic — vanilla JS, no dependencies
sw.js                   service worker — cache-first with background refresh,
                        also caches Google Fonts for offline use
manifest.webmanifest    PWA metadata
icon-192.png            home-screen icons
icon-512.png
```

To work on it locally, any static server will do:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Service workers need `localhost` or HTTPS —
opening `index.html` as a `file://` URL disables offline support, though the
rest of the app runs fine.
