# Silent Disco

iOS app for hosting silent discos. Everyone's playlist starts at the same absolute time — sync is driven by the clock, not a network connection. Works offline once set up.

## How it works

- Anyone can create an event: pick playlists, set a start time
- Share your setup as a QR code — others scan it to copy your settings
- Or set up your own device independently
- Tap a channel to tune in; tap again to tune out
- No skip, no pause — the playlist always plays. You just choose to listen.

## Setup

### 1. Prerequisites

- Xcode 15+
- Apple Developer account ($99/year)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)

### 2. Generate the Xcode project

```bash
cd SilentDisco
xcodegen generate
open SilentDisco.xcodeproj
```

### 3. Configure signing

In `project.yml`, set:
```yaml
DEVELOPMENT_TEAM: "YOUR_TEAM_ID"   # Found at developer.apple.com
PRODUCT_BUNDLE_IDENTIFIER: com.yourname.silentdisco
```

Re-run `xcodegen generate` after editing.

### 4. Enable MusicKit

In your Apple Developer account:
1. Go to Certificates, Identifiers & Profiles
2. Select your App ID
3. Enable **MusicKit** capability
4. Regenerate provisioning profiles

### 5. Spotify (optional)

To enable Spotify support:
1. Register at [developer.spotify.com](https://developer.spotify.com)
2. Create an app → get your **Client ID**
3. Set redirect URI to `silentdisco://spotify-callback`
4. In `SpotifyService.swift`, replace `YOUR_SPOTIFY_CLIENT_ID`
5. Add the [Spotify iOS SDK](https://github.com/spotify/ios-sdk) via SPM
6. Uncomment the SDK code in `SpotifyService.swift`

### 6. Build & Run

Run on a real device (not simulator) — camera and audio required.

## Sources

| Source | What's needed |
|---|---|
| Apple Music | Apple Music subscription + MusicKit entitlement |
| Spotify | Spotify app installed + Premium account + Client ID configured |
| Local Files | Just the audio files (MP3, AAC, FLAC, WAV) |

## Architecture

```
Models.swift       — DiscoEvent, Channel, TrackInfo, QRPayload
SyncEngine.swift   — Clock-based playback coordinator
AppleMusicService  — MusicKit playback + playlist fetch
SpotifyService     — Spotify App Remote SDK (stub until SDK linked)
LocalAudioService  — AVAudioPlayer for imported files
SetupView          — Configure channels + start time
PlayerView         — Channel switcher + mute toggle
QRCodeView         — Share event as QR
QRScannerView      — Scan QR to copy settings
```

## Offline behaviour

| Source | Offline during event |
|---|---|
| Local Files | ✅ Always works |
| Apple Music | ⚠️ Works if tracks downloaded in Music app; may need auth periodically |
| Spotify | ⚠️ Works if tracks downloaded in Spotify app; SDK connection reliability TBD |

For guaranteed offline operation, use Local Files.
