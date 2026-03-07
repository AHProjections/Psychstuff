import SwiftUI
import CoreImage.CIFilterBuiltins

/// Displays a QR code encoding the full event configuration.
/// Anyone who scans it gets the same start time, channels, and track list.
struct QRCodeView: View {

    let event: DiscoEvent
    @Environment(\.dismiss) private var dismiss

    private var qrImage: UIImage? {
        generateQR(for: event)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Text("Share Event Settings")
                    .font(.title2.bold())

                Text("Others can scan this to copy your start time and channels.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                if let image = qrImage {
                    Image(uiImage: image)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 260, height: 260)
                        .padding(16)
                        .background(.white, in: RoundedRectangle(cornerRadius: 16))
                        .shadow(radius: 8)
                } else {
                    ContentUnavailableView("Could not generate QR", systemImage: "qrcode")
                }

                VStack(alignment: .leading, spacing: 8) {
                    Label(
                        "Starts: \(event.startTime.formatted(date: .abbreviated, time: .shortened))",
                        systemImage: "clock"
                    )
                    Label(
                        "\(event.channels.count) channel\(event.channels.count == 1 ? "" : "s")",
                        systemImage: "music.note.list"
                    )
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                Spacer()
            }
            .padding()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func generateQR(for event: DiscoEvent) -> UIImage? {
        let payload = QRPayload(from: event)
        guard let data = try? JSONEncoder().encode(payload) else { return nil }

        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = data
        filter.correctionLevel = "M"

        guard let output = filter.outputImage else { return nil }

        // Scale up so it renders crisply
        let scale = CGAffineTransform(scaleX: 10, y: 10)
        let scaled = output.transformed(by: scale)

        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
