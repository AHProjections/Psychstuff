import SwiftUI
import MusicKit

/// The main setup screen — same for everyone.
/// Pick a source, add channels, set a start time, then go.
struct SetupView: View {

    @State private var channels: [Channel] = []
    @State private var startTime: Date = Date().addingTimeInterval(300) // default: 5 min from now
    @State private var showAddChannel = false
    @State private var showQRCode = false
    @State private var showQRScanner = false
    @State private var navigateToPlayer = false
    @State private var builtEvent: DiscoEvent?

    var body: some View {
        NavigationStack {
            Form {
                // MARK: Start Time
                Section("Start Time") {
                    DatePicker(
                        "When does it start?",
                        selection: $startTime,
                        in: Date.now...,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    if startTime <= Date.now.addingTimeInterval(10) {
                        Label("Start time must be in the future", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                            .font(.caption)
                    }
                }

                // MARK: Channels
                Section {
                    ForEach(channels) { channel in
                        ChannelRowView(channel: channel)
                    }
                    .onDelete { channels.remove(atOffsets: $0) }
                    .onMove { channels.move(fromOffsets: $0, toOffset: $1) }

                    Button {
                        showAddChannel = true
                    } label: {
                        Label("Add Channel", systemImage: "plus.circle")
                    }
                    .disabled(channels.count >= 4)
                } header: {
                    Text("Channels (up to 4)")
                } footer: {
                    Text("Each channel is a playlist. Everyone at the event can switch between them.")
                        .font(.caption)
                }

                // MARK: Actions
                Section {
                    Button {
                        showQRScanner = true
                    } label: {
                        Label("Scan QR to Copy Settings", systemImage: "qrcode.viewfinder")
                    }

                    if canStart {
                        Button {
                            showQRCode = true
                        } label: {
                            Label("Share as QR Code", systemImage: "qrcode")
                        }

                        Button {
                            startDisco()
                        } label: {
                            Label(
                                startTime <= Date.now ? "Join Now" : "Set Up & Wait",
                                systemImage: "headphones"
                            )
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.purple)
                    }
                }
            }
            .navigationTitle("Silent Disco")
            .toolbar {
                EditButton()
            }
            .sheet(isPresented: $showAddChannel) {
                AddChannelView { newChannel in
                    channels.append(newChannel)
                }
            }
            .sheet(isPresented: $showQRCode) {
                if let event = builtEvent ?? buildEvent() {
                    QRCodeView(event: event)
                }
            }
            .sheet(isPresented: $showQRScanner) {
                QRScannerView { scannedEvent in
                    applyScannedEvent(scannedEvent)
                }
            }
            .navigationDestination(isPresented: $navigateToPlayer) {
                if let event = builtEvent {
                    PlayerView(event: event)
                }
            }
        }
    }

    private var canStart: Bool {
        !channels.isEmpty && channels.allSatisfy { !$0.tracks.isEmpty }
    }

    private func buildEvent() -> DiscoEvent? {
        guard canStart else { return nil }
        return DiscoEvent(startTime: startTime, channels: channels)
    }

    private func startDisco() {
        builtEvent = buildEvent()
        navigateToPlayer = true
    }

    private func applyScannedEvent(_ event: DiscoEvent) {
        channels = event.channels
        startTime = event.startTime
    }
}

// MARK: - Channel Row

private struct ChannelRowView: View {
    let channel: Channel

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(channel.name).font(.headline)
            HStack {
                Image(systemName: channel.source.iconName)
                    .foregroundStyle(channel.source.color)
                Text(channel.source.displayName)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(channel.tracks.count) tracks")
                    .foregroundStyle(.secondary)
            }
            .font(.caption)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Source Display Helpers

extension ChannelSource {
    var iconName: String {
        switch self {
        case .appleMusic: return "music.note"
        case .spotify:    return "music.note.list"
        case .localFiles: return "folder"
        }
    }

    var displayName: String {
        switch self {
        case .appleMusic: return "Apple Music"
        case .spotify:    return "Spotify"
        case .localFiles: return "Local Files"
        }
    }

    var color: Color {
        switch self {
        case .appleMusic: return .red
        case .spotify:    return .green
        case .localFiles: return .blue
        }
    }
}
