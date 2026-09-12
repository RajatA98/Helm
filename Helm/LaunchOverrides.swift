import Foundation

/// Debug-only launch arguments so the simulator can start in a chosen state:
/// `-helmLeaks 4 -helmHours 19.5 -helmHeading hired`. Used for screenshots and manual checks.
struct LaunchOverrides: Equatable {
    var openLeaks: Int?
    var hours: Double?
    var headingGoalID: String?

    init(arguments: [String]) {
        openLeaks = Self.value(after: "-helmLeaks", in: arguments).flatMap(Int.init).map { max(0, $0) }
        hours = Self.value(after: "-helmHours", in: arguments).flatMap(Double.init).map { min(23.9, max(0, $0)) }
        headingGoalID = Self.value(after: "-helmHeading", in: arguments)
    }

    static var current: LaunchOverrides {
        #if DEBUG
        return LaunchOverrides(arguments: ProcessInfo.processInfo.arguments)
        #else
        return LaunchOverrides(arguments: [])
        #endif
    }

    private static func value(after flag: String, in arguments: [String]) -> String? {
        guard let i = arguments.firstIndex(of: flag), i + 1 < arguments.count else { return nil }
        return arguments[i + 1]
    }
}
