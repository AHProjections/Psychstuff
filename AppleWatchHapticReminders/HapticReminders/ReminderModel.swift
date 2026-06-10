import Foundation
import UserNotifications
import WatchKit

// MARK: - Schedule types

enum ScheduleMode: String, CaseIterable, Identifiable {
    case interval = "Interval"
    case times = "Custom Times"
    var id: String { rawValue }
}

struct CustomTime: Codable, Identifiable, Hashable {
    var id = UUID()
    var hour: Int
    var minute: Int

    var label: String {
        let date = Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: .now) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }
}

// MARK: - ReminderModel
//
// All reminders are repeating UNCalendarNotificationTriggers. Notification
// haptics fire even in silent mode, and the time-sensitive interruption
// level lets them break through Focus / Do Not Disturb. Because the
// triggers repeat, nothing needs to run in the background — watchOS
// delivers them indefinitely.

@MainActor
final class ReminderModel: ObservableObject {

    /// Interval choices that divide evenly into an hour, so a fixed set of
    /// repeating minute-of-hour triggers covers the whole day.
    static let intervalOptions = [5, 10, 15, 20, 30, 60]

    /// watchOS caps pending notification requests at 64 per app.
    static let alarmLimit = 64

    @Published var enabled: Bool { didSet { persistAndReschedule() } }
    @Published var mode: ScheduleMode { didSet { persistAndReschedule() } }
    @Published var intervalMinutes: Int { didSet { clampOffset(); persistAndReschedule() } }
    @Published var offsetMinutes: Int { didSet { persistAndReschedule() } }
    @Published var quietHoursEnabled: Bool { didSet { persistAndReschedule() } }
    @Published var quietStartHour: Int { didSet { persistAndReschedule() } }
    @Published var quietEndHour: Int { didSet { persistAndReschedule() } }
    @Published var customTimes: [CustomTime] { didSet { persistAndReschedule() } }

    @Published private(set) var authorizationDenied = false
    @Published private(set) var scheduledCount = 0
    @Published private(set) var truncated = false
    @Published private(set) var nextFireDate: Date?

    private let defaults = UserDefaults.standard
    private var rescheduleTask: Task<Void, Never>?

    private enum Keys {
        static let enabled = "enabled"
        static let mode = "mode"
        static let interval = "intervalMinutes"
        static let offset = "offsetMinutes"
        static let quietEnabled = "quietHoursEnabled"
        static let quietStart = "quietStartHour"
        static let quietEnd = "quietEndHour"
        static let times = "customTimes"
    }

    init() {
        let d = UserDefaults.standard
        enabled = d.object(forKey: Keys.enabled) as? Bool ?? true
        mode = ScheduleMode(rawValue: d.string(forKey: Keys.mode) ?? "") ?? .interval
        intervalMinutes = d.object(forKey: Keys.interval) as? Int ?? 15
        offsetMinutes = d.object(forKey: Keys.offset) as? Int ?? 0
        quietHoursEnabled = d.bool(forKey: Keys.quietEnabled)
        quietStartHour = d.object(forKey: Keys.quietStart) as? Int ?? 22
        quietEndHour = d.object(forKey: Keys.quietEnd) as? Int ?? 8
        if let data = d.data(forKey: Keys.times),
           let decoded = try? JSONDecoder().decode([CustomTime].self, from: data) {
            customTimes = decoded
        } else {
            customTimes = []
        }
    }

    // MARK: - Public API

