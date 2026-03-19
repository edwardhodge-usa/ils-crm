import SwiftUI

/// Lock screen shown when license cannot be verified and grace period has expired.
/// Mirrors src/components/auth/OfflineLockPage.tsx
struct OfflineLockView: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Warning icon
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.orange.opacity(0.10))
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(.orange)
                }
                .padding(.bottom, 20)

            Text("Unable to Verify License")
                .font(.system(size: 18, weight: .semibold))
                .padding(.bottom, 8)

            Text("Please connect to the internet and restart the app.")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.bottom, 6)

            Text("Your data is safe — the app will unlock once connectivity is restored.")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
                .padding(.bottom, 24)

            // Quit button
            Button("Quit") {
                #if os(macOS)
                NSApplication.shared.terminate(nil)
                #else
                exit(0)
                #endif
            }
            .buttonStyle(.bordered)
            .controlSize(.regular)

            Spacer()

            // Version
            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
                Text("v\(version)")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .opacity(0.6)
                    .padding(.bottom, 32)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.background)
    }
}
