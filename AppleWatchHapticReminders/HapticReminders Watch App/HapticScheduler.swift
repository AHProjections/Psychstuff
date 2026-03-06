import WatchKit
import Combine

// MARK: - Haptic Type

enum HapticType: String, CaseIterable, Identifiable {
    case notification = "Notification"
    case click        = "Click"
    case directionUp  = "Direction Up"
    case success      = "Success"
    case retry        = "Retry"

    var id: String { rawValue }

    var wkType: WKHapticType {
        switch self {
        case .notification: return .notification
        case .click:        return .click
        case .directionUp:  return .directionUp
        case .success:      return .success
        case .retry:        return .retry
        }
    }

    var icon: String {
        switch self {
        case .notification: return "bell.fill"
        case .click:        return "circle.fill"
        case .directionUp:  return "arrow.up.circle.fill"
        case .success:      return "checkmark.circle.fill"
        case .retry:        return "arrow.clockwise.circle.fill"
        }
    }
}

// MARK: - Interval Config

/// Everything needed to describe when haptics should fire.
struct IntervalConfig {
    /// Length of one interval, in minutes. Range: 1–240.
    var minutes: Int = 30

    /// When true the timer aligns to clock boundaries
    /// (e.g. :00, :30 for 30-min intervals) instead of starting
    /// a fresh countdown from the moment Start is tapped.
    var alignToClock: Bool = true

    /// How many haptic pulses to play per reminder (1–3).
    var tapsPerReminder: Int = 1
}

// MARK: - HapticScheduler

@MainActor
final class HapticScheduler: NSObject, ObservableObject {

    @Published var isRunning      = false
    @Published var config         = IntervalConfig()
    @Published var hapticType     : HapticType = .notification
    @Published var nextFireDate   : Date?
    /// Set to the session-start time initially, then updated on every tap.
    @Published var lastFiredDate  : Date?
    @Published var tapCount       : Int = 0

    private var session       : WKExtendedRuntimeSession?
    private var hapticTimer   : Timer?
    private var multiTapTimer : Timer?

    // MARK: - Public API

    func start() {
        guard !isRunning else { return }
        let s = WKExtendedRuntimeSession()
        s.delegate = self
        session = s
        s.start()
    }

    func stop() {
        cancelTimers()
        session?.invalidate()
        session       = nil
        isRunning     = false
        nextFireDate  = nil
        lastFiredDate = nil
    }

    /// Fire a one-shot preview so the user can feel the chosen haptic.
    func previewHaptic() {
        playHapticSequence()
    }

    // MARK: - Scheduling

    private func scheduleNextHaptic() {
        cancelTimers()
        let next = nextDate()
        nextFireDate = next
        let delay = max(0.1, next.timeIntervalSinceNow)

        hapticTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor in self?.fireHaptic() }
        }
    }

    private func nextDate(from now: Date = Date()) -> Date {
        if config.alignToClock {
            let cal   = Calendar.current
            let comps = cal.dateComponents([.minute, .second], from: now)
            let m     = comps.minute ?? 0
            let s     = comps.second ?? 0
            let total = m * 60 + s
            let period = config.minutes * 60
            var secsUntilNext = period - (total % period)
            if secsUntilNext < 3 { secsUntilNext += period }   // skip if too close
            return now.addingTimeInterval(Double(secsUntilNext))
        } else {
            return now.addingTimeInterval(Double(config.minutes * 60))
        }
    }

    private func fireHaptic() {
        lastFiredDate = Date()
        tapCount += 1
        playHapticSequence()
        scheduleNextHaptic()
    }

    private func playHapticSequence() {
        WKInterfaceDevice.current().play(hapticType.wkType)
        guard config.tapsPerReminder > 1 else { return }
        var fired = 1
        multiTapTimer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] t in
            guard let self else { t.invalidate(); return }
            WKInterfaceDevice.current().play(self.hapticType.wkType)
            fired += 1
            if fired >= self.config.tapsPerReminder { t.invalidate() }
        }
    }

    private func cancelTimers() {
        hapticTimer?.invalidate();   hapticTimer   = nil
        multiTapTimer?.invalidate(); multiTapTimer = nil
        nextFireDate = nil
    }
}

// MARK: - WKExtendedRuntimeSessionDelegate

extension HapticScheduler: WKExtendedRuntimeSessionDelegate {

    nonisolated func extendedRuntimeSessionDidStart(
        _ extendedRuntimeSession: WKExtendedRuntimeSession
    ) {
        Task { @MainActor in
            isRunning     = true
            lastFiredDate = Date()   // treat start as t=0 for the progress ring
            scheduleNextHaptic()
        }
    }

    /// Called ~5 s before the session expires — renew immediately so haptics
    /// keep firing without any gap.
    nonisolated func extendedRuntimeSessionWillExpire(
        _ extendedRuntimeSession: WKExtendedRuntimeSession
    ) {
        Task { @MainActor in
            cancelTimers()
            let fresh = WKExtendedRuntimeSession()
            fresh.delegate = self
            session = fresh
            fresh.start()
        }
    }

    nonisolated func extendedRuntimeSession(
        _ extendedRuntimeSession: WKExtendedRuntimeSession,
        didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason,
        error: Error?
    ) {
        Task { @MainActor in
            guard reason != .sessionEnded else { return }
            cancelTimers()
            isRunning     = false
            nextFireDate  = nil
            lastFiredDate = nil
        }
    }
}
