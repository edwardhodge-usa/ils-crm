import SwiftUI

/// Lock screen shown when license is revoked or suspended.
/// Mirrors src/components/auth/RevokedPage.tsx
struct RevokedView: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Lock icon
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.10))
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(.red)
                }
                .padding(.bottom, 20)

            Text("Access Revoked")
                .font(.system(size: 18, weight: .semibold))
                .padding(.bottom, 8)

            Text("Your access to ILS CRM has been revoked.")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.bottom, 6)

            Text("If you believe this is an error, contact your administrator.")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
                .padding(.bottom, 24)

            // Admin email link
            Button("admin@imaginelabstudios.com") {
                if let url = URL(string: "mailto:admin@imaginelabstudios.com") {
                    #if os(macOS)
                    NSWorkspace.shared.open(url)
                    #else
                    UIApplication.shared.open(url)
                    #endif
                }
            }
            .buttonStyle(.plain)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(Color.accentColor)
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
