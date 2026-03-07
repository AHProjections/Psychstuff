import Foundation
import AVFoundation
import UniformTypeIdentifiers

/// Plays locally imported audio files (MP3, AAC, FLAC, WAV, etc.)
/// Files are stored in the app's Documents/Tracks/ directory.
final class LocalAudioService: NSObject {

    private var player: AVAudioPlayer?
    private var currentFilename: String?

    // MARK: - Setup

    static var tracksDirectory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let dir = docs.appendingPathComponent("Tracks", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// Configure audio session for background playback
    static func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: []
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[LocalAudio] Audio session error: \(error)")
        }
    }

    // MARK: - Playback

    func play(track: TrackInfo, atPosition position: TimeInterval, volume: Float) async {
        let fileURL = Self.tracksDirectory.appendingPathComponent(track.id)

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            print("[LocalAudio] File not found: \(track.id)")
            return
        }

        if currentFilename != track.id {
            // New track — create a fresh player
            currentFilename = track.id
            do {
                player = try AVAudioPlayer(contentsOf: fileURL)
                player?.delegate = self
                player?.prepareToPlay()
                player?.currentTime = position
                player?.volume = volume
                player?.play()
            } catch {
                print("[LocalAudio] Failed to load \(track.id): \(error)")
            }
        } else if let player {
            // Same track — correct drift if needed
            let drift = abs(player.currentTime - position)
            if drift > 2.0 {
                player.currentTime = position
            }
            player.volume = volume
            if !player.isPlaying {
                player.play()
            }
        }
    }

    func setVolume(_ volume: Float) {
        player?.volume = volume
    }

    func stop() {
        player?.stop()
        player = nil
        currentFilename = nil
    }

    // MARK: - File Import

    /// Imports an audio file into the Tracks directory, returning a TrackInfo
    func importFile(from sourceURL: URL) throws -> TrackInfo {
        let filename = sourceURL.lastPathComponent
        let destination = Self.tracksDirectory.appendingPathComponent(filename)

        if !FileManager.default.fileExists(atPath: destination.path) {
            try FileManager.default.copyItem(at: sourceURL, to: destination)
        }

        let asset = AVURLAsset(url: destination)
        let duration = CMTimeGetSeconds(asset.duration)

        // Extract metadata
        var title = filename
        var artist = ""
        for format in asset.availableMetadataFormats {
            let items = asset.metadata(forFormat: format)
            for item in items {
                if item.commonKey == .commonKeyTitle, let val = item.stringValue {
                    title = val
                }
                if item.commonKey == .commonKeyArtist, let val = item.stringValue {
                    artist = val
                }
            }
        }

        return TrackInfo(
            id: filename,
            title: title,
            artist: artist,
            durationSeconds: duration > 0 ? duration : 0
        )
    }

    /// Lists all imported track filenames
    func listImportedFiles() -> [String] {
        (try? FileManager.default.contentsOfDirectory(atPath: Self.tracksDirectory.path)) ?? []
    }

    /// Deletes a track file
    func deleteFile(filename: String) throws {
        let url = Self.tracksDirectory.appendingPathComponent(filename)
        try FileManager.default.removeItem(at: url)
    }
}

extension LocalAudioService: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        // SyncEngine handles track progression via the clock — nothing needed here
    }
}
