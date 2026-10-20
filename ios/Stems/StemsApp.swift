import AVFoundation
import SwiftUI

/// Native shell around the stems web app: the engine, UI and library all run
/// in the web view; the shell adds background audio, saving exports, opening
/// audio from other apps, and the app icon.
@main
struct StemsApp: App {
    @StateObject private var inbox = Inbox()

    init() {
        // Music playback: keeps playing with the screen locked and ignores the
        // silent switch. Not activated here, so opening the app doesn't stop
        // other apps' audio; WebKit activates the session when stems plays.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
    }

    var body: some Scene {
        WindowGroup {
            StemsWebView(url: AppConfig.startURL, inbox: inbox)
                .ignoresSafeArea()
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
    /// The web app's page background, so there is no flash while it loads.
    static let stemsBackground = UIColor { traits in
        traits.userInterfaceStyle == .light
            ? UIColor(red: 0xf3 / 255, green: 0xf3 / 255, blue: 0xef / 255, alpha: 1)
            : UIColor(red: 0x0b / 255, green: 0x0b / 255, blue: 0x0c / 255, alpha: 1)
    }
}
