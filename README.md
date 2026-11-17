# Trailhead

A prototype iPhone home-screen app for planning 3–6 outdoor activities a year for youth (ages 11–18), planned by youth with leaders' help and centered on Jesus Christ.

## What it does

- **Year view:** 3–6 activities for the year, how ready each one is, and which youth still need a personal invitation.
- **Start with the why:** each activity opens on a "Why" tab. The youth write the purpose and choose their own gospel theme and scriptures. Trailhead never picks a theme; it only offers questions to help them decide. The planning tabs stay locked until the purpose and theme are written.
- **Devotional moments:** assign a youth to each moment, at least one per night, and track whether they're prepared. Youth write their own content; the app only offers tips.
- **Planning tabs:** Schedule (with a starter schedule and a bad-weather plan), People (RSVPs, who invited whom, permission and medical forms received), Gear (starter lists for day or overnight), Food, Rides (seat count), Budget, and an After tab ("Where did you see the Savior?").
- **"Ready?" checklist:**
  - Two adult leaders attending.
  - Protecting Children and Youth training current (renews every 3 years).
  - A woman leader when young women attend, and a man leader overnight when young men attend.
  - Forms received and enough seats.
  - No adult alone with one youth in a vehicle.
  - Emergency sheet filled in, permits done and bishop approval.
- **Uses the tools you already have:**
  - "Email parents" opens your mail app with every parent in BCC.
  - "Copy reminder text" is for pasting into a group text.
  - "Add to calendar" downloads an event file with reminders 14, 3 and 1 day before; it works with Google or Apple Calendar.
- **Trip sheet:** a one-page summary you can print or save as a PDF for camp.
- **Works offline:** activity cards and the emergency sheet open with no signal once the app has been opened at least once.
- **Place library:** 13 ideas near Spokane, WA. Fees and rules change, so verify before you go.

## Shared data (Google Sheet)

Connect the app to the **Trailhead Data** Google Sheet so leaders and youth leaders share one plan. A short Apps Script in the sheet (`apps-script/Code.gs`) saves and loads the data, protected by a passcode. Each phone keeps a copy for offline use and syncs when it has a signal. See **[SETUP.md](SETUP.md)** for setup.

Without a sheet, data stays on the device. **Settings → Export backup** saves a copy. Medical details are never stored; the app tracks only whether each form was received.

Live app: https://uwditto-maker.github.io/Youth-activity-planner/ (after GitHub Pages is turned on; see SETUP.md).

## Run it

These are static files with no build step:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. To use it on an iPhone, host the folder on any static host with HTTPS (for example GitHub Pages). Then, in Safari, tap **Share → Add to Home Screen**.

## Files

- `index.html`: page structure
- `app.js`: app logic
- `data.js`: places, theme guidance questions, devotional tips and gear lists
- `styles.css`: styles, including light and dark mode
- `sw.js`: offline cache
- `manifest.webmanifest`: home-screen app settings
- `apps-script/Code.gs`: sync script to paste into the Google Sheet
- `icons/`: app icons

## Next steps (not in the prototype)

- Automatic reminders sent through Gmail.
- Youth RSVP links.

---

Not an official app of The Church of Jesus Christ of Latter-day Saints. Follow the General Handbook and your bishop's direction for activity and safety policy.
