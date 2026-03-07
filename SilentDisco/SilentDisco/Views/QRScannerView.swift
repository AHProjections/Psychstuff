import SwiftUI
import AVFoundation

/// Camera-based QR scanner. Decodes a DiscoEvent config from QR and passes it back.
struct QRScannerView: UIViewControllerRepresentable {

    let onScanned: (DiscoEvent) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> ScannerViewController {
        let vc = ScannerViewController()
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScanned: onScanned, dismiss: dismiss)
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, ScannerViewControllerDelegate {
        let onScanned: (DiscoEvent) -> Void
        let dismiss: DismissAction

        init(onScanned: @escaping (DiscoEvent) -> Void, dismiss: DismissAction) {
            self.onScanned = onScanned
            self.dismiss = dismiss
        }

        func didScan(data: Data) {
            guard let payload = try? JSONDecoder().decode(QRPayload.self, from: data) else { return }
            let event = payload.toEvent()
            DispatchQueue.main.async {
                self.onScanned(event)
                self.dismiss()
            }
        }
    }
}

// MARK: - Scanner View Controller

protocol ScannerViewControllerDelegate: AnyObject {
    func didScan(data: Data)
}

final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {

    weak var delegate: ScannerViewControllerDelegate?
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupCamera()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        captureSession?.startRunning()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        captureSession?.stopRunning()
    }

    private func setupCamera() {
        let session = AVCaptureSession()

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            showError("Camera not available")
            return
        }

        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.frame = view.bounds
        preview.videoGravity = .resizeAspectFill
        view.layer.addSublayer(preview)
        self.previewLayer = preview

        // Overlay label
        let label = UILabel()
        label.text = "Point at a Silent Disco QR code"
        label.textColor = .white
        label.font = .systemFont(ofSize: 15, weight: .medium)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24)
        ])

        self.captureSession = session
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              object.type == .qr,
              let string = object.stringValue,
              let data = string.data(using: .utf8) else { return }

        captureSession?.stopRunning()
        delegate?.didScan(data: data)
    }

    private func showError(_ message: String) {
        let label = UILabel()
        label.text = message
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
}
