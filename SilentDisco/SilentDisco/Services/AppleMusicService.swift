import Foundation
import MusicKit

/// Controls Apple Music playback via MusicKit.
/// Requires MusicKit entitlement and user's Apple Music subscription.
final class AppleMusicService {

    private var currentTrackID: String?
    private var currentVolume: Float = 1.0

    // MARK: - Auth

    func requestAuthorization() async -> Bool {
        let status = await MusicAuthorization.request()
        return status == .authorized
    }

    // MARK: - Playback

    func play(track: TrackInfo, channel: Channel, atPosition position: TimeInterval, volume: Float) async {
        guard case .appleMusic(let playlistID) = channel.source else { return }

        let player = ApplicationMusicPlayer.shared

        // Only re-queue if the track has changed (avoids constant interruptions)
        if currentTrackID != track.id {
            currentTrackID = track.id

            do {
                // Fetch the track from MusicKit catalog
                let musicItemID = MusicItemID(track.id)
                var request = MusicCatalogResourceRequest<Song>(matching: \.id, equalTo: musicItemID)
                request.limit = 1
                let response = try await request.response()

                guard let song = response.items.first else { return }

                player.queue = ApplicationMusicPlayer.Queue(for: [song])
                try await player.play()

                // Seek to correct position
                player.playbackTime = position

            } catch {
                print("[AppleMusic] Playback error: \(error)")
            }
        } else {
            // Same track — just correct drift if needed
            let drift = abs(player.playbackTime - position)
            if drift > 2.0 {
                // Only re-seek if we're more than 2 seconds off
                player.playbackTime = position
            }

            if player.state.playbackStatus != .playing {
                try? await player.play()
            }
        }

        setVolume(volume)
        currentVolume = volume
    }

    func setVolume(_ volume: Float) {
        // MusicKit doesn't expose a direct volume property;
        // use AVAudioSession output volume workaround or system volume
        // For now we store intent and apply via SystemMusicPlayer if needed
        currentVolume = volume
        ApplicationMusicPlayer.shared.volume = volume
    }

    func stop() {
        ApplicationMusicPlayer.shared.stop()
        currentTrackID = nil
    }

    // MARK: - Playlist Fetch

    /// Fetches track list + durations for a playlist by ID.
    /// Called once during setup; result is stored in the event config.
    func fetchTracks(playlistID: String) async throws -> [TrackInfo] {
        let id = MusicItemID(playlistID)
        var request = MusicCatalogResourceRequest<Playlist>(matching: \.id, equalTo: id)
        request.properties = [.tracks]
        let response = try await request.response()

        guard let playlist = response.items.first,
              let tracks = playlist.tracks else { return [] }

        return tracks.compactMap { track -> TrackInfo? in
            guard let song = track.base as? Song,
                  let duration = song.duration else { return nil }
            return TrackInfo(
                id: song.id.rawValue,
                title: song.title,
                artist: song.artistName,
                durationSeconds: duration,
                albumArtURL: song.artwork?.url(width: 300, height: 300)
            )
        }
    }
}
