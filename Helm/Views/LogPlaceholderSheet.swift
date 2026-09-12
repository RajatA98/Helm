import SwiftUI
import HelmCore

/// Phase 1 stand-in for the Ship's Log: today's sample tasks by goal, tap to strike.
struct LogPlaceholderSheet: View {
    @Binding var session: HelmSession
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(session.goals) { goal in
                    Section {
                        ForEach(goal.tasks) { task in
                            Button {
                                session.strike(taskID: task.id)
                            } label: {
                                HStack(spacing: 14) {
                                    Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                                        .font(.title3)
                                        .foregroundStyle(task.isDone ? Color(red: 0.95, green: 0.70, blue: 0.35) : .secondary)
                                    Text(task.title)
                                        .strikethrough(task.isDone)
                                        .foregroundStyle(task.isDone ? .secondary : .primary)
                                    Spacer()
                                    if task.needsPhoto && !task.isDone {
                                        Image(systemName: "camera")
                                            .foregroundStyle(.secondary)
                                            .accessibilityLabel("needs a photo")
                                    }
                                }
                                .frame(minHeight: 44)
                            }
                            .disabled(task.isDone)
                            .accessibilityLabel(task.isDone ? "\(task.title), done" : "Strike \(task.title)")
                        }
                    } header: {
                        Text("\(goal.name), heading for \(goal.islandName)")
                    }
                }
                Section {
                    Text("The full log, with leaks to patch, arrives in Phase 2.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Ship's Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}
