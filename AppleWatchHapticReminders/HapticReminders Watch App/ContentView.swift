import SwiftUI

// MARK: - Design tokens

private let accentColor  = Color(hue: 0.47, saturation: 0.75, brightness: 0.90)  // teal-green
private let cardOpacity  = 0.07

// MARK: - Root

struct ContentView: View {
    @EnvironmentObject var scheduler: HapticScheduler

    var body: some View {
        Group {
            if scheduler.isRunning {
                RunningView()
            } else {
                SetupView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: scheduler.isRunning)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Setup screen
// ─────────────────────────────────────────────────────────────────────────────

private struct SetupView: View {
    @EnvironmentObject var scheduler: HapticScheduler

    /// Crown value mirrors config.minutes so the crown can scroll it.
    @State private var crownMinutes: Double = 30

    private let presets = [5, 10, 15, 20, 30, 60]

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // Header
                HStack(spacing: 6) {
                    Image(systemName: "waveform.circle.fill")
                        .foregroundStyle(accentColor)
                        .font(.title3)
                    Text("Haptic Timer")
                        .font(.headline)
                }
                .padding(.top, 4)

                // ── Interval card ─────────────────────────────────────────
                Card {
                    VStack(spacing: 8) {
                        SectionLabel("Interval", icon: "timer")

                        // Big crown-scrollable number
                        Text("\(scheduler.config.minutes)")
                            .font(.system(size: 48, weight: .bold, design: .rounded))
                            .foregroundStyle(accentColor)
                            .contentTransition(.numericText())
                            .focusable()
                            .digitalCrownRotation(
                                $crownMinutes,
                                from: 1, through: 240, by: 1,
                                sensitivity: .medium,
                                isContinuous: false,
                                isHapticFeedbackEnabled: true
                            )
                            .onChange(of: crownMinutes) {
                                withAnimation(.spring(duration: 0.2)) {
                                    scheduler.config.minutes = Int(crownMinutes)
                                }
                            }

                        Text("minutes  ·  scroll crown")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)

                        // ±1 / ±5 step buttons
                        HStack(spacing: 5) {
                            StepButton("-5")  { adjust(-5) }
                            StepButton("-1")  { adjust(-1) }
                            StepButton("+1")  { adjust(+1) }
                            StepButton("+5")  { adjust(+5) }
                        }

                        // Preset chips
                        SectionLabel("Quick presets", icon: "bolt.fill")
                            .padding(.top, 2)

                        LazyVGrid(
                            columns: Array(repeating: .init(.flexible()), count: 3),
                            spacing: 5
                        ) {
                            ForEach(presets, id: \.self) { p in
                                Button {
                                    withAnimation(.spring(duration: 0.2)) {
                                        scheduler.config.minutes = p
                                        crownMinutes = Double(p)
                                    }
                                } label: {
                                    Text("\(p)m")
                                        .font(.caption.bold())
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 5)
                                }
                                .buttonStyle(PresetStyle(active: scheduler.config.minutes == p))
                            }
                        }
                    }
                }

                // ── Options card ──────────────────────────────────────────
                Card {
                    VStack(spacing: 10) {
                        SectionLabel("Options", icon: "slider.horizontal.3")

                        // Clock-align toggle
                        Toggle(isOn: $scheduler.config.alignToClock) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Clock aligned")
                                    .font(.caption)
                                Text(
                                    scheduler.config.alignToClock
                                        ? "Fires at :00, :\(String(format: "%02d", scheduler.config.minutes % 60)), etc."
                                        : "Starts counting from right now"
                                )
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        .toggleStyle(.switch)
                        .tint(accentColor)

                        Divider().opacity(0.3)

                        // Haptic type
                        VStack(alignment: .leading, spacing: 3) {
                            SectionLabel("Tap feel", icon: "hand.tap.fill")
                            Picker("", selection: $scheduler.hapticType) {
                                ForEach(HapticType.allCases) { t in
                                    HStack {
                                        Image(systemName: t.icon)
                                        Text(t.rawValue)
                                    }
                                    .tag(t)
                                }
                            }
                            .pickerStyle(.wheel)
                            .frame(height: 72)
                        }

                        Divider().opacity(0.3)

                        // Taps per reminder
                        VStack(alignment: .leading, spacing: 5) {
                            SectionLabel("Taps per reminder", icon: "repeat")
                            HStack(spacing: 6) {
                                ForEach(1...3, id: \.self) { n in
                                    Button {
                                        withAnimation { scheduler.config.tapsPerReminder = n }
                                    } label: {
                                        VStack(spacing: 1) {
                                            Text("\(n)")
                                                .font(.caption.bold())
                                            Text(n == 1 ? "single" : n == 2 ? "double" : "triple")
                                                .font(.system(size: 8))
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 5)
                                    }
                                    .buttonStyle(PresetStyle(active: scheduler.config.tapsPerReminder == n))
                                }
                            }
                        }
                    }
                }

                // ── Actions ───────────────────────────────────────────────
                HStack(spacing: 8) {
                    // Preview tap
                    Button {
                        scheduler.previewHaptic()
                    } label: {
                        Image(systemName: "hand.tap.fill")
                            .font(.body)
                    }
                    .buttonStyle(.bordered)
                    .tint(accentColor.opacity(0.7))
                    .frame(width: 44, height: 38)

                    // Start
                    Button {
                        scheduler.start()
                    } label: {
                        Label("Start", systemImage: "play.fill")
                            .font(.subheadline.bold())
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(accentColor)
                }
                .padding(.bottom, 6)
            }
            .padding(.horizontal, 8)
        }
    }

    private func adjust(_ delta: Int) {
        let newVal = max(1, min(240, scheduler.config.minutes + delta))
        withAnimation(.spring(duration: 0.2)) {
            scheduler.config.minutes = newVal
            crownMinutes = Double(newVal)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Running screen
// ─────────────────────────────────────────────────────────────────────────────

private struct RunningView: View {
    @EnvironmentObject var scheduler: HapticScheduler
    @State private var pulse = false

    var body: some View {
        VStack(spacing: 6) {

            // Progress ring with countdown inside
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                let progress = ringProgress(at: ctx.date)

                ZStack {
                    // Outer track
                    Circle()
                        .stroke(Color.white.opacity(0.12), lineWidth: 7)
                        .frame(width: 96, height: 96)

                    // Filled arc
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(
                            accentColor,
                            style: StrokeStyle(lineWidth: 7, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .frame(width: 96, height: 96)
                        .animation(.linear(duration: 0.95), value: progress)

                    // Inner content
                    VStack(spacing: 1) {
                        if let next = scheduler.nextFireDate {
                            Text(next, style: .timer)
                                .font(.system(size: 22, weight: .bold, design: .rounded)
                                    .monospacedDigit())
                                .foregroundStyle(.white)
                        }
                        Text("until tap")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Interval label + clock-align badge
            HStack(spacing: 4) {
                // Pulse dot
                Circle()
                    .fill(accentColor)
                    .frame(width: 6, height: 6)
                    .scaleEffect(pulse ? 1.5 : 1)
                    .opacity(pulse ? 0.6 : 1)
                    .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: pulse)
                    .onAppear { pulse = true }

                Text("Every \(scheduler.config.minutes) min")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                if scheduler.config.alignToClock {
                    Image(systemName: "clock.badge.checkmark.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(accentColor.opacity(0.8))
                }
            }

            // Next absolute time
            if let next = scheduler.nextFireDate {
                HStack(spacing: 4) {
                    Image(systemName: "bell.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(accentColor)
                    Text(next, style: .time)
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }

            // Tap counter
            HStack(spacing: 4) {
                Image(systemName: "hand.tap")
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
                Text(tapLabel)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            Spacer(minLength: 0)

            // Stop button
            Button {
                scheduler.stop()
            } label: {
                Label("Stop", systemImage: "stop.fill")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.red.opacity(0.75))
        }
        .padding(.top, 6)
        .padding(.horizontal, 8)
        .padding(.bottom, 4)
    }

    private var tapLabel: String {
        let n = scheduler.tapCount
        return n == 0 ? "Waiting for first tap…" : "\(n) tap\(n == 1 ? "" : "s") fired"
    }

    private func ringProgress(at now: Date) -> Double {
        guard
            let last = scheduler.lastFiredDate,
            let next = scheduler.nextFireDate
        else { return 0 }
        let total   = next.timeIntervalSince(last)
        guard total > 0 else { return 0 }
        let elapsed = now.timeIntervalSince(last)
        return min(1, max(0, elapsed / total))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Reusable components
// ─────────────────────────────────────────────────────────────────────────────

private struct Card<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        content
            .padding(10)
            .background(Color.white.opacity(cardOpacity), in: RoundedRectangle(cornerRadius: 14))
    }
}

private struct SectionLabel: View {
    let text: String
    let icon: String
    init(_ text: String, icon: String) { self.text = text; self.icon = icon }
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(accentColor)
            Text(text)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }
}

private struct StepButton: View {
    let label: String
    let action: () -> Void
    init(_ label: String, action: @escaping () -> Void) {
        self.label = label; self.action = action
    }
    var body: some View {
        Button(label, action: action)
            .font(.caption2.bold())
            .frame(maxWidth: .infinity)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            .buttonStyle(.plain)
    }
}

private struct PresetStyle: ButtonStyle {
    let active: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(
                active
                    ? accentColor
                    : Color.white.opacity(configuration.isPressed ? 0.15 : 0.08),
                in: RoundedRectangle(cornerRadius: 9)
            )
            .foregroundStyle(active ? Color.black : Color.primary)
            .animation(.easeInOut(duration: 0.15), value: active)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Preview
// ─────────────────────────────────────────────────────────────────────────────

#Preview {
    ContentView()
        .environmentObject(HapticScheduler())
}
