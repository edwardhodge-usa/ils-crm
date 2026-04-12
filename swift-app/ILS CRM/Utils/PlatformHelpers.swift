import SwiftUI

// MARK: - Cross-Platform URL Opening

/// Opens a URL using the platform-appropriate API.
func openURL(_ url: URL) {
    #if os(macOS)
    NSWorkspace.shared.open(url)
    #else
    UIApplication.shared.open(url)
    #endif
}

// MARK: - Cross-Platform Colors

extension Color {
    /// Background color for control surfaces.
    /// macOS: NSColor.controlBackgroundColor
    /// iOS: UIColor.secondarySystemGroupedBackground
    static var platformControlBackground: Color {
        #if os(macOS)
        Color(nsColor: .controlBackgroundColor)
        #else
        Color(uiColor: .secondarySystemGroupedBackground)
        #endif
    }

    /// Window background color for full-bleed surfaces.
    /// macOS: NSColor.windowBackgroundColor
    /// iOS: UIColor.systemBackground
    static var platformWindowBackground: Color {
        #if os(macOS)
        Color(nsColor: .windowBackgroundColor)
        #else
        Color(uiColor: .systemBackground)
        #endif
    }
}

// MARK: - iOS Neon Theme (2026 Dark Bento)

#if os(iOS)
enum NeonTheme {
    // Surfaces
    static let background = Color(red: 0.04, green: 0.04, blue: 0.07)      // #0A0A12
    static let cardSurface = Color(red: 0.09, green: 0.09, blue: 0.14)     // #171723
    static let cardSurfaceElevated = Color(red: 0.12, green: 0.12, blue: 0.18) // #1E1E2E

    // Neon accents
    static let cyan = Color(red: 0.0, green: 0.87, blue: 1.0)              // #00DEFF
    static let magenta = Color(red: 1.0, green: 0.18, blue: 0.62)          // #FF2E9E
    static let electricBlue = Color(red: 0.29, green: 0.46, blue: 1.0)     // #4A75FF
    static let neonGreen = Color(red: 0.0, green: 1.0, blue: 0.65)        // #00FFA6
    static let neonOrange = Color(red: 1.0, green: 0.55, blue: 0.0)       // #FF8C00
    static let neonRed = Color(red: 1.0, green: 0.25, blue: 0.35)         // #FF4059
    static let neonPurple = Color(red: 0.69, green: 0.33, blue: 1.0)      // #B054FF
    static let neonYellow = Color(red: 1.0, green: 0.85, blue: 0.0)       // #FFD900

    // Text
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.55)
    static let textTertiary = Color.white.opacity(0.3)

    // Borders
    static let cardBorder = Color.white.opacity(0.06)
    static let cardBorderGlow = Color.white.opacity(0.1)

    // Glow shadow helper
    static func glow(_ color: Color, radius: CGFloat = 12) -> some ShapeStyle {
        color.opacity(0.35)
    }
}
#endif
