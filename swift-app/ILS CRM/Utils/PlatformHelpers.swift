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
