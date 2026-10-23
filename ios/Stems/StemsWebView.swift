import Combine
import SwiftUI
import UniformTypeIdentifiers
import WebKit

/// The stems web app in a WKWebView, with the native pieces a browser tab lacks.
struct StemsWebView: UIViewRepresentable {
    let url: URL
    let inbox: Inbox
    let bridge: WebBridge

    func makeCoordinator() -> Coordinator { Coordinator(inbox: inbox, bridge: bridge) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = true
        // Needed for the service worker (offline shell, shared memory); see WKAppBoundDomains.
        config.limitsNavigationsToAppBoundDomains = true
        // The page reports its controls' state here; see WebBridge.
        config.userContentController.add(BridgeMessageHandler(bridge: bridge), name: BridgeMessageHandler.name)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        // The page pads itself with env(safe-area-inset-*).
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .stemsBackground
        webView.scrollView.backgroundColor = .stemsBackground
        webView.underPageBackgroundColor = .stemsBackground
        #if DEBUG
        webView.isInspectable = true
        #endif

        context.coordinator.attach(webView)
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
        private let inbox: Inbox
        private let bridge: WebBridge
        private weak var webView: WKWebView?
        private var pageReady = false
        private var delivering = false
        private var inboxWatch: AnyCancellable?
        private var downloads: [ObjectIdentifier: URL] = [:]

        init(inbox: Inbox, bridge: WebBridge) {
            self.inbox = inbox
            self.bridge = bridge
        }

        func attach(_ webView: WKWebView) {
            self.webView = webView
            bridge.webView = webView
            inboxWatch = inbox.$pending
                .receive(on: RunLoop.main)
                .sink { [weak self] urls in if !urls.isEmpty { self?.deliverInbox() } }
        }

        // MARK: Opening audio from other apps

        private func deliverInbox() {
            guard pageReady, !delivering, let webView else { return }
            let files = inbox.take()
            guard !files.isEmpty else { return }
            delivering = true
            Task {
                defer {
                    delivering = false
                    deliverInbox()
                }
                do {
                    if try await Self.send(files, to: webView) == false {
                        present(alert("Couldn't add the song", "This version of the stems web app can't receive files from the app yet. Pick the file with Add songs instead."))
                    }
                } catch {
                    present(alert("Couldn't add the song", error.localizedDescription))
                }
                for f in files { try? FileManager.default.removeItem(at: f.deletingLastPathComponent()) }
            }
        }

        /// Rebuild the files as File objects in the page (in chunks, so a long
        /// song never has to cross into JavaScript as one huge string) and add
        /// them to the library. False when the page has no `stems.addFiles`.
        private static func send(_ files: [URL], to webView: WKWebView) async throws -> Bool {
            let chunk = 3 * 1024 * 1024
            var ids: [String] = [], names: [String] = [], types: [String] = []
            for file in files {
                let data = try Data(contentsOf: file, options: .mappedIfSafe)
                let id = UUID().uuidString
                _ = try await webView.callAsyncJavaScript(
                    "(window.__stemsInbox ??= {})[id] = [];",
                    arguments: ["id": id], contentWorld: .page)
                var offset = 0
                while offset < data.count {
                    let end = min(offset + chunk, data.count)
                    _ = try await webView.callAsyncJavaScript(
                        """
                        let u;
                        if (Uint8Array.fromBase64) {
                            u = Uint8Array.fromBase64(b64); // native decode (Safari 18.2+)
                        } else {
                            const s = atob(b64);
                            u = new Uint8Array(s.length);
                            for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
                        }
                        window.__stemsInbox[id].push(u);
                        """,
                        arguments: ["id": id, "b64": data[offset..<end].base64EncodedString()], contentWorld: .page)
                    offset = end
                }
                ids.append(id)
                names.append(file.lastPathComponent)
                types.append(UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "audio/mpeg")
            }
            let ok = try await webView.callAsyncJavaScript(
                """
                const files = ids.map((id, i) => new File(window.__stemsInbox[id], names[i], { type: types[i] }));
                for (const id of ids) delete window.__stemsInbox[id];
                if (typeof window.stems?.addFiles !== 'function') return false;
                window.stems.addFiles(files);
                return true;
                """,
                arguments: ["ids": ids, "names": names, "types": types], contentWorld: .page)
            return (ok as? Bool) ?? false
        }

        // MARK: Navigation

        func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
            pageReady = false
            bridge.pageWillLoad()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            pageReady = true
            deliverInbox()
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if action.shouldPerformDownload {
                decisionHandler(.download)
                return
            }
            guard let url = action.request.url, let scheme = url.scheme?.lowercased() else {
                decisionHandler(.allow)
                return
            }
            let mainFrame = action.targetFrame?.isMainFrame ?? true
            if (scheme == "http" || scheme == "https") && mainFrame && !AppConfig.isAppURL(url) {
                // Lyrics sites, Internet Archive and other links: Safari.
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            if !["http", "https", "about", "blob", "data"].contains(scheme) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            decisionHandler(response.canShowMIMEType ? .allow : .download)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // Usually memory pressure (stems of a long song are large): start fresh.
            pageReady = false
            bridge.pageWillLoad()
            webView.reload()
        }

        // MARK: Saving exports (WAV, MP3)

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }

        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
            download.delegate = self
        }

        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let dir = FileManager.default.temporaryDirectory.appendingPathComponent("Exports/\(UUID().uuidString)", isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            } catch {
                completionHandler(nil)
                return
            }
            let name = suggestedFilename.isEmpty ? "stems export" : suggestedFilename
            let dest = dir.appendingPathComponent(name)
            downloads[ObjectIdentifier(download)] = dest
            completionHandler(dest)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
            // Save to Files, AirDrop, open in another app, and so on.
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
            if let pop = share.popoverPresentationController, let webView {
                pop.sourceView = webView
                pop.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 0, height: 0)
                pop.permittedArrowDirections = []
            }
            present(share)
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            downloads.removeValue(forKey: ObjectIdentifier(download))
            present(alert("Couldn't save the file", error.localizedDescription))
        }

        // MARK: Windows and dialogs

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url { UIApplication.shared.open(url) }
            return nil
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            if !present(a) { completionHandler() }
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            if !present(a) { completionHandler(false) }
        }

        // MARK: Helpers

        private func alert(_ title: String, _ message: String) -> UIAlertController {
            let a = UIAlertController(title: title, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default))
            return a
        }

        /// Show over whatever is on screen. False when there is nothing to show it on.
        @discardableResult
        private func present(_ vc: UIViewController) -> Bool {
            guard var top = webView?.window?.rootViewController else { return false }
            while let next = top.presentedViewController { top = next }
            top.present(vc, animated: true)
            return true
        }
    }
}
