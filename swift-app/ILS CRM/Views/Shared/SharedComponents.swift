import SwiftUI

/// Shared UI components — mirrors src/components/shared/
///
/// These are stubs for the reusable components from the Electron build.
/// Implement as needed when building out individual views.

// MARK: - StatusBadge (mirrors shared/StatusBadge.tsx + StageBadge.tsx)

struct StatusBadge: View {
    let text: String
    var color: Color = .blue

    var body: some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

// MARK: - EmptyState (mirrors shared/EmptyState.tsx)

struct EmptyStateView: View {
    let title: String
    var description: String?
    var systemImage: String = "tray"

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            if let description {
                Text(description)
            }
        }
    }
}

// MARK: - LoadingSpinner (mirrors shared/LoadingSpinner.tsx)

struct LoadingOverlay: View {
    var message: String = "Loading..."

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - RatingDots (mirrors shared/RatingDots.tsx)

struct RatingDots: View {
    let rating: Int  // 1-5
    var maxRating: Int = 5

    var body: some View {
        HStack(spacing: 3) {
            ForEach(1...maxRating, id: \.self) { i in
                Circle()
                    .fill(i <= rating ? Color.accentColor : Color.secondary.opacity(0.3))
                    .frame(width: 8, height: 8)
            }
        }
    }
}

// MARK: - ConfirmDialog (mirrors shared/ConfirmDialog.tsx)

struct ConfirmDeleteModifier: ViewModifier {
    @Binding var isPresented: Bool
    let itemName: String
    let onConfirm: () -> Void

    func body(content: Content) -> some View {
        content.confirmationDialog(
            "Delete \(itemName)?",
            isPresented: $isPresented,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive, action: onConfirm)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }
}
