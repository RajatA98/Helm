// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "HelmCore",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [
        .library(name: "HelmCore", targets: ["HelmCore"])
    ],
    targets: [
        .target(name: "HelmCore"),
        .testTarget(name: "HelmCoreTests", dependencies: ["HelmCore"])
    ]
)
