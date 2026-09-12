import XCTest
import SwiftUI
@testable import Helm
import HelmCore

/// The Log, Charts and Cove pills float above the objects they belong to. The scene reports
/// where each object is on screen; this math decides where the pill goes and keeps it on screen.
final class AnchorPillLayoutTests: XCTestCase {
    private let bounds = CGRect(x: 0, y: 0, width: 390, height: 844)
    private let safe = EdgeInsets(top: 59, leading: 0, bottom: 34, trailing: 0)
    private let pill = CGSize(width: 96, height: 40)

    func testPillSitsCenteredJustAboveTheAnchor() throws {
        let center = try XCTUnwrap(AnchorPillLayout.center(for: SceneAnchor(x: 120, y: 600, visible: true), pillSize: pill, bounds: bounds, safe: safe))
        XCTAssertEqual(center.x, 120)
        XCTAssertEqual(center.y, 600 - AnchorPillLayout.lift - pill.height / 2)
    }

    func testHiddenAnchorHasNoPill() {
        XCTAssertNil(AnchorPillLayout.center(for: SceneAnchor(x: 120, y: 600, visible: false), pillSize: pill, bounds: bounds, safe: safe))
    }

    func testPillIsClampedInsideTheSafeArea() throws {
        let left = try XCTUnwrap(AnchorPillLayout.center(for: SceneAnchor(x: 5, y: 600, visible: true), pillSize: pill, bounds: bounds, safe: safe))
        XCTAssertEqual(left.x, AnchorPillLayout.margin + pill.width / 2)
        let right = try XCTUnwrap(AnchorPillLayout.center(for: SceneAnchor(x: 389, y: 600, visible: true), pillSize: pill, bounds: bounds, safe: safe))
        XCTAssertEqual(right.x, bounds.width - AnchorPillLayout.margin - pill.width / 2)
        let top = try XCTUnwrap(AnchorPillLayout.center(for: SceneAnchor(x: 200, y: 20, visible: true), pillSize: pill, bounds: bounds, safe: safe))
        XCTAssertEqual(top.y, safe.top + AnchorPillLayout.margin + pill.height / 2)
        let bottom = try XCTUnwrap(AnchorPillLayout.center(for: SceneAnchor(x: 200, y: 900, visible: true), pillSize: pill, bounds: bounds, safe: safe))
        XCTAssertEqual(bottom.y, bounds.height - safe.bottom - AnchorPillLayout.margin - pill.height / 2)
    }
}
