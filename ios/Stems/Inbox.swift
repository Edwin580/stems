import Foundation

/// Audio files handed to the app ("Open in stems", share menus, AirDrop),
/// waiting to be passed to the web app's library.
@MainActor
final class Inbox: ObservableObject {
    @Published private(set) var pending: [URL] = []

    func receive(_ url: URL) {
        guard url.isFileURL else { return }
        // Copy it somewhere we can read later: the original may only be
        // readable inside this security scope.
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("Inbox/\(UUID().uuidString)", isDirectory: true)
        let copy = dir.appendingPathComponent(url.lastPathComponent)
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try FileManager.default.copyItem(at: url, to: copy)
            pending.append(copy)
        } catch {
            return
        }
        // Files iOS put in Documents/Inbox for us are ours to remove.
        if url.path.contains("/Documents/Inbox/") { try? FileManager.default.removeItem(at: url) }
    }

    /// Hand over everything waiting.
    func take() -> [URL] {
        let all = pending
        pending = []
        return all
    }
}
