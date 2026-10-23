import AVFoundation
import SwiftUI

/// Native shell around the stems web app: the engine, library and most of the
/// UI run in the web view; the shell adds SwiftUI playback controls and tab
/// bar, background audio, saving exports, opening audio from other apps, and
/// the app icon.
@main
struct StemsApp: App {
    @StateObject private var inbox = Inbox()
    @StateObject private var bridge = WebBridge()

    init() {
        // Music playback: keeps playing with the screen locked and ignores the
        // silent switch. Not activated here, so opening the app doesn't stop
        // other apps' audio; WebKit activates the session when stems plays.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
    }

    var body: some Scene {
        WindowGroup {
            ZStack(alignment: .bottom) {
                StemsWebView(url: AppConfig.startURL, inbox: inbox, bridge: bridge)
                    .ignoresSafeArea()
                // Native tab bar and playback controls, once the page reports in.
                NativeChrome(bridge: bridge)
                    .ignoresSafeArea(.keyboard, edges: .bottom)
            }
            .background(Color(uiColor: .stemsBackground).ignoresSafeArea())
            .onOpenURL { inbox.receive($0) }
        }
    }
}

enum AppConfig {
    static let startURL: URL = {
        if let s = Bundle.main.object(forInfoDictionaryKey: "StemsStartURL") as? String, let url = URL(string: s) {
            return url
        }
        return URL(string: "https://edwin580.github.io/stems/")!
    }()

    /// Pages of the web app itself; every other link opens in Safari.
    static func isAppURL(_ url: URL) -> Bool {
        url.host == startURL.host && url.path.hasPrefix(startURL.path)
    }
}

extension UIColor {
    /// The page background of the web app's iOS look (--bg under html.ios),
    /// so loading and overscroll show no seam.
    static let stemsBackground = UIColor { traits in
        traits.userInterfaceStyle == .light
            ? UIColor(red: 0xf2 / 255, green: 0xf2 / 255, blue: 0xf7 / 255, alpha: 1)
            : .black
    }
}
