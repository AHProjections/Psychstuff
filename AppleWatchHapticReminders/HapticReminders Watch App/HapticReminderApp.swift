import SwiftUI

@main
struct HapticReminderApp: App {

    @StateObject private var scheduler = HapticScheduler()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(scheduler)
        }
    }
}
