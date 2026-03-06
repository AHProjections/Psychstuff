import WatchKit
import Combine

// MARK: - Interval Mode

enum IntervalMode: String, CaseIterable, Identifiable {
    case every15Min  = "Every 15 min"
    case every30Min  = "Every 30 min"
    case everyHour   = "Every hour"
    case quarterPast = "15 min after hour"
    case halfPast    = "30 min after hour"

    var id: String { rawValue }

    /// Returns the next Date this mode should fire, given the current time.
    func nextFireDate(from now: Date = Date()) -> Date {
        let cal = Calendar.current
        let comps = cal.dateComponents([.minute, .second], from: now)
        let minute = comps.minute ?? 0
        let second = comps.second ?? 0
        let totalSeconds = minute * 60 + second

        let secondsUntilNext: Int
        switch self {
        case .every15Min, .quarterPast:
            // Align to next multiple of 15 minutes
            let period = 15 * 60
            secondsUntilNext = period - (totalSeconds % period)

        case .every30Min, .halfPast:
            // Align to next multiple of 30 minutes
            let period = 30 * 60
            secondsUntilNext = period - (totalSeconds % period)

        case .everyHour:
            // Align to the top of the next hour
            let period = 60 * 60
            secondsUntilNext = period - (totalSeconds % period)
        }

        // Avoid firing immediately (< 3 s away) – skip to the one after
        let interval = Double(secondsUntilNext < 3 ? secondsUntilNext + intervalPeriod : secondsUntilNext)
        return now.addingTimeInterval(interval)
    }

    /// The repeating period in seconds for this mode.
    var intervalPeriod: Int {
        switch self {
        case .every15Min, .quarterPast: return 15 * 60
        case .every30Min, .halfPast:    return 30 * 60
        case .everyHour:                return 60 * 60
        }
    }
}

// MARK: - Haptic Type

enum HapticType: String, CaseIterable, Identifiable {
    case notification = "Notification"
    case click        = "Click"
    case directionUp  = "Direction Up"
    case success      = "Success"
    case retry        = "Retry"

    var id: String { rawValue }

    var hapticType: WKHapticType {
        switch self {
        case .notification: return .notification
        case .click:        return .click
        case .directionUp:  return .directionUp
        case .success:      return .success
        case .retry:        return .retry
        }
    }
}

// MARK: - HapticScheduler

@MainActor
final class HapticScheduler: NSObject, ObservableObject {

    @Published var isRunning     = false
    @Published var selectedMode  : IntervalMode = .every30Min
    @Published var hapticType    : HapticType   = .notification
    @Published var nextFireDate  : Date?
    @Published var tapCount      : Int = 0

    private var session  : WKExtendedRuntimeSession?
    private var timer    : Timer?

    // MARK: - Public API

    func start() {
        guard !isRunning else { return }
        let s = WKExtendedRuntimeSession()
        s.delegate = self
        session = s
        s.start()
    }

    func stop() {
        cancelTimer()
        session?.invalidate()
        session    = nil
        isRunning  = false
        nextFireDate = nil
    }

    // MARK: - Private

    private func scheduleNextHaptic() {
        cancelTimer()
        let next = selectedMode.nextFireDate()
        nextFireDate = next
        let delay = max(0, next.timeIntervalSinceNow)

        timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.fireHaptic()
            }
        }
    }

    private func fireHaptic() {
        WKInterfaceDevice.current().play(hapticType.hapticType)
        tapCount += 1
        scheduleNextHaptic()
    }

    private func cancelTimer() {
        timer?.invalidate()
        timer = nil
        nextFireDate = nil
    }
}

// MARK: - WKExtendedRuntimeSessionDelegate

extension HapticScheduler: WKExtendedRuntimeSessionDelegate {

    nonisolated func extendedRuntimeSessionDidStart(
        _ extendedRuntimeSession: WKExtendedRuntimeSession
    ) {
        Task { @MainActor in
            isRunning = true
            scheduleNextHaptic()
        }
    }

    /// Called ~5 seconds before the session expires. Start a fresh session so
    /// coverage is continuous.
    nonisolated func extendedRuntimeSessionWillExpire(
        _ extendedRuntimeSession: WKExtendedRuntimeSession
    ) {
        Task { @MainActor in
            cancelTimer()
            let s = WKExtendedRuntimeSession()
            s.delegate = self
            session = s
            s.start()
        }
    }

    nonisolated func extendedRuntimeSession(
        _ extendedRuntimeSession: WKExtendedRuntimeSession,
        didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason,
        error: Error?
    ) {
        Task { @MainActor in
            // .sessionEnded means we invalidated it ourselves – ignore
            guard reason != .sessionEnded else { return }
            cancelTimer()
            isRunning  = false
            nextFireDate = nil
        }
    }
}
