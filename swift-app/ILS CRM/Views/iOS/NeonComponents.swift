#if os(iOS)
import SwiftUI

// MARK: - Shared Neon Card Container

/// Reusable neon bento card used across all iOS views.
struct NeonCard<Content: View>: View {
    let header: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(header.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(0.8)
                .foregroundStyle(NeonTheme.cyan)
                .padding(.horizontal, 4)
            content
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(NeonTheme.cardSurface)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(NeonTheme.cardBorder, lineWidth: 1)
                )
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Neon Divider

struct NeonDivider: View {
    var body: some View {
        Rectangle()
            .fill(NeonTheme.cardBorderGlow)
            .frame(height: 0.5)
            .padding(.vertical, 4)
    }
}

// MARK: - Neon Text Field

struct NeonTextField: View {
    let placeholder: String
    @Binding var text: String

    var body: some View {
        TextField(placeholder, text: $text)
            .font(.system(size: 14))
            .foregroundStyle(NeonTheme.textPrimary)
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(NeonTheme.background)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(NeonTheme.cardBorderGlow, lineWidth: 1)
            )
    }
}

// MARK: - Neon Field Row (label : value)

struct NeonFieldRow: View {
    let label: String
    let value: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundStyle(NeonTheme.textSecondary)
                Spacer()
                Text(value ?? "\u{2014}")
                    .font(.system(size: 13))
                    .foregroundStyle(value != nil ? NeonTheme.textPrimary : NeonTheme.textTertiary)
                    .lineLimit(2)
                    .multilineTextAlignment(.trailing)
            }
            .frame(minHeight: 32)
            Rectangle()
                .fill(NeonTheme.cardBorderGlow)
                .frame(height: 0.5)
        }
    }
}

// MARK: - Neon Empty State

struct NeonEmptyState: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 36, weight: .thin))
                .foregroundStyle(NeonTheme.cyan.opacity(0.4))
                .shadow(color: NeonTheme.cyan.opacity(0.15), radius: 10)
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(NeonTheme.textPrimary)
            Text(subtitle)
                .font(.system(size: 13))
                .foregroundStyle(NeonTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 24)
        .padding(.bottom, 80)
    }
}

// MARK: - Neon Destructive Button

struct NeonDestructiveButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(role: .destructive, action: action) {
            HStack {
                Image(systemName: icon)
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(NeonTheme.neonRed.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(NeonTheme.neonRed.opacity(0.2), lineWidth: 1)
                    )
            )
            .foregroundStyle(NeonTheme.neonRed)
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Neon Action Button

struct NeonActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(color.opacity(0.15))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(color.opacity(0.3), lineWidth: 1)
                    )
            )
            .foregroundStyle(color)
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Neon Pill Badge

struct NeonPillBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

// MARK: - Neon Contact Row (tappable link)

struct NeonContactLink: View {
    let label: String
    let value: String?
    let urlPrefix: String?
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundStyle(NeonTheme.textSecondary)
                Spacer()
                if let value, !value.isEmpty {
                    Button {
                        let resolved: String
                        if let urlPrefix {
                            if urlPrefix == "tel:" {
                                resolved = "tel:\(value.filter { $0.isNumber || $0 == "+" })"
                            } else {
                                resolved = "\(urlPrefix)\(value)"
                            }
                        } else {
                            resolved = value.hasPrefix("http") ? value : "https://\(value)"
                        }
                        if let url = URL(string: resolved) { openURL(url) }
                    } label: {
                        Text(value)
                            .font(.system(size: 13))
                            .foregroundStyle(NeonTheme.cyan)
                            .lineLimit(1)
                    }
                } else {
                    Text("\u{2014}")
                        .font(.system(size: 13))
                        .foregroundStyle(NeonTheme.textTertiary)
                }
            }
            .frame(minHeight: 32)
            Rectangle()
                .fill(NeonTheme.cardBorderGlow)
                .frame(height: 0.5)
        }
    }
}

// MARK: - Categorization Color Helper

func categorizationColor(_ cat: String) -> Color {
    let lower = cat.lowercased()
    if lower.contains("client")   { return NeonTheme.electricBlue }
    if lower.contains("prospect") { return NeonTheme.neonOrange }
    if lower.contains("partner")  { return NeonTheme.neonPurple }
    if lower.contains("vendor")   { return NeonTheme.neonGreen }
    if lower.contains("vip")      { return NeonTheme.magenta }
    if lower.contains("talent")   { return NeonTheme.cyan }
    if lower.contains("employee") { return NeonTheme.electricBlue }
    if lower.contains("investor") { return NeonTheme.neonYellow }
    if lower.contains("advisor")  { return NeonTheme.neonPurple }
    return NeonTheme.textSecondary
}

func companyTypeColor(_ type: String) -> Color {
    let lower = type.lowercased()
    if lower.contains("client")   { return NeonTheme.electricBlue }
    if lower.contains("partner")  { return NeonTheme.neonPurple }
    if lower.contains("vendor")   { return NeonTheme.neonGreen }
    if lower.contains("prospect") { return NeonTheme.neonOrange }
    if lower.contains("lead")     { return NeonTheme.cyan }
    if lower.contains("agency")   { return NeonTheme.magenta }
    return NeonTheme.textSecondary
}
#endif
