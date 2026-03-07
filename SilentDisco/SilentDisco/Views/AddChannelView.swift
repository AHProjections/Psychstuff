import SwiftUI
import MusicKit

/// Sheet for adding a new channel. Supports Apple Music, Spotify, or local files.
struct AddChannelView: View {

    let onAdd: (Channel) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var channelName: String = ""
    @State private var selectedSource: SourceType = .appleMusic
    @State private var appleMusicPlaylistID: String = ""
    @State private var spotifyPlaylistURI: String = ""
    @State private var tracks: [TrackInfo] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showFilePicker = false

    enum SourceType: String, CaseIterable, Identifiable {
        case appleMusic = "Apple Music"
        case spotify    = "Spotify"
        case localFiles = "Local Files"
        var id: Self { self }
    }

    private let appleMusic = AppleMusicService()
    private let spotify = SpotifyService()
    private let localAudio = LocalAudioService()

    var body: some View {
        NavigationStack {
            Form {
                Section("Channel Name") {
                    TextField("e.g. Floor 1, Chill Room…", text: $channelName)
                }

                Section("Source") {
                    Picker("Source", selection: $selectedSource) {
                        ForEach(SourceType.allCases) {
                            Text($0.rawValue).tag($0)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: selectedSource) { tracks = [] }
                }

                switch selectedSource {
                case .appleMusic:
                    appleMusicSection
                case .spotify:
                    spotifySection
                case .localFiles:
                    localFilesSection
                }

                if !tracks.isEmpty {
                    Section("Tracks (\(tracks.count))") {
                        ForEach(tracks) { track in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(track.title).font(.subheadline)
                                Text(track.artist).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Add Channel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { addChannel() }
                        .disabled(!canAdd)
                }
            }
            .overlay {
                if isLoading {
                    ProgressView("Loading playlist…")
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    // MARK: - Source Sections

    private var appleMusicSection: some View {
        Section {
            TextField("Playlist ID or URL", text: $appleMusicPlaylistID)
                .keyboardType(.URL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            Button("Load Playlist") {
                Task { await loadAppleMusicPlaylist() }
            }
            .disabled(appleMusicPlaylistID.isEmpty || isLoading)
        } footer: {
            Text("Paste an Apple Music playlist link or ID. The playlist must be in your library.")
        }
    }

    private var spotifySection: some View {
        Section {
            TextField("spotify:playlist:XXXXX or URL", text: $spotifyPlaylistURI)
                .keyboardType(.URL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            Button("Load Playlist") {
                Task { await loadSpotifyPlaylist() }
            }
            .disabled(spotifyPlaylistURI.isEmpty || isLoading)
        } footer: {
            Text("Paste a Spotify playlist URI or share link. Requires Spotify app + Premium.")
        }
    }

    private var localFilesSection: some View {
        Section {
            Button("Import Audio Files…") {
                showFilePicker = true
            }
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [.audio, .mp3],
                allowsMultipleSelection: true
            ) { result in
                handleFileImport(result)
            }
        } footer: {
            Text("Import MP3, AAC, FLAC, or WAV files from the Files app. Files are copied to the app.")
        }
    }

    // MARK: - Loading

    private func loadAppleMusicPlaylist() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let authorized = await appleMusic.requestAuthorization()
        guard authorized else {
            errorMessage = "Apple Music access not granted. Check Settings > Privacy > Media & Apple Music."
            return
        }

        let playlistID = extractAppleMusicID(from: appleMusicPlaylistID)
        do {
            tracks = try await appleMusic.fetchTracks(playlistID: playlistID)
            if tracks.isEmpty {
                errorMessage = "No tracks found. Make sure the playlist is in your library."
            }
        } catch {
            errorMessage = "Could not load playlist: \(error.localizedDescription)"
        }
    }

    private func loadSpotifyPlaylist() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let uri = extractSpotifyURI(from: spotifyPlaylistURI)
        do {
            tracks = try await spotify.fetchTracks(playlistURI: uri)
            if tracks.isEmpty {
                errorMessage = "No tracks found."
            }
        } catch {
            errorMessage = "Could not load playlist: \(error.localizedDescription)"
        }
    }

    private func handleFileImport(_ result: Result<[URL], Error>) {
        errorMessage = nil
        switch result {
        case .success(let urls):
            var imported: [TrackInfo] = []
            for url in urls {
                guard url.startAccessingSecurityScopedResource() else { continue }
                defer { url.stopAccessingSecurityScopedResource() }
                if let track = try? localAudio.importFile(from: url) {
                    imported.append(track)
                }
            }
            tracks.append(contentsOf: imported)
            if imported.isEmpty {
                errorMessage = "Could not import files. Check they are valid audio files."
            }
        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Helpers

    private var canAdd: Bool {
        !channelName.isEmpty && !tracks.isEmpty
    }

    private func addChannel() {
        let source: ChannelSource
        switch selectedSource {
        case .appleMusic:
            source = .appleMusic(playlistID: extractAppleMusicID(from: appleMusicPlaylistID))
        case .spotify:
            source = .spotify(playlistURI: extractSpotifyURI(from: spotifyPlaylistURI))
        case .localFiles:
            source = .localFiles
        }

        let channel = Channel(name: channelName, source: source, tracks: tracks)
        onAdd(channel)
        dismiss()
    }

    private func extractAppleMusicID(from string: String) -> String {
        // Handle full URLs like https://music.apple.com/…/playlist/…/pl.XXXXX
        if let url = URL(string: string), let last = url.pathComponents.last {
            return last
        }
        return string
    }

    private func extractSpotifyURI(from string: String) -> String {
        // Handle share URLs like https://open.spotify.com/playlist/XXXXX
        if string.hasPrefix("https://") || string.hasPrefix("http://"),
           let url = URL(string: string),
           let id = url.pathComponents.last {
            return "spotify:playlist:\(id)"
        }
        return string
    }
}
