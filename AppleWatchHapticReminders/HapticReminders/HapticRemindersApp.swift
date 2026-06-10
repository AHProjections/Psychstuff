import SwiftUI
import UserNotifications
import WatchKit

@main
struct HapticRemindersApp: App {
    @StateObject private var model = ReminderModel()
    @Environment(\.scenePhase) private var scenePhase
    private let notificationDelegate = NotificationDelegate()

    init() {
        UNUserNotificationCenter.current().delegate = notificationDelegate
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .task {
                    await model.onLaunch()
                }
                .onChange(of: scenePhase) { phase in
                    if phase == .active {
                        Task { await model.reschedule() }
                    }
                }
        }
    }
}

/// Plays the haptic even when a reminder lands while the app is open
/// (notifications are otherwise silenced for the foreground app).
final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        await MainActor.run {
            WKInterfaceDevice.current().play(.notification)
        }
        return [.banner]
    }
}
