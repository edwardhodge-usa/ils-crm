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

// MARK: - AvatarView

struct AvatarView: View {
    let name: String
    var size: CGFloat = 36
    var photoURL: URL? = nil

    // 11-color Apple palette for deterministic color from name
    private static let palette: [Color] = [
        .red, .orange, .yellow, .green, .mint,
        .teal, .cyan, .blue, .indigo, .purple, .pink
    ]

    private var initials: String {
        let parts = name.split(separator: " ")
        let first = parts.first?.prefix(1) ?? ""
        let last = parts.count > 1 ? parts.last!.prefix(1) : ""
        return String(first + last).uppercased()
    }

    private var color: Color {
        let hash = name.utf8.reduce(0) { $0 &+ Int($1) }
        return Self.palette[abs(hash) % Self.palette.count]
    }

    var body: some View {
        if let photoURL {
            AsyncImage(url: photoURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure:
                    initialsFallback
                default:
                    initialsFallback
                }
            }
        } else {
            initialsFallback
        }
    }

    private var initialsFallback: some View {
        ZStack {
            Circle()
                .fill(color)
                .frame(width: size, height: size)
            Text(initials)
                .font(.system(size: size / 2.5, weight: .medium))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - StatCard

struct StatCard: View {
    let title: String
    let value: Int
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundStyle(color)
            Text("\(value)")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(.primary)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(minWidth: 140, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - SectionHeader

struct SectionHeader: View {
    let title: String
    var count: Int? = nil

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .textCase(.uppercase)
                .tracking(0.5)
                .foregroundStyle(.secondary)
            Spacer()
            if let count {
                Text("\(count)")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - FieldRow

struct FieldRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
                .frame(alignment: .leading)
            Spacer()
            Text(value)
                .foregroundStyle(.primary)
                .frame(alignment: .trailing)
        }
        .frame(minHeight: 28)
    }
}

// MARK: - BadgeView

struct BadgeView: View {
    let text: String
    var color: Color = .blue

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
