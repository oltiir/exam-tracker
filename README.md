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
| 🌊 **Waterline gauge** | Your starting average is the waterline. Log a grade and the bar moves — green above the line, red below. No arithmetic in your head. |
| 🗓 **All five sittings** | January, April, June–July, September and November, across this year and next. Plan each one separately. |
| 🚦 **Slot limits** | Each sitting has a cap and the app enforces it — you cannot over-book a session by accident. |
| ✅ **Per-exam tracking** | Tick *done*, log the grade, tick prep: notes reviewed · past papers · mock run. |
| 📅 **Real calendars** | Weekday alignment computed from the actual date, so the grid can never disagree with reality. June–July renders both months. |
| 📊 **GPA tables** | Target bands and a ready-reckoner, recomputed against *your* numbers. |
| 💾 **Export / Import** | Full state as JSON — back it up or move it between devices. |
| 📴 **Offline** | Service worker caches everything after first load. Installable to the home screen. |

---

## Exam sittings

UBT runs five periods a year. The two short ones are catch-up windows:

| Period | Max exams |
|---|:---:|
| January | 10 |
| April | 2 |
| June – July | 10 |
| September | 10 |
| November | 2 |

The app shows every period still ahead of you this year plus all of next
year — so from late August 2026 that is September and November 2026, then all
five of 2027. The list rolls forward on its own as periods pass, and a sitting
you have already entered grades for is never dropped.

Pick a sitting from the strip at the top of **Exam sessions**. Everything below
it — the exam cards, the capacity meter, the calendar, the progress bar — is
scoped to that sitting. The waterline gauge above stays **cumulative**: it
counts every graded exam across every session, because that is what your
average actually is.

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

The app ships with a small **sample profile** so a first-time visitor sees
something working. Open **Customize** to replace it with your own average,
targets and exam list.

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
