import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: ReminderModel

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Reminders", isOn: $model.enabled)
                    if model.enabled, let next = model.nextFireDate {
                        LabeledContent("Next", value: next.formatted(date: .omitted, time: .shortened))
                    }
                } footer: {
                    if model.authorizationDenied {
                        Text("Notifications are off. Allow them for this app in Settings → Notifications on your watch.")
                            .foregroundStyle(.red)
                    }
                }

                Section("Schedule") {
                    Picker("Mode", selection: $model.mode) {
                        ForEach(ScheduleMode.allCases) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }

                    if model.mode == .interval {
                        Picker("Every", selection: $model.intervalMinutes) {
                            ForEach(ReminderModel.intervalOptions, id: \.self) { minutes in
                                Text(intervalLabel(minutes)).tag(minutes)
                            }
                        }
                        if model.offsetOptions.count > 1 {
                            Picker("Starting at", selection: $model.offsetMinutes) {
                                ForEach(model.offsetOptions, id: \.self) { offset in
                                    Text(offsetLabel(offset)).tag(offset)
                                }
                            }
                        }
                    } else {
                        NavigationLink {
                            CustomTimesView()
                        } label: {
                            LabeledContent("Times", value: "\(model.customTimes.count)")
                        }
                    }
                }

                Section("Quiet Hours") {
                    Toggle("Quiet Hours", isOn: $model.quietHoursEnabled)
                    if model.quietHoursEnabled {
                        Picker("From", selection: $model.quietStartHour) {
                            ForEach(0..<24, id: \.self) { hour in
                                Text(hourLabel(hour)).tag(hour)
                            }
                        }
                        Picker("Until", selection: $model.quietEndHour) {
                            ForEach(0..<24, id: \.self) { hour in
                                Text(hourLabel(hour)).tag(hour)
                            }
                        }
                    }
                }

                Section {
                    Button {
                        model.playTestHaptic()
                    } label: {
                        Label("Test Haptic", systemImage: "waveform")
                    }
                } footer: {
                    statusFooter
                }
            }
            .navigationTitle("Haptic Time")
        }
    }

    @ViewBuilder
    private var statusFooter: some View {
        if !model.enabled {
            Text("Reminders are paused.")
        } else if model.truncated {
            Text("watchOS allows 64 scheduled alarms — only the earliest \(ReminderModel.alarmLimit) each day are active. Use a longer interval or fewer active hours.")
                .foregroundStyle(.orange)
        } else if model.scheduledCount > 0 {
            Text("\(model.scheduledCount) repeating alarms scheduled.")
        } else {
            Text("Nothing scheduled yet — add times or pick an interval.")
        }
    }

    private func intervalLabel(_ minutes: Int) -> String {
        minutes == 60 ? "1 hour" : "\(minutes) min"
    }

    private func offsetLabel(_ offset: Int) -> String {
        offset == 0 ? "On the hour" : String(format: ":%02d past", offset)
    }

    private func hourLabel(_ hour: Int) -> String {
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: .now) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }
}

struct CustomTimesView: View {
    @EnvironmentObject private var model: ReminderModel
    @State private var newHour = 9
    @State private var newMinute = 0

    var body: some View {
        List {
            if !model.customTimes.isEmpty {
                Section("Scheduled") {
                    ForEach(model.customTimes) { time in
                        Text(time.label)
                    }
                    .onDelete { offsets in
                        model.removeTimes(at: offsets)
                    }
                }
            }

            Section("Add Time") {
                Picker("Hour", selection: $newHour) {
                    ForEach(0..<24, id: \.self) { hour in
                        Text(hourLabel(hour)).tag(hour)
                    }
                }
                Picker("Minute", selection: $newMinute) {
                    ForEach(Array(stride(from: 0, to: 60, by: 5)), id: \.self) { minute in
                        Text(String(format: ":%02d", minute)).tag(minute)
                    }
                }
                Button {
                    model.addTime(hour: newHour, minute: newMinute)
                } label: {
                    Label("Add", systemImage: "plus.circle.fill")
                }
            }
        }
        .navigationTitle("Times")
    }

    private func hourLabel(_ hour: Int) -> String {
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: .now) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }
}

#Preview {
    ContentView()
        .environmentObject(ReminderModel())
}
