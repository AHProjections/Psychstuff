import Foundation
import Combine

/// Drives all playback based purely on wall-clock time.
/// No host, no network during playback — just the device clock.
@MainActor
final class SyncEngine: ObservableObject {

    @Published var event: DiscoEvent?
    @Published var activeChannelID: UUID?
    @Published var isMuted: Bool = true
    @Published var isPlaying: Bool = false

    private let appleMusic = AppleMusicService()
    private let spotify = SpotifyService()
    private let localAudio = LocalAudioService()

    private var syncTimer: AnyCancellable?

    // MARK: - Public API

    func load(event: DiscoEvent) {
        self.event = event
        self.activeChannelID = event.channels.first?.id
        startSyncLoop()
    }

    func tuneIn(to channelID: UUID) {
        activeChannelID = channelID
        isMuted = false
        syncNow()
    }

    func tuneOut() {
        isMuted = true
        appleMusic.setVolume(0)
        spotify.setVolume(0)
        localAudio.setVolume(0)
    }

    func setMuted(_ muted: Bool) {
        isMuted = muted
        if muted {
            tuneOut()
        } else {
            syncNow()
        }
    }

    // MARK: - Sync Loop

    /// Runs every second to keep playback on track
    private func startSyncLoop() {
        syncTimer?.cancel()
        syncTimer = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                Task { @MainActor in
                    self?.syncNow()
                }
            }
        syncNow()
    }

    private func syncNow() {
        guard let event, let channelID = activeChannelID,
              let channel = event.channels.first(where: { $0.id == channelID }) else { return }

        guard event.hasStarted else {
            isPlaying = false
            return
        }

        guard let position = channel.playbackPosition(for: event.currentOffset) else { return }

        isPlaying = true
        let volume: Float = isMuted ? 0 : 1

        switch channel.source {
        case .appleMusic:
            Task {
                await appleMusic.play(
                    track: position.track,
                    channel: channel,
                    atPosition: position.positionSeconds,
                    volume: volume
                )
            }
        case .spotify:
            Task {
                await spotify.play(
                    track: position.track,
                    channel: channel,
                    atPosition: position.positionSeconds,
                    volume: volume
                )
            }
        case .localFiles:
            Task {
                await localAudio.play(
                    track: position.track,
                    atPosition: position.positionSeconds,
                    volume: volume
                )
            }
        }
    }

    func stop() {
        syncTimer?.cancel()
        appleMusic.stop()
        spotify.stop()
        localAudio.stop()
        isPlaying = false
    }
}
