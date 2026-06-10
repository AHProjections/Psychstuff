# Haptic Time — Apple Watch Haptic Reminders

A standalone Apple Watch app that taps your wrist at regular intervals (default: **every 15 minutes, on the hour**) or at custom times you pick, so you can keep track of time haptically — even with your watch in silent mode or a Focus/Do Not Disturb.

## How it works (and why it's reliable)

The app schedules **repeating local notifications** with the **Time Sensitive** interruption level:

- **Silent mode**: watchOS always delivers notification *haptics* in silent mode — silent mode only mutes sounds. You'll feel every tap.
- **Focus / Do Not Disturb**: Time Sensitive notifications are allowed to break through Focus by default (you can confirm under iPhone → Settings → Focus → your Focus → Apps → "Time Sensitive").
- **No background app needed**: repeating notification triggers are delivered by the system indefinitely. Nothing runs in the background, nothing gets killed by watchOS, and battery impact is essentially zero. Set it once and forget it.

> Earlier versions of this app used `WKExtendedRuntimeSession`, which watchOS suspends after a few minutes in the background. The notification approach is the one that actually works all day.

## Features

- **Interval mode** — every 5, 10, 15, 20, 30, or 60 minutes, anchored to the clock ("on the hour"), with an optional offset (e.g. every 15 min starting at :05 → :05, :20, :35, :50)
- **Custom times mode** — add any list of specific times of day
- **Quiet hours** — suppress reminders overnight (e.g. 10 PM → 8 AM), supports ranges that wrap midnight
- **Test haptic** button to feel the tap
- Shows the **next reminder time** and how many alarms are scheduled
- All settings persist and reschedule automatically when changed

## Installing on your watch

You need: a Mac with **Xcode 15 or newer**, your **iPhone** (paired to the watch), and your **Apple Watch**. A free Apple ID works — no paid developer account required.

1. **Open the project**: double-click `HapticReminders.xcodeproj`.
2. **Set your signing team**: click the blue project icon in the sidebar → *HapticReminders* target → **Signing & Capabilities** tab → set **Team** to your Apple ID (add it via Xcode → Settings → Accounts if it's not there). If the bundle ID collides, change `com.ajhughes.HapticReminders` to anything unique.
3. **Connect your iPhone** to the Mac with a cable (watch unlocked, on your wrist, near the phone).
4. **Pick the destination**: in the toolbar device menu, choose your Apple Watch (listed under your iPhone, "via iPhone").
5. **Run**: press **⌘R**. First install takes a couple of minutes while Xcode prepares the watch.
6. **Trust the developer** if prompted: on the watch (or iPhone → Watch app), Settings → General → Device Management → trust your Apple ID.
7. **Open the app on the watch** and tap **Allow** when it asks for notification permission (this includes the Time Sensitive permission).

Default schedule (every 15 min on the hour, all day) is active immediately after permission is granted.

### Recommended watch settings

- **Stronger taps**: Watch → Settings → Sounds & Haptics → Haptic Alerts → **Prominent**.
- **Silent mode on** is fine — haptics still fire; you just won't hear the chime.
- If reminders don't break through a Focus: iPhone → Settings → Focus → (your Focus) → make sure **Time Sensitive notifications** are allowed, or add **Haptic Time** to allowed apps.

## Limits worth knowing

- watchOS allows **64 pending alarms per app**. Without quiet hours, interval mode only needs a handful of hourly-repeating triggers (e.g. 4 for a 15-minute interval), so the limit never matters. With quiet hours enabled, each active hour needs its own daily triggers — a 5-minute interval with 16 active hours exceeds 64, and the app will warn you and keep the earliest 64.
- Apps signed with a **free** Apple ID expire after **7 days** and need to be re-run from Xcode. With a paid developer account they last a year (or distribute via TestFlight).
- Notification haptics use the system's standard notification tap pattern — per-notification custom haptic patterns aren't possible on watchOS.

## Project layout

```
AppleWatchHapticReminders/
├── HapticReminders.xcodeproj      ← open this
└── HapticReminders/
    ├── HapticRemindersApp.swift   ← app entry, notification delegate (foreground haptic)
    ├── ContentView.swift          ← settings UI (interval, custom times, quiet hours)
    ├── ReminderModel.swift        ← settings persistence + notification scheduling
    ├── HapticReminders.entitlements  ← Time Sensitive notifications capability
    └── Assets.xcassets            ← app icon, accent color
```

## Troubleshooting

- **No taps arriving** → check the app's notifications are allowed: Watch → Settings → Notifications → Haptic Time. Then open the app once (it re-syncs the schedule on every launch).
- **Signing error about time-sensitive entitlement** → on the target's Signing & Capabilities tab remove the *Time Sensitive Notifications* capability and delete the key from `HapticReminders.entitlements`; the app still works in silent mode, it just won't pierce Focus.
- **Watch never shows up as a run destination** → keep iPhone unlocked + connected, watch unlocked on wrist; Xcode → Window → Devices and Simulators to check pairing status; first-time watch preparation can take several minutes.
- **Taps stop after a week** → free-account signing expired; plug in and ⌘R again.
