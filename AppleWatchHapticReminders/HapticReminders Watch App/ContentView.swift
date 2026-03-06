import SwiftUI

struct ContentView: View {
    @EnvironmentObject var scheduler: HapticScheduler

    var body: some View {
        NavigationStack {
            if scheduler.isRunning {
                RunningView()
            } else {
                SetupView()
            }
        }
    }
}

// MARK: - Setup (stopped state)

private struct SetupView: View {
    @EnvironmentObject var scheduler: HapticScheduler

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                Text("Haptic Reminders")
                    .font(.headline)
                    .multilineTextAlignment(.center)

                // Interval picker
                VStack(alignment: .leading, spacing: 4) {
                    Text("Interval")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("Interval", selection: $scheduler.selectedMode) {
                        ForEach(IntervalMode.allCases) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 80)
                }

                // Haptic type picker
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tap type")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("Tap type", selection: $scheduler.hapticType) {
                        ForEach(HapticType.allCases) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 80)
                }

                Button("Start") {
                    scheduler.start()
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
            .padding(.horizontal)
        }
        .navigationTitle("Setup")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Running state

private struct RunningView: View {
    @EnvironmentObject var scheduler: HapticScheduler

    var body: some View {
        VStack(spacing: 12) {

            // Status dot + label
            HStack(spacing: 6) {
                Circle()
                    .fill(.green)
                    .frame(width: 8, height: 8)
                    .overlay(
                        Circle()
                            .stroke(.green.opacity(0.4), lineWidth: 4)
                            .scaleEffect(1.5)
                    )
                Text("Running")
                    .font(.caption)
                    .foregroundStyle(.green)
            }

            Text(scheduler.selectedMode.rawValue)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            // Countdown to next tap
            if let next = scheduler.nextFireDate {
                VStack(spacing: 2) {
                    Text("Next tap")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(next, style: .timer)
                        .font(.title3.monospacedDigit())
                        .foregroundStyle(.primary)
                    Text(next, style: .time)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            // Tap counter
            Text("Taps today: \(scheduler.tapCount)")
                .font(.caption2)
                .foregroundStyle(.secondary)

            Spacer()

            Button("Stop") {
                scheduler.stop()
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        }
        .padding()
        .navigationTitle("Active")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    ContentView()
        .environmentObject(HapticScheduler())
}
