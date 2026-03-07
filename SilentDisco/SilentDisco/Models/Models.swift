import Foundation

// MARK: - Event

/// The full configuration for a silent disco session.
/// Shared via QR code. Anyone can create one; anyone can scan one.
struct DiscoEvent: Codable, Identifiable {
    var id: UUID = UUID()
    var startTime: Date           // Absolute clock time the playlist started
    var channels: [Channel]

    /// Seconds elapsed since the event started
    var currentOffset: TimeInterval {
        max(0, Date.now.timeIntervalSince(startTime))
    }

    /// True if the event has started
    var hasStarted: Bool {
        Date.now >= startTime
    }
}

// MARK: - Channel

struct Channel: Codable, Identifiable {
    var id: UUID = UUID()
    var name: String
    var source: ChannelSource
    var tracks: [TrackInfo]

    /// Total duration of all tracks in seconds
    var totalDuration: TimeInterval {
        tracks.reduce(0) { $0 + $1.durationSeconds }
    }

    /// Given an event offset, find which track to play and at what position within it
    func playbackPosition(for offset: TimeInterval) -> PlaybackPosition? {
        guard !tracks.isEmpty else { return nil }

        var remaining = offset.truncatingRemainder(dividingBy: totalDuration > 0 ? totalDuration : 1)
        for (index, track) in tracks.enumerated() {
            if remaining < track.durationSeconds {
                return PlaybackPosition(trackIndex: index, track: track, positionSeconds: remaining)
            }
            remaining -= track.durationSeconds
        }
        // Fallback to first track
        return PlaybackPosition(trackIndex: 0, track: tracks[0], positionSeconds: 0)
    }
}

// MARK: - Channel Source

enum ChannelSource: Codable, Equatable {
    case appleMusic(playlistID: String)
    case spotify(playlistURI: String)
    case localFiles  // tracks stored in app's documents directory
}

// MARK: - Track Info

struct TrackInfo: Codable, Identifiable {
    var id: String           // Apple Music track ID, Spotify URI, or local filename
    var title: String
    var artist: String
    var durationSeconds: TimeInterval
    var albumArtURL: URL?    // Optional, for display only
}

// MARK: - Playback Position

struct PlaybackPosition {
    let trackIndex: Int
    let track: TrackInfo
    let positionSeconds: TimeInterval
}

// MARK: - QR Payload

/// Lightweight version for QR encoding (keeps QR small)
struct QRPayload: Codable {
    let eventID: UUID
    let startTimestamp: TimeInterval   // Unix timestamp
    let channels: [QRChannel]

    init(from event: DiscoEvent) {
        self.eventID = event.id
        self.startTimestamp = event.startTime.timeIntervalSince1970
        self.channels = event.channels.map { QRChannel(from: $0) }
    }

    func toEvent() -> DiscoEvent {
        var event = DiscoEvent(
            startTime: Date(timeIntervalSince1970: startTimestamp),
            channels: channels.map { $0.toChannel() }
        )
        event.id = eventID
        return event
    }
}

struct QRChannel: Codable {
    let id: UUID
    let name: String
    let source: ChannelSource
    let tracks: [TrackInfo]

    init(from channel: Channel) {
        self.id = channel.id
        self.name = channel.name
        self.source = channel.source
        self.tracks = channel.tracks
    }

    func toChannel() -> Channel {
        var ch = Channel(name: name, source: source, tracks: tracks)
        ch.id = id
        return ch
    }
}
