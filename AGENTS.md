# Steps — the owner's guide

This is the guide to your app. Every AI coding assistant reads this file at the start of a session, so anything written here is context you don't have to re-explain. It's also written for you to read — start at the top and skim.

## What this is

Steps is a journal for your walking. It reads your step count from Apple Health, keeps everything in a small database on the phone (nothing leaves the device, there's no account, no server), and lets you write and attach photos to the days you walked.

What's here now is a **foundation**, not a finished app. The plumbing works and is tested. The look is plain on purpose — big black numbers, a blue bar chart, grey captions — because all of that is yours to change. The screens are the canvas. You own every pixel of them.

The app is also still called "Steps," which is a placeholder. Renaming it is a good first project.

## How to run it

The app is already installed on the simulator and on your phone. Running it means starting the server that feeds it your code:

```bash
cd steps
npx expo start
```

Then press `i` in that terminal to open the simulator, or just open **Steps** on your phone — with the terminal running, it picks up your changes as you save them.

If the phone won't connect: check it's on the same Wi-Fi as the computer, then stop the server (`Ctrl-C`) and run `npx expo start` again.

Do **not** use the Expo Go app — this app has an Apple Health connection that Expo Go doesn't know about. Use the Steps icon that's already on the home screen.

To run the tests:

```bash
npm test
```

There's also `npm run ios`, which rebuilds the whole app from scratch. It's slow and you should almost never need it. If an assistant tells you to run it, that usually means it wants to add something that needs a rebuild — see the house rules at the bottom.

## Working on two things at once

If you want a second copy of the app to try something in without disturbing what you've already got working:

```bash
./scripts/worktree.sh new rounder-bars
```

That gives you `.worktrees/rounder-bars` — the whole app again, on its own branch, with its own copy of everything. Two windows, two experiments, neither able to break the other. When you're done with it:

```bash
./scripts/worktree.sh rm rounder-bars
```

It takes about ten seconds rather than the several minutes `npm install` would, because it copies the dependencies from the copy you already have instead of downloading them again. On this Mac that copy is free — the disk shares the files between both until one of them changes. If the project's dependencies have actually changed since that copy, it notices and does the slow, correct thing instead.

Run `npx expo start --port 8082` (or any port that isn't already in use) in the new one, so two servers don't hand each other's code to your phone.

## The shape of the code

Four folders matter:

- **`src/app/`** — the screens. One file per screen, and the file's path *is* the screen's address in the app. This is yours.
- **`src/components/`** — shared pieces that screens use: `BarChart.tsx` (heavily commented, meant to be copied and mangled) and `MonthCalendar.tsx` (the swipeable month grid). Also yours.
- **`src/data/`** — the engine room. It talks to Apple Health, stores days and entries and photos, and hands them to your screens. It has 32 tests and it works. You never need to open it, and nothing you do in `src/app/` can corrupt it — the worst that happens is a screen doesn't draw.
- **`docs/`** — the design spec and build plan, if you or an assistant ever want to know why something is the way it is.

(There's also `ios/`, the native Apple project. That's David's territory — you won't need to go in there.)

The screens, by file:

| File | What it is |
| --- | --- |
| `src/app/(tabs)/today.tsx` | Today tab — the big number, the Day/Week chart, and the calendar toggle |
| `src/app/(tabs)/journal.tsx` | Journal tab — all your entries, newest first |
| `src/app/(tabs)/days.tsx` | Days tab — the last 90 days as a list |
| `src/app/day/[date].tsx` | One day: its steps, its walks, its entries |
| `src/app/entry/new.tsx` | Writing a new entry (opens as a sheet) |
| `src/app/entry/[id].tsx` | Reading, editing, deleting one entry |
| `src/app/index.tsx` | The doorway — decides, on every launch, whether you've seen the welcome screen yet and sends you to it or straight to the tabs |
| `src/app/welcome.tsx` | The first-launch screen |
| `src/app/settings.tsx` | Health connection, and the fake-data button |
| `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx` | The frame — which screens exist, what the tabs are called |

## Getting data onto the screen

Everything comes from one place: `../data`. You don't fetch, you don't wait, you don't refresh. You call a hook, you get an answer, and **when the data changes the screen redraws itself.** Add an entry on one screen and the list on another screen already knows.

Count the folders back to `src` for the import: from `src/app/settings.tsx` it's `'../data'`; from `src/app/(tabs)/today.tsx` it's `'../../data'`.

**Today's steps.**

```tsx
import { useToday } from '../../data'
const today = useToday() // { date: '2026-08-14', steps: 8412, distanceMeters: 6100 }
return <Text>{today.steps.toLocaleString()} steps</Text>
```

**A range of days**, one row per day, oldest first, zeros for days with nothing:

```tsx
import { addDays, dateKey, todayKey, useDailySteps } from '../../data'
const week = useDailySteps({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
// [{ date: '2026-08-08', steps: 7213, distanceMeters: 5400 }, …]
```

**One day, hour by hour** — always 24 entries, zeros for quiet hours:

```tsx
import { todayKey, useHourlySteps } from '../../data'
const hours = useHourlySteps(todayKey())
// [{ hour: 0, steps: 0 }, … { hour: 14, steps: 612 }, …]
```

**Journal entries**, newest first — the whole lot, or just a stretch of dates:

```tsx
import { useEntries } from '../../data'
const all = useEntries()
const august = useEntries({ start: '2026-08-01', end: '2026-08-31' })
// each: { id, date, text, createdAt, updatedAt, photos: [{ id, uri, position }] }
```

**One entry**, by its id — `undefined` if it doesn't exist, or was just deleted:

```tsx
import { useEntry } from '../../data'
const entry = useEntry(id)
if (!entry) return <Text>Gone.</Text>
```

**Walks and hikes** that Health recorded, newest first:

```tsx
import { todayKey, useWorkouts } from '../../data'
const walks = useWorkouts({ start: '2026-08-01', end: todayKey() })
// each: { id, date, start, end, type, distanceMeters, durationS }
```

**Whether Health is connected**, and when it last pulled data:

```tsx
import { useSyncStatus } from '../../data'
const { lastSyncedAt, permissionState } = useSyncStatus()
if (permissionState === 'shouldRequest') return <Text>Connect Apple Health →</Text>
```

**Writing things** — these three change the stored data, and every screen showing it updates on its own:

```tsx
import { addEntry, deleteEntry, updateEntry } from '../../data'
await addEntry({ text: 'Walked to the harbour', photoUris: [uri] }) // date defaults to today
updateEntry(entry.id, { text: 'Walked to the harbour at dusk' })
deleteEntry(entry.id)
```

**Pulling fresh numbers from Health** by hand (it already happens on launch and whenever you come back to the app):

```tsx
import { syncHealth } from '../../data'
await syncHealth()
```

**Dates** are always plain strings like `'2026-08-14'`, and there are four helpers so you never touch a Date by hand: `todayKey()`, `dateKey(someDate)`, `addDays(someDate, -30)`, and `lastNDateKeys(7)` for the last seven days as a list of strings.

## Fake data to play with

An empty app is a miserable thing to design against. Open **Settings** (the link at the bottom of the Today tab) and press **"DEV: fill with a year of fake steps."** You get 365 days of plausible-looking numbers to build charts on. The button only exists while you're developing — it won't appear in a real installed app.

## If something breaks

Nothing here is fragile in a way you can't get out of.

- **The screen looks wrong or froze** — shake the phone and tap *Reload*, or press `r` in the terminal running `expo start`.
- **A red screen full of text** — that's a message, not damage. Copy the first few lines and paste them into your AI session; that text is usually enough to fix it in one turn.
- **Undo everything since your last save point** — `git checkout .` throws away edits to existing files and puts you back where you were.
- **Make save points constantly** — `git add -A && git commit -m "rounded the bars"`. Do it every single time something works, *before* you try the next thing. This is the whole safety net; a commit costs two seconds and buys you the ability to be reckless.

## Things to try first

Change one thing at a time, look at it, commit it, then change the next. These are written as prompts you can paste straight into an AI session:

**Rename the app.**
> Rename this app from "Steps" to *Wander*. Change `name` in `app.json` and every visible "Steps" string in the screens — the welcome screen title especially. Leave `slug` and `bundleIdentifier` alone; those need a native rebuild.

**Restyle the chart.**
> In `src/components/BarChart.tsx`, give the bars rounded tops and change the colour from blue to a warm coral. Keep the component's props exactly as they are so `src/app/(tabs)/today.tsx` keeps working.

**Add a month at a glance.**
> Add a month view: a new screen at `src/app/month/[month].tsx` showing one small square per day of that month, shaded darker the more steps I took, in a 7-wide grid. Get the numbers from `useDailySteps({ start, end })` in `../../data`. Link to it from the top of the Days tab.

**Decide what a journal entry is.**
> Right now a day can hold any number of entries. I want one entry per day instead: tapping "write about this day" on a day that already has an entry should open that entry for editing rather than making a new one. Change `src/app/day/[date].tsx` and `src/app/entry/new.tsx` only — don't change anything in `src/data/`.

**Make something beautiful with Skia.**
> `@shopify/react-native-skia` is already installed and unused — don't install anything. Build `src/components/StepsRing.tsx` with it: a circular ring that fills with today's steps (a full ring is a number of your choosing — this app has no built-in step goal), with a soft glow where the ring ends. Put it on the Today screen above the chart. Read the Skia docs before you write it.

**Bring the photos forward.**
> On the Today screen, under the chart, show the photos from this week's journal entries as a row of thumbnails that scrolls sideways, tapping one opens that entry. Use `useEntries` with the week's date range, and `expo-image` for the images.

A note on prompting: describe what you want it to *look and feel* like, not how to code it — that's the part you're better at than the machine. And name the file when you know it; "in `src/components/BarChart.tsx`" saves the assistant a lot of guessing.

## House rules

**If you are an AI assistant working in this repo, follow these.** They exist because the owner is learning by building, and because some mistakes here cost a native rebuild she can't do herself.

1. **Expo has changed.** This project is on Expo SDK 57. Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any Expo code — training-memory APIs and older tutorials are frequently wrong for this version.
2. **Screens import from `../data` only.** Use the public index (`'../data'` / `'../../data'`). Never import from a file inside `src/data/` directly, and don't reach for `expo-sqlite` from a screen.
3. **Never add a native dependency.** Anything that requires a native rebuild — a new native module, a new entry in the `plugins` list in `app.json`, a change under `ios/` — must not be installed. Stop and tell her to ask David. Already available and free to use: `@shopify/react-native-skia`, `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-image`, `expo-haptics`, `expo-symbols`, `expo-glass-effect`, `@expo/ui`, `expo-image-picker`, `@react-native-community/datetimepicker`.
4. **Keep the tests green.** Run `npm test` before you say you're done — 32 tests, all passing. Run `npx tsc --noEmit` too if you touched types.
5. **Prefer changing screens over changing `src/data/`.** The data layer is a tested, working foundation; almost every request can be satisfied in `src/app/` or `src/components/`. If a request genuinely needs a data-layer change, say so out loud first and add tests alongside it.
6. **Commit when something works**, with a plain-language message. Small commits are her undo button.

Everything else is fair game. Rip up the styling, throw away a screen, start the Journal tab over from scratch. The foundation will hold.
