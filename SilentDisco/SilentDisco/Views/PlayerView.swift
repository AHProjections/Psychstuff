import SwiftUI

/// The main playback screen — minimal controls, no skip/pause.
/// The playlist always runs. You just tune in or out.
struct PlayerView: View {

    let event: DiscoEvent
    @StateObject private var engine = SyncEngine()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 32) {
                // MARK: Header
                VStack(spacing: 8) {
                    Text("Silent Disco")
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)

                    statusBadge
                }
                .padding(.top, 48)

                Spacer()

                // MARK: Channel List
                VStack(spacing: 16) {
                    ForEach(event.channels) { channel in
                        ChannelButton(
                            channel: channel,
                            isActive: engine.activeChannelID == channel.id,
                            isMuted: engine.isMuted
                        ) {
                            if engine.activeChannelID == channel.id {
                                engine.setMuted(!engine.isMuted)
                            } else {
                                engine.tuneIn(to: channel.id)
                            }
                        }
                    }
                }
                .padding(.horizontal, 24)

                Spacer()

                // MARK: Mute hint
                if engine.isPlaying {
                    Text(engine.isMuted ? "Tap a channel to tune in" : "Tap again to tune out")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                        .animation(.easeInOut, value: engine.isMuted)
                }

                // MARK: Now Playing
                if let channel = activeChannel, !engine.isMuted {
                    if let position = channel.playbackPosition(for: event.currentOffset) {
                        NowPlayingBar(track: position.track)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }

                Spacer().frame(height: 16)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                countdownOrElapsed
            }
        }
        .onAppear {
            LocalAudioService.configureAudioSession()
            engine.load(event: event)
        }
        .onDisappear {
            engine.stop()
        }
    }

    // MARK: - Computed

    private var activeChannel: Channel? {
        guard let id = engine.activeChannelID else { return nil }
        return event.channels.first { $0.id == id }
    }

    private var statusBadge: some View {
        HStack(spacing: 6) {
            if event.hasStarted {
                Circle()
                    .fill(.red)
                    .frame(width: 8, height: 8)
                    .opacity(0.9)
                Text("LIVE")
                    .font(.caption.bold())
                    .foregroundStyle(.red)
            } else {
                Image(systemName: "clock")
                    .font(.caption)
                Text("Starts soon")
                    .font(.caption)
            }
        }
        .foregroundStyle(.white.opacity(0.7))
    }

    private var countdownOrElapsed: some View {
        Group {
            if event.hasStarted {
                Text(formatDuration(event.currentOffset))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.6))
            } else {
                let timeToStart = event.startTime.timeIntervalSinceNow
                Text("in \(formatDuration(timeToStart))")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.6))
            }
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let h = Int(seconds) / 3600
        let m = (Int(seconds) % 3600) / 60
        let s = Int(seconds) % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%d:%02d", m, s)
    }
}

// MARK: - Channel Button

private struct ChannelButton: View {

    let channel: Channel
    let isActive: Bool
    let isMuted: Bool
    let action: () -> Void

    private var isListening: Bool { isActive && !isMuted }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(isListening ? .purple : .white.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: isListening ? "headphones" : "headphones")
                        .foregroundStyle(isListening ? .white : .white.opacity(0.4))
                        .font(.title3)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(channel.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                    HStack(spacing: 4) {
                        Image(systemName: channel.source.iconName)
                            .font(.caption2)
                        Text(channel.source.displayName)
                            .font(.caption)
                    }
                    .foregroundStyle(.white.opacity(0.5))
                }

                Spacer()

                if isActive {
                    Image(systemName: isMuted ? "speaker.slash" : "speaker.wave.2")
                        .foregroundStyle(isMuted ? .white.opacity(0.3) : .purple)
                        .font(.title3)
                        .symbolEffect(.variableColor, isActive: isListening)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isActive ? .white.opacity(0.12) : .white.opacity(0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(isListening ? .purple : .clear, lineWidth: 1.5)
                    )
            )
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isActive)
        .animation(.easeInOut(duration: 0.2), value: isMuted)
    }
}

// MARK: - Now Playing Bar

private struct NowPlayingBar: View {
    let track: TrackInfo

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "music.note")
                .foregroundStyle(.purple)

            VStack(alignment: .leading, spacing: 1) {
                Text(track.title)
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.6))
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(.white.opacity(0.06))
    }
}
