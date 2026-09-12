import XCTest
@testable import Helm

/// Launch arguments let the simulator (and screenshots) start the app in a chosen state
/// without tapping through the debug screen. Debug builds only.
final class LaunchOverridesTests: XCTestCase {
    func testParsesLeaksAndHours() {
        let o = LaunchOverrides(arguments: ["Helm", "-helmLeaks", "4", "-helmHours", "19.5"])
        XCTAssertEqual(o.openLeaks, 4)
        XCTAssertEqual(o.hours, 19.5)
    }

    func testMissingArgumentsMeanNoOverride() {
        let o = LaunchOverrides(arguments: ["Helm"])
        XCTAssertNil(o.openLeaks)
        XCTAssertNil(o.hours)
    }

    func testGarbageValuesAreIgnored() {
        let o = LaunchOverrides(arguments: ["-helmLeaks", "many", "-helmHours"])
        XCTAssertNil(o.openLeaks)
        XCTAssertNil(o.hours)
    }

    func testValuesAreClamped() {
        let o = LaunchOverrides(arguments: ["-helmLeaks", "-2", "-helmHours", "30"])
        XCTAssertEqual(o.openLeaks, 0)
        XCTAssertEqual(o.hours, 23.9)
    }

    func testHeadingOverride() {
        XCTAssertEqual(LaunchOverrides(arguments: ["-helmHeading", "hired"]).headingGoalID, "hired")
        XCTAssertNil(LaunchOverrides(arguments: []).headingGoalID)
    }
}
