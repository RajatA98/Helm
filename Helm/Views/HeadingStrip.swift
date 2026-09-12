import SwiftUI
import HelmCore

struct HeadingEntry: Identifiable, Equatable {
    let id: String
    let name: String
}

/// Every heading in a row under the HUD: each goal, then the Cove. The current one is lit.
/// Tapping a name turns the ship straight to it, the same as turning the wheel there.
struct HeadingStrip: View {
    let entries: [HeadingEntry]
    let currentID: String
    let onSelect: (String) -> Void

    private let lantern = Color(red: 0.95, green: 0.70, blue: 0.35)

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(entries) { entry in
                    let current = entry.id == currentID
                    Button { onSelect(entry.id) } label: {
                        Text(entry.name)
                            .font(.footnote.weight(current ? .semibold : .medium))
                            .foregroundStyle(current ? Color(red: 0.11, green: 0.08, blue: 0.04) : .primary)
                            .padding(.horizontal, 12)
                            .frame(minHeight: 32)
                            .background(current ? AnyShapeStyle(lantern) : AnyShapeStyle(.ultraThinMaterial), in: Capsule())
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(current ? "\(entry.name), current heading" : "Turn toward \(entry.name)")
                    .accessibilityAddTraits(current ? .isSelected : [])
                }
            }
            .padding(.horizontal, 2)
        }
        .frame(height: 44)
        .accessibilityIdentifier("heading.strip")
    }
}