    /// Request permission and bring the pending schedule in sync with settings.
    func onLaunch() async {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound])
            authorizationDenied = !granted
        } catch {
            authorizationDenied = true
        }
        await reschedule()
    }

    func playTestHaptic() {
        WKInterfaceDevice.current().play(.notification)
    }

    func addTime(hour: Int, minute: Int) {
        guard !customTimes.contains(where: { $0.hour == hour && $0.minute == minute }) else { return }
        customTimes.append(CustomTime(hour: hour, minute: minute))
        customTimes.sort { ($0.hour, $0.minute) < ($1.hour, $1.minute) }
    }

    func removeTimes(at offsets: IndexSet) {
        customTimes.remove(atOffsets: offsets)
    }

    /// Valid "minutes past the hour" anchors for the current interval.
    var offsetOptions: [Int] {
        Array(stride(from: 0, to: intervalMinutes, by: 5))
    }

    // MARK: - Persistence

    private func persist() {
        defaults.set(enabled, forKey: Keys.enabled)
        defaults.set(mode.rawValue, forKey: Keys.mode)
        defaults.set(intervalMinutes, forKey: Keys.interval)
        defaults.set(offsetMinutes, forKey: Keys.offset)
        defaults.set(quietHoursEnabled, forKey: Keys.quietEnabled)
        defaults.set(quietStartHour, forKey: Keys.quietStart)
        defaults.set(quietEndHour, forKey: Keys.quietEnd)
        if let data = try? JSONEncoder().encode(customTimes) {
            defaults.set(data, forKey: Keys.times)
        }
    }

    private func persistAndReschedule() {
        persist()
        rescheduleTask?.cancel()
        rescheduleTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            await self?.reschedule()
        }
    }

    private func clampOffset() {
        if offsetMinutes >= intervalMinutes {
            offsetMinutes = 0
        }
    }

    // MARK: - Scheduling

    func reschedule() async {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        scheduledCount = 0
        truncated = false
        nextFireDate = nil
        guard enabled else { return }

        let (components, wasTruncated) = fireComponents()
        truncated = wasTruncated
        guard !components.isEmpty else { return }

        let content = UNMutableNotificationContent()
        content.title = "Time check"
        content.sound = .default
        content.interruptionLevel = .timeSensitive

        for (index, comps) in components.enumerated() {
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
            let request = UNNotificationRequest(
                identifier: "haptic-reminder-\(index)",
                content: content,
                trigger: trigger
            )
            try? await center.add(request)
        }

        scheduledCount = components.count
        nextFireDate = components
            .compactMap { Calendar.current.nextDate(after: .now, matching: $0, matchingPolicy: .nextTime) }
            .min()
    }

    /// Date components for every repeating trigger needed by the current
    /// settings. Minute-only components repeat every hour; hour+minute
    /// components repeat daily (used when quiet hours restrict the schedule).
    private func fireComponents() -> (components: [DateComponents], truncated: Bool) {
        var list: [DateComponents] = []

        switch mode {
        case .interval:
            var minutes: [Int] = []
            if intervalMinutes >= 60 {
                minutes = [offsetMinutes % 60]
            } else {
                var m = offsetMinutes % intervalMinutes
                while m < 60 {
                    minutes.append(m)
                    m += intervalMinutes
                }
            }
            if quietHoursEnabled {
                for hour in activeHours {
                    for minute in minutes {
                        list.append(DateComponents(hour: hour, minute: minute))
                    }
                }
            } else {
                list = minutes.map { DateComponents(minute: $0) }
            }

        case .times:
            for time in customTimes where !isQuietHour(time.hour) {
                list.append(DateComponents(hour: time.hour, minute: time.minute))
            }
        }

        if list.count > Self.alarmLimit {
            list.sort { ($0.hour ?? -1, $0.minute ?? 0) < ($1.hour ?? -1, $1.minute ?? 0) }
            return (Array(list.prefix(Self.alarmLimit)), true)
        }
        return (list, false)
    }

    private var activeHours: [Int] {
        (0..<24).filter { !isQuietHour($0) }
    }

    private func isQuietHour(_ hour: Int) -> Bool {
        guard quietHoursEnabled, quietStartHour != quietEndHour else { return false }
        if quietStartHour < quietEndHour {
            return hour >= quietStartHour && hour < quietEndHour
        } else {
            return hour >= quietStartHour || hour < quietEndHour
        }
    }
}
