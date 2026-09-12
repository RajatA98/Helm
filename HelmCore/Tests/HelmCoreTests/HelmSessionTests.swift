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

    func testUnstrikeReopensAStruckTask() {
        var session = HelmSession.sample()
        let first = try! XCTUnwrap(session.nextTask)
        session.strike(taskID: first.id)
        let afterStrike = session.tasksLeft
        session.unstrike(taskID: first.id)
        XCTAssertEqual(session.tasksLeft, afterStrike + 1)
        XCTAssertEqual(session.nextTask?.id, first.id)
        XCTAssertFalse(session.goals.flatMap(\.tasks).first { $0.id == first.id }!.isDone)
    }

    func testUnstrikeWithUnknownIdChangesNothing() {
        var session = HelmSession.sample()
        let before = session
        session.unstrike(taskID: "nope")
        XCTAssertEqual(session, before)
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

    // MARK: Headings: every goal, then the Cove

    func testHeadingsAreTheGoalsThenTheCove() {
        let session = HelmSession.sample()
        XCTAssertEqual(session.headings, ["fit", "hired", HelmSession.coveHeadingID])
        XCTAssertFalse(session.isHeadingCove)
    }

    func testTurnWheelCyclesThroughGoalsAndTheCoveAndBack() {
        var session = HelmSession.sample()
        session.turnWheel()
        XCTAssertEqual(session.headingGoalID, "hired")
        session.turnWheel()
        XCTAssertEqual(session.headingGoalID, HelmSession.coveHeadingID)
        session.turnWheel()
        XCTAssertEqual(session.headingGoalID, "fit")
    }

    func testTurnWheelPreviousWrapsBackwards() {
        var session = HelmSession.sample()
        session.turnWheel(direction: .previous)
        XCTAssertEqual(session.headingGoalID, HelmSession.coveHeadingID)
        session.turnWheel(direction: .previous)
        XCTAssertEqual(session.headingGoalID, "hired")
        session.turnWheel(direction: .previous)
        XCTAssertEqual(session.headingGoalID, "fit")
    }

    func testTurnWheelWithThreeGoalsAndTheCove() {
        var session = HelmSession.sample()
        session.goals.append(HelmSession.Goal(id: "read", name: "Read More", islandName: "Twenty Pages", bearingDeg: -40,
                                              crewName: "Tully, scholar", busyLine: "Pages, Captain.", doneLine: "Well read.",
                                              tasks: [HelmSession.Task(id: "pages", goalID: "read", title: "Read 20 pages")]))
        XCTAssertEqual(session.headings, ["fit", "hired", "read", "cove"])
        for _ in 0..<4 { session.turnWheel(direction: .next) }
        XCTAssertEqual(session.headingGoalID, "fit", "four steps forward returns to the start")
        session.turnWheel(direction: .previous)
        XCTAssertEqual(session.headingGoalID, "cove")
        session.turnWheel(direction: .previous)
        XCTAssertEqual(session.headingGoalID, "read")
    }

    func testSetHeadingAcceptsKnownIdsAndIgnoresOthers() {
        var session = HelmSession.sample()
        session.setHeading(id: HelmSession.coveHeadingID)
        XCTAssertTrue(session.isHeadingCove)
        session.setHeading(id: "nope")
        XCTAssertTrue(session.isHeadingCove, "an unknown id changes nothing")
        session.setHeading(id: "hired")
        XCTAssertEqual(session.headingGoalID, "hired")
    }

    func testCoveHeadingShowsANeutralLineAndKeepsOfferingGoalTasks() {
        var session = HelmSession.sample()
        session.setHeading(id: HelmSession.coveHeadingID)
        XCTAssertNil(session.currentGoal)
        XCTAssertEqual(session.headingName, "The Cove")
        XCTAssertEqual(session.crewLine, "Allies ahead, Captain.")
        XCTAssertEqual(session.nextTask?.id, "legs", "the dock keeps offering the goals' tasks in order")
        XCTAssertEqual(session.tasksLeft, 3)
    }

    func testSceneStateIncludesTheCoveAsATarget() {
        let state = HelmSession.sample().sceneState(hours: 9)
        XCTAssertEqual(state.islands.map(\.id), ["fit", "hired", "cove"])
        let cove = try! XCTUnwrap(state.islands.last)
        XCTAssertEqual(cove.name, "The Cove")
        XCTAssertEqual(cove.bearingDeg, HelmSession.sample().coveBearingDeg)
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
        XCTAssertEqual(state.islands.map(\.id), ["fit", "hired", "cove"])
        XCTAssertEqual(state.crewName, session.currentGoal?.crewName)
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
