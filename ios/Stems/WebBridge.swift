import UIKit
import WebKit

/// What the page reports about its controls (see src/ui/native.ts).
struct WebState: Decodable, Equatable {
    struct Option: Decodable, Equatable, Hashable {
        let value: String
        let label: String
    }

    var view: String
    var hasSong: Bool
    var canPlay: Bool
    var playing: Bool
    var mode: String
    var style: String
    var sleep: String
    var sleepOptions: [Option]
    var sleepLeft: String
    var title: String
    var artist: String
}

/// Two-way link between the SwiftUI controls and the page. The page posts its
/// state on every change; taps here go back as commands. Until the page
/// reports (an older web build without the bridge), the native controls stay
/// hidden and the page keeps its own.
@MainActor
final class WebBridge: ObservableObject {
    @Published private(set) var state: WebState?
    weak var webView: WKWebView?
    private var barHeight: CGFloat = 0

    /// A new page is loading: its controls are back until it reports again.
    func pageWillLoad() {
        state = nil
    }

    func receive(_ json: String) {
        guard let data = json.data(using: .utf8), let next = try? JSONDecoder().decode(WebState.self, from: data) else { return }
        let first = state == nil
        if next != state { state = next }
        if first { sendBarHeight() }
    }

    func toggle() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        // Not flipped here: starting can take a moment (or fail); the page reports it.
        send(["type": "toggle"])
    }

    func setMode(_ mode: String) {
        guard state?.mode != mode else { return }
        UISelectionFeedbackGenerator().selectionChanged()
        state?.mode = mode
        send(["type": "mode", "value": mode])
    }

    func setStyle(_ style: String) {
        guard state?.style != style else { return }
        UISelectionFeedbackGenerator().selectionChanged()
        state?.style = style
        send(["type": "style", "value": style])
    }

    func setSleep(_ value: String) {
        UISelectionFeedbackGenerator().selectionChanged()
        state?.sleep = value
        send(["type": "sleep", "value": value])
    }

    func show(_ view: String) {
        guard state?.view != view else { return }
        UISelectionFeedbackGenerator().selectionChanged()
        state?.view = view
        send(["type": "view", "value": view])
    }

    /// The page leaves this much room at the bottom for the native bar.
    func setBarHeight(_ height: CGFloat) {
        guard abs(height - barHeight) > 0.5 else { return }
        barHeight = height
        sendBarHeight()
    }

    private func sendBarHeight() {
        guard state != nil else { return }
        send(["type": "barHeight", "value": Double(barHeight.rounded())])
    }

    private func send(_ command: [String: Any]) {
        // Commands run as if tapped in the page, so they can start audio.
        webView?.callAsyncJavaScript("window.stems?.command?.(c)", arguments: ["c": command], in: nil, in: .page) { _ in }
    }
}

/// Receives the page's state messages. Separate from WebBridge because the
/// web view's content controller keeps a strong reference to it.
final class BridgeMessageHandler: NSObject, WKScriptMessageHandler {
    static let name = "stemsNative"
    private weak var bridge: WebBridge?

    init(bridge: WebBridge) {
        self.bridge = bridge
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let json = message.body as? String else { return }
        MainActor.assumeIsolated { bridge?.receive(json) }
    }
}
