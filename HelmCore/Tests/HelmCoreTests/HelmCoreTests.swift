import XCTest
@testable import HelmCore

final class HelmCoreTests: XCTestCase {
    func testPackageIsWired() {
        XCTAssertEqual(HelmCore.appName, "Helm")
    }
}
