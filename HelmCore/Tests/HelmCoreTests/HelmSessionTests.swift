import XCTest
@testable import HelmCore

/// HelmSession is the Phase 1 stand-in for real data: two sample goals, a few tasks,
/// a leak count, and the rules for what the Today dock shows and what the scene draws.
final class HelmSessionTests: XCTestCase {

    func testSampleDataHasTwoGoalsWithTasksAndTwoLeaks() {
        let session = HelmSession.sample()
        XCTAssertEqual(session.goals.map(\.id), ["fit", "hired"])
        XCTAssertEqual(session.goals[0].islandName, "Heal the Shoulders")
        XCTAssertEqual(session.goals[1].islandName, "Ship the Portfolio")
        XCTAssertTrue(session.goals.allSatisfy { !$0.tasks.isEmpty })
        XCTAssertEqual(session.openLeaks, 2)
        XCTAssertEqual(session.headingGoalID, "fit")
    }

    func testTasksLeftCountsUndoneTasksAcrossAllGoals() {
        let session = HelmSession.sample()
        let expected = session.goals.flatMap(\.tasks).filter { !$0.isDone }.count
        XCTAssertEqual(session.tasksLeft, expected)
        XCTAssertGreaterThan(expected, 0)
    }

    func testNextTaskComesFromTheCurrentGoalFirst() {
        var session = HelmSession.sample()
        XCTAssertEqual(session.nextTask?.goalID, "fit")
        session.turnWheel()
        XCTAssertEqual(session.headingGoalID, "hired")
        XCTAssertEqual(session.nextTask?.goalID, "hired")
    }

    func testStrikeMarksTheTaskDoneAndMovesOn() {
        var session = HelmSession.sample()
        let before = session.tasksLeft
        let first = try! XCTUnwrap(session.nextTask)
        session.strike(taskID: first.id)
        XCTAssertEqual(session.tasksLeft, before - 1)
        XCTAssertNotEqual(session.nextTask?.id, first.id)
        XCTAssertTrue(session.goals.flatMap(\.tasks).first { $0.id == first.id }!.isDone)
    }

    func testStrikeWithUnknownIdChangesNothing() {
        var session = HelmSession.sample()
        let before = session
        session.strike(taskID: "nope")
        XCTAssertEqual(session, before)
    }

    func testNextTaskIsNilWhenEverythingIsStruck() {
        var session = HelmSession.sample()
        for task in session.goals.flatMap(\.tasks) { session.strike(taskID: task.id) }
        XCTAssertEqual(session.tasksLeft, 0)
        XCTAssertNil(session.nextTask)
    }

    func testTurnWheelCyclesThroughGoalsAndBack() {
        var session = HelmSession.sample()
        session.turnWheel(); session.turnWheel()
        XCTAssertEqual(session.headingGoalID, "fit")
    }

    func testOpenLeaksNeverGoesNegative() {
        var session = HelmSession.sample()
        session.setOpenLeaks(-3)
        XCTAssertEqual(session.openLeaks, 0)
        session.setOpenLeaks(6)
        XCTAssertEqual(session.openLeaks, 6)
    }

    func testSceneStateReflectsTheSession() {
        var session = HelmSession.sample()
        session.setOpenLeaks(4)
        session.turnWheel()
        session.timeOverride = 21
        let state = session.sceneState(hours: 9.5)
        XCTAssertEqual(state.openLeaks, 4)
        XCTAssertEqual(state.shipCondition, .listing)
        XCTAssertEqual(state.headingGoalID, "hired")
        XCTAssertEqual(state.timeOfDay, 9.5)
        XCTAssertEqual(state.timeOverride, 21)
        XCTAssertEqual(state.islands.map(\.id), ["fit", "hired"])
        XCTAssertEqual(state.crewName, session.currentGoal.crewName)
        XCTAssertFalse(state.crewLine.isEmpty)
    }

    func testCrewLineChangesWhenEverythingIsDone() {
        var session = HelmSession.sample()
        let busy = session.crewLine
        for task in session.goals.flatMap(\.tasks) { session.strike(taskID: task.id) }
        XCTAssertNotEqual(session.crewLine, busy)
    }

    func testHoursOfDayUsesTheGivenTimeZone() {
        var components = DateComponents()
        components.year = 2026; components.month = 9; components.day = 12; components.hour = 14; components.minute = 15
        let zone = TimeZone(identifier: "America/Los_Angeles")!
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
        let date = calendar.date(from: components)!
        XCTAssertEqual(HelmSession.hoursOfDay(date, in: zone), 14.25, accuracy: 0.001)
    }
}
