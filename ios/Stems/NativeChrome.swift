import SwiftUI

/// The app's own controls over the page: a mini player on the library, the
/// full transport on the player, and the tab bar. The page hides its copies
/// (html.native-shell in src/ui/style.css).
struct NativeChrome: View {
    @ObservedObject var bridge: WebBridge

    var body: some View {
        if let s = bridge.state {
            VStack(spacing: 0) {
                if s.hasSong {
                    if s.view == "app" {
                        Transport(state: s, bridge: bridge)
                    } else {
                        MiniPlayer(state: s, bridge: bridge)
                    }
                    Divider()
                }
                TabBar(state: s, bridge: bridge)
            }
            .background {
                GeometryReader { g in
                    Color.clear.preference(key: BarHeight.self, value: g.size.height)
                }
            }
            .background(.bar, ignoresSafeAreaEdges: .bottom)
            .overlay(alignment: .top) { Divider() }
            .onPreferenceChange(BarHeight.self) { h in
                MainActor.assumeIsolated { bridge.setBarHeight(h) }
            }
            .animation(.snappy(duration: 0.25), value: s.view)
            .animation(.snappy(duration: 0.25), value: s.mode)
            .tint(.stemsTint)
        }
    }
}

private struct BarHeight: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

private struct PlayButton: View {
    let state: WebState
    let bridge: WebBridge
    var size: CGFloat = 52

    var body: some View {
        Button { bridge.toggle() } label: {
            Image(systemName: state.playing ? "pause.fill" : "play.fill")
                .font(.system(size: size * 0.4, weight: .semibold))
                .contentTransition(.symbolEffect(.replace))
                .frame(width: size, height: size)
                .foregroundStyle(Color.stemsOnTint)
                .background(Circle().fill(Color.stemsTint))
        }
        .buttonStyle(.plain)
        .disabled(!state.canPlay)
        .opacity(state.canPlay ? 1 : 0.4)
        .accessibilityLabel(state.playing ? "Pause" : "Play")
    }
}

private struct Transport: View {
    let state: WebState
    let bridge: WebBridge

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                PlayButton(state: state, bridge: bridge)
                Picker("Playback mode", selection: Binding(get: { state.mode }, set: { bridge.setMode($0) })) {
                    Text("Endless").tag("endless")
                    Text("Loop").tag("loop")
                }
                .pickerStyle(.segmented)
                SleepMenu(state: state, bridge: bridge)
            }
            if state.mode == "endless" {
                Picker("Endless style", selection: Binding(get: { state.style }, set: { bridge.setStyle($0) })) {
                    Text("Smooth").tag("smooth")
                    Text("Jumpy").tag("jumpy")
                }
                .pickerStyle(.segmented)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

private struct SleepMenu: View {
    let state: WebState
    let bridge: WebBridge

    var body: some View {
        Menu {
            Picker("Sleep timer", selection: Binding(get: { state.sleep }, set: { bridge.setSleep($0) })) {
                ForEach(state.sleepOptions, id: \.self) { o in
                    Text(o.value == "0" ? "Off" : o.label).tag(o.value)
                }
            }
        } label: {
            VStack(spacing: 2) {
                Image(systemName: state.sleep == "0" ? "moon.zzz" : "moon.zzz.fill")
                    .font(.system(size: 20))
                Group {
                    if state.sleepAt > 0 {
                        // Counts down on its own; the page doesn't need to send updates.
                        Text(Date(timeIntervalSince1970: state.sleepAt / 1000), style: .timer)
                    } else {
                        Text("Sleep")
                    }
                }
                .font(.caption2.monospacedDigit())
                .lineLimit(1)
            }
            .frame(minWidth: 44, minHeight: 44)
            .foregroundStyle(state.sleep == "0" ? Color.secondary : Color.stemsTint)
        }
        .accessibilityLabel("Sleep timer")
    }
}

private struct MiniPlayer: View {
    let state: WebState
    let bridge: WebBridge

    var body: some View {
        HStack(spacing: 12) {
            Button { bridge.show("app") } label: {
                HStack(spacing: 12) {
                    Image(systemName: "waveform")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color.stemsTint)
                        .frame(width: 40, height: 40)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color(uiColor: .secondarySystemFill)))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(state.title.isEmpty ? "stems" : state.title)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                        Text(state.mode == "loop" ? "Loop" : "Endless")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open player, \(state.title)")
            PlayButton(state: state, bridge: bridge, size: 40)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
}

private struct TabBar: View {
    let state: WebState
    let bridge: WebBridge

    var body: some View {
        HStack(spacing: 0) {
            tab("home", "Library", "music.note.list", enabled: true)
            tab("app", state.hasSong ? state.title : "Player", "waveform", enabled: state.hasSong)
        }
        .padding(.top, 6)
        .padding(.bottom, 2)
    }

    private func tab(_ view: String, _ label: String, _ symbol: String, enabled: Bool) -> some View {
        let selected = state.view == view
        return Button { bridge.show(view) } label: {
            VStack(spacing: 3) {
                Image(systemName: symbol)
                    .font(.system(size: 22))
                    .symbolEffect(.variableColor.iterative, isActive: view == "app" && state.playing)
                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(selected ? Color.stemsTint : Color.secondary)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.4)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

extension Color {
    /// stems' signal colour, as on the web (--accent).
    static let stemsTint = Color(uiColor: UIColor { t in
        t.userInterfaceStyle == .light
            ? UIColor(red: 0x55 / 255, green: 0x74 / 255, blue: 0x00 / 255, alpha: 1)
            : UIColor(red: 0xc6 / 255, green: 0xef / 255, blue: 0x4e / 255, alpha: 1)
    })
    /// Text and icons on the tint.
    static let stemsOnTint = Color(uiColor: UIColor { t in
        t.userInterfaceStyle == .light ? .white : UIColor(red: 0x0d / 255, green: 0x10 / 255, blue: 0x03 / 255, alpha: 1)
    })
}
