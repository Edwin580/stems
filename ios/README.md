# stems for iOS

A SwiftUI app around the stems web app. The engine, library and most of the
interface run in a `WKWebView` that loads the hosted site
(`StemsStartURL` in `project.yml`); the app adds:

- **Native controls** (`NativeChrome.swift`): the tab bar, a mini player on the
  library, and the play button, Endless/Loop, Smooth/Jumpy and sleep timer on
  the player, with haptics. They talk to the page through `WebBridge.swift` and
  `src/ui/native.ts`; the page hides its own copies when it runs in the app.
  Against a web build without the bridge, the page simply keeps its own controls.
- **Background audio** (`UIBackgroundModes: audio`, playback audio session).
- **Saving exports**: WAV/MP3 downloads open the share sheet (Save to Files, AirDrop, …).
- **Open in stems**: audio from Files, Mail, AirDrop or other apps' share menus
  goes into the library.
- External links open in Safari; the app icon is opaque and square.

## Build

You need a Mac with Xcode 15 or later.

```bash
brew install xcodegen
cd ios
xcodegen            # writes Stems.xcodeproj from project.yml
open Stems.xcodeproj
```

In Xcode, pick your team under **Signing & Capabilities**, plug in your iPhone
and press Run. A free Apple ID works; the install expires after 7 days.

To try a pull request's web changes in the app, set `StemsStartURL` in
`project.yml` to its preview (`https://edwin580.github.io/stems/previews/pr-<n>/`)
and run `xcodegen` again.

CI (`.github/workflows/ios.yml`) builds the app for the simulator, unsigned, on
every change under `ios/`.
