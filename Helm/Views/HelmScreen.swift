import SwiftUI
import HelmCore

/// The home screen: the 3D ship behind, native HUD and Today dock in front.
struct HelmScreen: View {
    @State private var bridge = SceneBridge()
    @State private var session: HelmSession = {
        var s = HelmSession.sample()
        let o = LaunchOverrides.current
        if let leaks = o.openLeaks { s.setOpenLeaks(leaks) }
        if let hours = o.hours { s.timeOverride = hours }
        if let heading = o.headingGoalID, s.goals.contains(where: { $0.id == heading }) { s.headingGoalID = heading }
        return s
    }()
    @State private var now = Date()
    @State private var showLog = false
    @State private var showDebug = false
    @State private var toast: String?
    @Environment(\.scenePhase) private var scenePhase

    private let clockTick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            // The web view stays mounted even after a timeout, so a slow scene can still recover.
            SceneView(bridge: bridge)
                .ignoresSafeArea()
            if case let .failed(reason) = bridge.loadState {
                SceneFallbackView(reason: reason)
                    .transition(.opacity)
            }

            AnchorPillsOverlay(anchors: bridge.anchors, tasksLeft: session.tasksLeft,
                               onLog: { showLog = true },
                               onCharts: { show("The charts unroll in Phase 3.") },
                               onCove: { show("The Cove opens in Phase 6.") })

            VStack(spacing: 0) {
                HelmHUD(now: now, openLeaks: session.openLeaks, goal: session.currentGoal,
                        onLongPressClock: { showDebug = true })
                Spacer()
                TodayDock(tasksLeft: session.tasksLeft, next: session.nextTask, goalName: goalName(for: session.nextTask),
                          onOpenLog: { showLog = true }, onStrike: strike)
            }
            .padding(.horizontal, 12)
            .padding(.top, 6)
            .padding(.bottom, 10)

            if let toast {
                Text(toast)
                    .font(.subheadline.weight(.medium))
                    .padding(.horizontal, 16).padding(.vertical, 12)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 110)
                    .accessibilityAddTraits(.updatesFrequently)
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showLog) {
            LogPlaceholderSheet(session: $session)
        }
        .sheet(isPresented: $showDebug) {
            DebugScreen(bridge: bridge, session: $session)
        }
        .onAppear {
            bridge.onEvent = { event in handle(event) }
        }
        .onChange(of: bridge.loadState) { _, state in
            if state == .ready { pushState() }
        }
        .onChange(of: session) { _, _ in pushState() }
        .onReceive(clockTick) { date in
            now = date
            pushState()
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active: bridge.resume()
            case .background, .inactive: bridge.pause()
            @unknown default: break
            }
        }
    }

    // MARK: Actions

    private func pushState() {
        guard bridge.loadState == .ready else { return }
        try? bridge.send(session.sceneState(hours: HelmSession.hoursOfDay(now)))
    }

    private func strike(_ task: HelmSession.Task) {
        session.strike(taskID: task.id)
        if task.needsPhoto { show("Photo proof arrives in Phase 2. Struck on your word for now.") }
    }

    private func handle(_ event: SceneEvent) {
        switch event {
        case .wheelTurned:
            session.turnWheel()
        case .barrelTapped:
            showLog = true
        case .crateTapped:
            show("The charts unroll in Phase 3.")
        case .lighthouseTapped:
            show("The Cove opens in Phase 6.")
        case let .islandTapped(id):
            if id == session.headingGoalID { showLog = true } else { session.headingGoalID = id }
        case .sceneReady, .sceneStats, .anchors, .unknown:
            break
        }
    }

    private func show(_ message: String) {
        withAnimation { toast = message }
        Task {
            try? await Task.sleep(for: .seconds(2.6))
            withAnimation { if toast == message { toast = nil } }
        }
    }

    private func goalName(for task: HelmSession.Task?) -> String {
        guard let task else { return "" }
        return session.goals.first { $0.id == task.goalID }?.name ?? ""
    }
}

#Preview {
    HelmScreen()
}
