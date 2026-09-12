import XCTest
@testable import Helm
import HelmCore

final class HelmAppTests: XCTestCase {
    func testAppLinksAgainstHelmCore() {
        XCTAssertEqual(HelmCore.appName, "Helm")
    }
}
