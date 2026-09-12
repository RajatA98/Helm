import SwiftUI
import HelmCore

struct ContentView: View {
    var body: some View {
        Text(HelmCore.appName)
            .font(.largeTitle)
            .accessibilityIdentifier("helm.title")
    }
}

#Preview {
    ContentView()
}
