import SwiftUI
import HelmCore

/// Where a pill goes for a scene anchor: centered just above the object, kept inside the safe area.
enum AnchorPillLayout {
    /// Gap between the top of the object and the bottom of its pill.
    static let lift: CGFloat = 12
    /// Breathing room from the safe-area edges.
    static let margin: CGFloat = 8

    static func center(for point: SceneAnchor, pillSize: CGSize, bounds: CGRect, safe: EdgeInsets) -> CGPoint? {
        guard point.visible else { return nil }
        let minX = safe.leading + margin + pillSize.width / 2
        let maxX = bounds.width - safe.trailing - margin - pillSize.width / 2
        let minY = safe.top + margin + pillSize.height / 2
        let maxY = bounds.height - safe.bottom - margin - pillSize.height / 2
        let x = min(max(point.x, minX), max(minX, maxX))
        let y = min(max(point.y - lift - pillSize.height / 2, minY), max(minY, maxY))
        return CGPoint(x: x, y: y)
    }
}

/// The obvious tap targets: Log above the barrel, Charts above the crate, Cove above the lighthouse.
/// They do exactly what tapping the 3D object does.
struct AnchorPillsOverlay: View {
    let anchors: [String: SceneAnchor]
    let tasksLeft: Int
    let onLog: () -> Void
    let onCharts: () -> Void
    let onCove: () -> Void

    static let pillSize = CGSize(width: 104, height: 40)
    /// The HUD and heading strip at the top, the Today dock at the bottom: pills stay out of those bands.
    static let reservedTop: CGFloat = 112
    static let reservedBottom: CGFloat = 88

    var body: some View {
        // This overlay lives inside the safe area, so the reader reports the real insets. The scene's
        // anchors are full-screen points, so each is shifted by those insets before placement.
        GeometryReader { geo in
            let inset = geo.safeAreaInsets
            let bounds = CGRect(origin: .zero, size: geo.size)
            let reserved = EdgeInsets(top: Self.reservedTop, leading: 0, bottom: Self.reservedBottom, trailing: 0)
            ZStack {
                if let p = anchors["barrel"], let c = AnchorPillLayout.center(for: Self.local(p, inset), pillSize: Self.pillSize, bounds: bounds, safe: reserved) {
                    AnchorPill(title: "Log", badge: tasksLeft > 0 ? "\(tasksLeft)" : "Done", action: onLog)
                        .accessibilityLabel(tasksLeft > 0 ? "Open today's log, \(tasksLeft) left" : "Open today's log, everything done")
                        .position(c)
                }
                if let p = anchors["crate"], let c = AnchorPillLayout.center(for: Self.local(p, inset), pillSize: Self.pillSize, bounds: bounds, safe: reserved) {
                    AnchorPill(title: "Charts", badge: nil, action: onCharts)
                        .accessibilityLabel("Open the charts")
                        .position(c)
                }
                if let p = anchors["lighthouse"], let c = AnchorPillLayout.center(for: Self.local(p, inset), pillSize: Self.pillSize, bounds: bounds, safe: reserved) {
                    AnchorPill(title: "Cove", badge: nil, action: onCove)
                        .accessibilityLabel("Open the Cove")
                        .position(c)
                }
            }
            .animation(.easeOut(duration: 0.12), value: anchors)
        }
    }

    /// A full-screen anchor expressed in this overlay's safe-area coordinates.
    static func local(_ p: SceneAnchor, _ inset: EdgeInsets) -> SceneAnchor {
        SceneAnchor(x: p.x - inset.leading, y: p.y - inset.top, visible: p.visible)
    }
}

struct AnchorPill: View {
    let title: String
    let badge: String?
    let action: () -> Void

    private let lantern = Color(red: 0.95, green: 0.70, blue: 0.35)

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                if let badge {
                    Text(badge)
                        .font(.caption.weight(.bold))
                        .monospacedDigit()
                        .foregroundStyle(badge == "Done" ? Color.primary : Color(red: 0.11, green: 0.08, blue: 0.04))
                        .padding(.horizontal, 7)
                        .frame(minWidth: 22, minHeight: 22)
                        .background(badge == "Done" ? Color.white.opacity(0.16) : lantern, in: Capsule())
                }
            }
            .padding(.horizontal, 14)
            .frame(width: AnchorPillsOverlay.pillSize.width, height: AnchorPillsOverlay.pillSize.height)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().strokeBorder(.white.opacity(0.18)))
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .shadow(color: .black.opacity(0.25), radius: 6, y: 2)
    }
}
