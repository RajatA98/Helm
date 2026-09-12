import Foundation

/// Phase 1 stand-in for real data: two sample goals, a few tasks, a leak count.
/// Holds the rules for what the Today dock shows and what the scene draws.
/// Replaced by the real accountability engine in Phase 2.
public struct HelmSession: Equatable, Sendable {
    public struct Task: Equatable, Sendable, Identifiable {
        public let id: String
        public let goalID: String
        public var title: String
        public var needsPhoto: Bool
        public var isDone: Bool

        public init(id: String, goalID: String, title: String, needsPhoto: Bool = false, isDone: Bool = false) {
            self.id = id
            self.goalID = goalID
            self.title = title
            self.needsPhoto = needsPhoto
            self.isDone = isDone
        }
    }

    public struct Goal: Equatable, Sendable, Identifiable {
        public let id: String
        public var name: String
        public var islandName: String
        public var bearingDeg: Double
        public var crewName: String
        public var busyLine: String
        public var doneLine: String
        public var tasks: [Task]

        public init(id: String, name: String, islandName: String, bearingDeg: Double, crewName: String,
                    busyLine: String, doneLine: String, tasks: [Task]) {
            self.id = id
            self.name = name
            self.islandName = islandName
            self.bearingDeg = bearingDeg
            self.crewName = crewName
            self.busyLine = busyLine
            self.doneLine = doneLine
            self.tasks = tasks
        }
    }

    public var goals: [Goal]
    public var headingGoalID: String
    public private(set) var openLeaks: Int
    public var timeOverride: Double?
    public var avatar: AvatarOptions
    public var shipDesign: ShipDesign

    public init(goals: [Goal], headingGoalID: String, openLeaks: Int, timeOverride: Double? = nil,
                avatar: AvatarOptions, shipDesign: ShipDesign) {
        self.goals = goals
        self.headingGoalID = headingGoalID
        self.openLeaks = max(0, openLeaks)
        self.timeOverride = timeOverride
        self.avatar = avatar
        self.shipDesign = shipDesign
    }

    // MARK: Sample data

    public static func sample() -> HelmSession {
        HelmSession(
            goals: [
                Goal(id: "fit", name: "Get Fit", islandName: "Heal the Shoulders", bearingDeg: 0,
                     crewName: "Bran, master-at-arms",
                     busyLine: "Legs, Captain. Before sundown. Bring a photo or it didn't happen.",
                     doneLine: "Drills done for today. Eat something real and rest.",
                     tasks: [
                        Task(id: "pt", goalID: "fit", title: "Shoulder PT, band rotations", isDone: true),
                        Task(id: "mobility", goalID: "fit", title: "Mobility, 15 minutes", isDone: true),
                        Task(id: "legs", goalID: "fit", title: "Lower-body strength session", needsPhoto: true),
                     ]),
                Goal(id: "hired", name: "Get Hired", islandName: "Ship the Portfolio", bearingDeg: 30,
                     crewName: "Kestrel, lookout",
                     busyLine: "Two openings on the horizon. Send them before sundown.",
                     doneLine: "Applications away. I'll shout the moment a reply shows up.",
                     tasks: [
                        Task(id: "apps", goalID: "hired", title: "Send 2 tailored applications"),
                        Task(id: "problem", goalID: "hired", title: "One practice problem, timed"),
                     ]),
            ],
            headingGoalID: "fit",
            openLeaks: 2,
            avatar: AvatarOptions(skinColor: "#b07a55", hairColor: "#17110d", hairStyle: "short",
                                  headwear: "bandana", headwearColor: "#23958a", coat: "long", coatColor: "#1b2842"),
            shipDesign: ShipDesign(hullColor: "#8c6a46", sailColor: "#d9d0bd", flagEmblem: "anchor"))
    }

    // MARK: Derived

    public var currentGoal: Goal {
        goals.first { $0.id == headingGoalID } ?? goals[0]
    }

    public var tasksLeft: Int {
        goals.flatMap(\.tasks).filter { !$0.isDone }.count
    }

    /// The task the Today dock offers: the current goal's first open task, then the other goals' in order.
    public var nextTask: Task? {
        let ordered = [currentGoal] + goals.filter { $0.id != headingGoalID }
        return ordered.lazy.flatMap(\.tasks).first { !$0.isDone }
    }

    public var crewLine: String {
        let goal = currentGoal
        return goal.tasks.contains { !$0.isDone } ? goal.busyLine : goal.doneLine
    }

    // MARK: Mutations

    public mutating func strike(taskID: String) {
        for g in goals.indices {
            if let t = goals[g].tasks.firstIndex(where: { $0.id == taskID }) {
                goals[g].tasks[t].isDone = true
                return
            }
        }
    }

    public mutating func turnWheel() {
        guard let i = goals.firstIndex(where: { $0.id == headingGoalID }) else { return }
        headingGoalID = goals[(i + 1) % goals.count].id
    }

    public mutating func setOpenLeaks(_ n: Int) {
        openLeaks = max(0, n)
    }

    // MARK: Scene

    public func sceneState(hours: Double) -> SceneState {
        SceneState(
            openLeaks: openLeaks,
            headingGoalID: headingGoalID,
            timeOfDay: hours,
            timeOverride: timeOverride,
            islands: goals.map { Island(id: $0.id, name: $0.islandName, goalName: $0.name, bearingDeg: $0.bearingDeg) },
            crewName: currentGoal.crewName,
            crewLine: crewLine,
            avatar: avatar,
            shipDesign: shipDesign)
    }

    /// Local time as hours since midnight, e.g. 14.25 for 2:15 pm.
    public static func hoursOfDay(_ date: Date, in zone: TimeZone = .current) -> Double {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let c = calendar.dateComponents([.hour, .minute, .second], from: date)
        return Double(c.hour ?? 0) + Double(c.minute ?? 0) / 60 + Double(c.second ?? 0) / 3600
    }
}
