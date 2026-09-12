import SwiftUI
import WebKit

/// The Three.js ship, running in a WKWebView. Pure view: it draws what `SceneBridge` sends.
struct SceneView: UIViewRepresentable {
    let bridge: SceneBridge

    static let messageHandlerName = "helm"

    func makeCoordinator() -> Coordinator {
        Coordinator(bridge: bridge)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: Self.messageHandlerName)
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = context.coordinator
        webView.accessibilityLabel = "Your ship at the helm"
        #if DEBUG
        webView.isInspectable = true
        #endif

        bridge.evaluate = { [weak webView, weak bridge] script in
            webView?.evaluateJavaScript(script) { _, error in
                if let error {
                    Task { @MainActor in bridge?.markLoadFailed("script error: \(error.localizedDescription)") }
                }
            }
        }

        if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Scene") {
            webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
            context.coordinator.startLoadTimeout()
        } else {
            bridge.markLoadFailed("Scene/index.html is missing from the app bundle")
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: messageHandlerName)
        uiView.navigationDelegate = nil
        coordinator.cancelLoadTimeout()
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        private let bridge: SceneBridge
        private var timeout: Task<Void, Never>?

        init(bridge: SceneBridge) {
            self.bridge = bridge
        }

        func startLoadTimeout() {
            timeout?.cancel()
            timeout = Task { [bridge] in
                try? await Task.sleep(for: .seconds(SceneBridge.loadTimeout))
                guard !Task.isCancelled, bridge.loadState == .loading else { return }
                bridge.markLoadFailed("timed out after \(Int(SceneBridge.loadTimeout)) s")
            }
        }

        func cancelLoadTimeout() {
            timeout?.cancel()
            timeout = nil
        }

        // MARK: WKScriptMessageHandler

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            bridge.receive(body: message.body)
        }

        // MARK: WKNavigationDelegate

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            bridge.markLoadFailed(error.localizedDescription)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            bridge.markLoadFailed(error.localizedDescription)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            bridge.markLoadFailed("the scene's web process was terminated")
        }
    }
}

/// Shown behind the native UI when the scene can't load. Calm, never an error wall.
struct SceneFallbackView: View {
    let reason: String?

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.05, green: 0.08, blue: 0.14), Color(red: 0.09, green: 0.14, blue: 0.22)],
                           startPoint: .top, endPoint: .bottom)
            VStack(spacing: 8) {
                Image(systemName: "sailboat")
                    .font(.system(size: 44, weight: .light))
                    .foregroundStyle(.secondary)
                Text("Becalmed")
                    .font(.title3.weight(.semibold))
                if let reason {
                    Text(reason)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
            }
            .foregroundStyle(.white)
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("The ship scene could not load. \(reason ?? "")")
    }
}
