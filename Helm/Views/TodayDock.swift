import SwiftUI
import HelmCore

/// The ten-second path: tasks left, the next task, one tap to strike it.
struct TodayDock: View {
    let tasksLeft: Int
    let next: HelmSession.Task?
    let goalName: String
    let onOpenLog: () -> Void
    let onStrike: (HelmSession.Task) -> Void

    private let lantern = Color(red: 0.95, green: 0.70, blue: 0.35)

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onOpenLog) {
                HStack(spacing: 12) {
                    VStack(spacing: 2) {
                        Text("\(tasksLeft)")
                            .font(.title.weight(.semibold))
                            .monospacedDigit()
                        Text("left")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(width: 44)
                    .padding(.trailing, 8)
                    .overlay(alignment: .trailing) { Rectangle().fill(.white.opacity(0.15)).frame(width: 1) }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(next == nil ? "Today" : goalName)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(next == nil ? .secondary : lantern)
                        Text(next?.title ?? "Every line struck")
                            .font(.body.weight(.medium))
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.leading, 10)
                .frame(minHeight: 52)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(next == nil ? "Open today's log. Everything is done." : "Open today's log. \(tasksLeft) left. Next: \(next!.title), \(goalName).")

            if let next {
                Button {
                    onStrike(next)
                } label: {
                    if next.needsPhoto {
                        Text("Add photo")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color(red: 0.11, green: 0.08, blue: 0.04))
                            .padding(.horizontal, 14)
                            .frame(minHeight: 44)
                            .background(lantern, in: Capsule())
                    } else {
                        Circle()
                            .strokeBorder(.white.opacity(0.35), lineWidth: 2)
                            .frame(width: 30, height: 30)
                            .frame(width: 52, height: 52)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(next.needsPhoto ? "Add a photo for \(next.title)" : "Strike \(next.title)")
            } else {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(lantern)
                    .frame(width: 52, height: 52)
                    .accessibilityHidden(true)
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(.white.opacity(0.12)))
        .accessibilityIdentifier("today.dock")
    }
}
