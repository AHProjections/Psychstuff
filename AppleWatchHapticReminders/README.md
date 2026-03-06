# Apple Watch Haptic Reminders

A standalone watchOS app that fires haptic taps at configurable intervals while running in the background.

## Features

- **Intervals**: Every 15 min, every 30 min, every hour, 15 min after the hour, 30 min after the hour
- **Haptic types**: Notification, Click, Direction Up, Success, Retry
- **True background execution** via `WKExtendedRuntimeSession` — no screen needed
- **Auto-renewal**: session renews itself before it expires, so it runs indefinitely
- **Countdown timer** showing time until the next tap
- **Tap counter** to track how many reminders have fired

## How It Works

| Interval option | Fires at… |
|---|---|
| Every 15 min | :00, :15, :30, :45 |
| Every 30 min | :00, :30 |
| Every hour | :00 |
| 15 min after hour | :15 (every hour) |
| 30 min after hour | :30 (every hour) |

The app uses **`WKExtendedRuntimeSession`** with the `self-care` background mode, which Apple allows for mindfulness/wellness apps. This keeps the session alive even when the watch screen is off.

---

## Xcode Setup (Step-by-Step)

### Requirements
- Xcode 15+
- watchOS 8+ deployment target
- A real Apple Watch (simulator cannot test haptics or extended runtime sessions)
- Apple Developer account (free tier is fine for personal device testing)

### 1. Create the Xcode Project

1. Open Xcode → **File → New → Project**
2. Choose **watchOS → App**
3. Fill in:
   - **Product Name**: `HapticReminders`
   - **Team**: your Apple ID / developer account
   - **Organization Identifier**: e.g. `com.yourname`
   - **Bundle Identifier**: `com.yourname.HapticReminders`
   - **Interface**: SwiftUI
   - **Life Cycle**: SwiftUI App
   - Uncheck "Include Notification Scene" (not needed)
4. Click **Next**, save somewhere

### 2. Replace the Generated Source Files

Delete the placeholder files Xcode generated and add the files from this folder:

```
HapticReminders Watch App/
├── HapticReminderApp.swift   ← replace App.swift Xcode made
├── ContentView.swift          ← replace ContentView.swift
└── HapticScheduler.swift     ← add this new file
```

You can drag-and-drop them into the Xcode project navigator (into the **HapticReminders Watch App** group).

### 3. Configure Info.plist

Open the **Info.plist** for the Watch App target (not the iOS companion if one exists) and add:

| Key | Type | Value |
|-----|------|-------|
| `WKBackgroundModes` | Array | |
| → Item 0 | String | `self-care` |

Or you can use the XML version in `Info.plist` included here — merge its contents into the target's plist.

Alternatively, in the **Signing & Capabilities** tab for the Watch target:
1. Click **+ Capability**
2. Add **Background Modes**
3. Check **Self Care**

### 4. Set Deployment Target

In the Watch App target's **General** tab:
- **Deployment Target**: watchOS 8.0 or later

### 5. Build & Run

1. Connect your iPhone (with paired Apple Watch)
2. Select your **Apple Watch** as the run destination in Xcode
3. Press **⌘R** to build and install
4. Open the app on your watch, pick an interval, tap **Start**

---

## Architecture Notes

### `HapticScheduler.swift`
- `ObservableObject` that owns a `WKExtendedRuntimeSession`
- `nextFireDate(from:)` calculates the next aligned clock boundary for the chosen interval
- A `Timer` fires at that exact moment, plays the haptic, then schedules the next one
- `extendedRuntimeSessionWillExpire` is called ~5 s before the session's time limit; it immediately starts a fresh session so coverage is seamless

### `ContentView.swift`
- Two states: **Setup** (pickers + Start button) and **Running** (countdown + Stop button)
- Uses `.timer` style on `Text` for a live countdown to the next tap

### Background mode
`WKExtendedRuntimeSession` with `self-care` background mode runs the CPU at reduced power even when the screen is off. This is the same mechanism used by mindfulness/breathing apps.

---

## Troubleshooting

**Haptics don't fire in the background**
→ Make sure `WKBackgroundModes` contains `self-care` in Info.plist, and the capability is added in Signing & Capabilities.

**Session immediately invalidates**
→ This happens on Simulator. Test on a real device.

**App crashes on launch**
→ Check that `HapticReminderApp.swift` uses `@main` and the target's "Principal Class" in Info.plist is not set to something else.

**Timer drifts over time**
→ The scheduler re-aligns to the clock boundary on every fire, so drift does not accumulate.
