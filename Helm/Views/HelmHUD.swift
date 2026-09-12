import SwiftUI
import HelmCore

/// Top strip: the clock (long-press for the debug screen), the heading, and the open-leak count.
struct HelmHUD: View {
    let now: Date
    let openLeaks: Int
    let goal: HelmSession.Goal
    let onLongPressClock: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text(now, format: .dateTime.hour().minute())
                    .font(.title3.weight(.semibold))
                    .monospacedDigit()
                Text(now, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
            .contentShape(Rectangle())
            .onLongPressGesture(minimumDuration: 0.6, perform: onLongPressClock)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Time \(now.formatted(date: .abbreviated, time: .shortened))")
            .accessibilityHint("Long press to open the debug screen")

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(goal.islandName)
                    .font(.headline)
                    .lineLimit(1)
                Text(leakLabel)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(openLeaks > 0 ? Color(red: 0.93, green: 0.42, blue: 0.31) : .secondary)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Heading for \(goal.islandName), \(goal.name). \(leakLabel).")
        }
        .frame(minHeight: 44)
    }

    private var leakLabel: String {
        switch openLeaks {
        case 0: return "No leaks"
        case 1: return "1 leak"
        default: return "\(openLeaks) leaks"
        }
    }
}
