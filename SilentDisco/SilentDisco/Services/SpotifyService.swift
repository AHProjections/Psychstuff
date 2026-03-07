import Foundation

/// Controls Spotify playback via the Spotify App Remote SDK.
///
/// Setup required:
/// 1. Register your app at developer.spotify.com → get a Client ID
/// 2. Add the Spotify iOS SDK via SPM or CocoaPods
/// 3. Set SpotifyClientID and SpotifyRedirectURL in Info.plist
/// 4. Users must have Spotify app installed + Premium account
///
/// SDK repo: https://github.com/spotify/ios-sdk
final class SpotifyService: NSObject {

    // Replace with your Spotify Developer Dashboard Client ID
    private let clientID = "YOUR_SPOTIFY_CLIENT_ID"
    private let redirectURL = URL(string: "silentdisco://spotify-callback")!

    // SPTAppRemote instance — typed as Any to avoid compile errors
    // when SDK is not yet linked. Replace with SPTAppRemote once SDK is added.
    private var appRemote: AnyObject?
    private var currentTrackURI: String?
    private var pendingPosition: TimeInterval?
    private var pendingVolume: Float = 1.0
    private var isConnected = false

    // MARK: - Connection

    func connect() {
        // Uncomment once Spotify iOS SDK is added to the project:
        //
        // let config = SPTConfiguration(clientID: clientID, redirectURL: redirectURL)
        // appRemote = SPTAppRemote(configuration: config, logLevel: .none)
        // (appRemote as? SPTAppRemote)?.delegate = self
        // (appRemote as? SPTAppRemote)?.authorizeAndPlayURI("")
        print("[Spotify] SDK not yet linked — add via SPM: https://github.com/spotify/ios-sdk")
    }

    func disconnect() {
        // (appRemote as? SPTAppRemote)?.disconnect()
        isConnected = false
    }

    // MARK: - Playback

    func play(track: TrackInfo, channel: Channel, atPosition position: TimeInterval, volume: Float) async {
        guard case .spotify = channel.source else { return }

        pendingPosition = position
        pendingVolume = volume

        guard isConnected else {
            connect()
            return
        }

        playTrack(uri: track.id, atPosition: position, volume: volume)
    }

    private func playTrack(uri: String, atPosition position: TimeInterval, volume: Float) {
        // Uncomment once SDK is linked:
        //
        // guard let remote = appRemote as? SPTAppRemote,
        //       let playerAPI = remote.playerAPI else { return }
        //
        // if currentTrackURI != uri {
        //     currentTrackURI = uri
        //     playerAPI.play(uri) { _, error in
        //         if error == nil {
        //             let ms = Int(position * 1000)
        //             playerAPI.seek(toPosition: ms) { _, _ in }
        //         }
        //     }
        // } else {
        //     playerAPI.getPlayerState { [weak self] result, error in
        //         guard let state = result as? SPTAppRemotePlayerState else { return }
        //         let currentMs = state.playbackPosition
        //         let targetMs = Int(position * 1000)
        //         if abs(currentMs - targetMs) > 2000 {
        //             playerAPI.seek(toPosition: targetMs) { _, _ in }
        //         }
        //         if state.isPaused {
        //             playerAPI.resume(nil)
        //         }
        //     }
        // }
        //
        // self.setVolume(volume)

        print("[Spotify] playTrack called — SDK stub, uri: \(uri), pos: \(position)s")
    }

    func setVolume(_ volume: Float) {
        // (appRemote as? SPTAppRemote)?.playerAPI?.setVolume(volume, callback: nil)
        print("[Spotify] setVolume: \(volume)")
    }

    func stop() {
        // (appRemote as? SPTAppRemote)?.playerAPI?.pause(nil)
        currentTrackURI = nil
        isConnected = false
    }

    // MARK: - Playlist Fetch
    // Uses Spotify Web API — requires a server-side token or PKCE auth flow

    func fetchTracks(playlistURI: String) async throws -> [TrackInfo] {
        // Extract playlist ID from URI: "spotify:playlist:XXXXX"
        let playlistID = playlistURI.components(separatedBy: ":").last ?? playlistURI

        // You'll need a valid Spotify access token (obtained via OAuth PKCE flow)
        // This is a placeholder — wire up SpotifyAuthService for real tokens
        let token = "YOUR_ACCESS_TOKEN"

        let url = URL(string: "https://api.spotify.com/v1/playlists/\(playlistID)/tracks?limit=100")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(SpotifyTracksResponse.self, from: data)

        return response.items.compactMap { item -> TrackInfo? in
            guard let track = item.track else { return nil }
            return TrackInfo(
                id: track.uri,
                title: track.name,
                artist: track.artists.first?.name ?? "",
                durationSeconds: TimeInterval(track.duration_ms) / 1000,
                albumArtURL: track.album.images.first.flatMap { URL(string: $0.url) }
            )
        }
    }
}

// MARK: - Spotify API Response Models

private struct SpotifyTracksResponse: Decodable {
    let items: [SpotifyPlaylistItem]
}

private struct SpotifyPlaylistItem: Decodable {
    let track: SpotifyTrack?
}

private struct SpotifyTrack: Decodable {
    let uri: String
    let name: String
    let duration_ms: Int
    let artists: [SpotifyArtist]
    let album: SpotifyAlbum
}

private struct SpotifyArtist: Decodable {
    let name: String
}

private struct SpotifyAlbum: Decodable {
    let images: [SpotifyImage]
}

private struct SpotifyImage: Decodable {
    let url: String
}

// MARK: - SPTAppRemoteDelegate stub
// Uncomment and implement once SDK is linked:
//
// extension SpotifyService: SPTAppRemoteDelegate {
//     func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
//         isConnected = true
//         if let uri = pendingTrackURI, let pos = pendingPosition {
//             playTrack(uri: uri, atPosition: pos, volume: pendingVolume)
//         }
//     }
//     func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
//         isConnected = false
//     }
//     func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {
//         isConnected = false
//     }
// }
