import SwiftUI

/// Shared bento box layout components for detail view redesign.
///
/// These components implement the Hero + Bento Grid pattern described in
/// docs/superpowers/specs/2026-03-20-bento-detail-redesign.md.
///
/// Coexists with DetailComponents.swift and SharedComponents.swift —
/// existing components remain unchanged.

// MARK: - BentoHeroCard

/// Horizontal hero bar: avatar + name/subtitle + action pills + stat columns.
/// Sits at the top of every detail view. No background card.
struct BentoHeroCard<Pills: View, Stats: View>: View {
    let name: String
    var subtitle: String? = nil
    var photoURL: URL? = nil
    var avatarSize: CGFloat = 56
    var avatarShape: AvatarShape = .circle
    @ViewBuilder var pills: () -> Pills
    @ViewBuilder var stats: () -> Stats

    var body: some View {
        HStack(spacing: 14) {
            AvatarView(
                name: name,
                size: avatarSize,
                photoURL: photoURL,
                shape: avatarShape
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.system(size: 16, weight: .semibold))
                    .lineLimit(1)

                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 8)

            HStack(spacing: 6) {
                pills()
            }

            HStack(spacing: 16) {
                stats()
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// MARK: - BentoHeroStat

/// Single stat column for use inside BentoHeroCard stats closure.
/// Value 18px/700, label 10px/600.
struct BentoHeroStat: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.primary)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - BentoCell

/// Rounded card container with uppercase title and arbitrary content.
/// Uses a raised material surface so cards read as distinct tiles in split views.
struct BentoCell<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    private let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
                .tracking(0.5)
                .padding(.horizontal, 12)
                .padding(.top, 10)
                .padding(.bottom, 6)

            content()
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: shape)
        .overlay {
            shape
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 3)
    }
}

// MARK: - BentoGrid

/// LazyVGrid wrapper accepting column count (2 or 3).
/// Spacing: 10px horizontal, 10px vertical. Columns are `.flexible()`.
struct BentoGrid<Content: View>: View {
    let columns: Int
    @ViewBuilder let content: () -> Content

    private var gridColumns: [GridItem] {
        Array(
            repeating: GridItem(.flexible(), spacing: 10),
            count: max(1, columns)
        )
    }

    var body: some View {
        LazyVGrid(columns: gridColumns, spacing: 10) {
            content()
        }
    }
}

// MARK: - BentoFieldRow

/// Label + value row for inside BentoCell.
/// Label `.secondary` 13px left, value `.primary` 13px right. Min height 28.
/// Divider at bottom. For non-link display fields — use DetailFieldRow for links.
struct BentoFieldRow: View {
    let label: String
    var value: String = "\u{2014}" // em dash

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Spacer()
                Text(value.isEmpty ? "\u{2014}" : value)
                    .font(.system(size: 13))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.trailing)
            }
            .frame(minHeight: 28)

            Divider()
        }
    }
}

// MARK: - BentoToggleRow

/// Label 13px + Toggle `.switch` style. For portal section toggles.
/// Min height 32.
struct BentoToggleRow: View {
    let label: String
    @Binding var isOn: Bool
    var onToggle: ((Bool) -> Void)? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundStyle(.primary)
                Spacer()
                Toggle("", isOn: $isOn)
                    .toggleStyle(.switch)
                    .labelsHidden()
                    .onChange(of: isOn) { _, newValue in
                        onToggle?(newValue)
                    }
            }
            .frame(minHeight: 32)

            Divider()
        }
    }
}

// MARK: - BentoChip

/// Tappable pill for linked records: text 12px/600, blue color,
/// accent-tinted fill with a light border for clearer separation from the card,
/// horizontal padding 10, vertical 4. Optional onTap closure.
struct BentoChip: View {
    let text: String
    var onTap: (() -> Void)? = nil

    var body: some View {
        if let onTap {
            Button {
                onTap()
            } label: {
                chipLabel
            }
            .buttonStyle(.plain)
        } else {
            chipLabel
        }
    }

    private var chipLabel: some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(Color.accentColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color.accentColor.opacity(0.12))
            )
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Color.accentColor.opacity(0.18), lineWidth: 1)
            }
    }
}

// MARK: - BentoPill

/// Status/category badge: text 12px/600, configurable color,
/// accent-tinted capsule with border so pills remain visible on neutral surfaces,
/// horizontal padding 8, vertical 3.
struct BentoPill: View {
    let text: String
    var color: Color = .blue

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(color.opacity(0.16))
            )
            .overlay {
                Capsule()
                    .stroke(color.opacity(0.22), lineWidth: 1)
            }
    }
}

// MARK: - BentoTextInput

/// Stacked label-above-value editable field.
/// Label 11px/600 secondary above, value in a bordered rounded rect input box
/// (1px border, `.secondary.opacity(0.3)`, 8px corner radius, 13px text).
/// Click-to-edit via inline TextField. For Portal "Page Content" fields.
struct BentoTextInput: View {
    let label: String
    let value: String
    var placeholder: String = ""
    var onSave: ((String) -> Void)? = nil

    @State private var isEditing = false
    @State private var editText = ""
    @FocusState private var textFieldFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)

            if isEditing {
                TextField(placeholder.isEmpty ? label : placeholder, text: $editText)
                    .font(.system(size: 13))
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(Color.accentColor.opacity(0.5), lineWidth: 1)
                    )
                    .focused($textFieldFocused)
                    .onAppear {
                        textFieldFocused = true
                    }
                    .onSubmit {
                        commitEdit()
                    }
                    .onChange(of: textFieldFocused) { _, focused in
                        if !focused {
                            commitEdit()
                        }
                    }
            } else {
                Button {
                    editText = value
                    isEditing = true
                } label: {
                    HStack {
                        Text(value.isEmpty ? (placeholder.isEmpty ? "\u{2014}" : placeholder) : value)
                            .font(.system(size: 13))
                            .foregroundStyle(value.isEmpty ? .tertiary : .primary)
                            .lineLimit(1)
                        Spacer()
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func commitEdit() {
        isEditing = false
        let trimmed = editText.trimmingCharacters(in: .whitespacesAndNewlines)
        onSave?(trimmed)
    }
}

// MARK: - Previews

#Preview("BentoHeroCard") {
    BentoHeroCard(
        name: "Jane Smith",
        subtitle: "Creative Director \u{00B7} Acme Studios",
        avatarSize: 56,
        avatarShape: AvatarShape.circle
    ) {
        BentoPill(text: "Email", color: .blue)
        BentoPill(text: "Call", color: .green)
    } stats: {
        BentoHeroStat(value: "3", label: "Open Opps")
        BentoHeroStat(value: "14", label: "Days Since")
        BentoHeroStat(value: "85", label: "Lead Score")
    }
    .frame(width: 600)
    .padding()
}

#Preview("BentoCell + BentoFieldRow") {
    BentoCell(title: "Contact Info") {
        VStack(spacing: 0) {
            BentoFieldRow(label: "Email", value: "jane@example.com")
            BentoFieldRow(label: "Mobile", value: "+1 555-0100")
            BentoFieldRow(label: "Office", value: "+1 555-0200")
            BentoFieldRow(label: "Title", value: "Creative Director")
            BentoFieldRow(label: "Location", value: "Los Angeles, CA")
        }
    }
    .padding()
    .frame(width: 350)
}

#Preview("BentoGrid — 2 Column") {
    BentoGrid(columns: 2) {
        BentoCell(title: "CRM Status") {
            VStack(spacing: 0) {
                BentoFieldRow(label: "Industry", value: "Media")
                BentoFieldRow(label: "Lead Source", value: "Referral")
            }
        }
        BentoCell(title: "Contact & Location") {
            VStack(spacing: 0) {
                BentoFieldRow(label: "Email", value: "jane@acme.com")
                BentoFieldRow(label: "Phone", value: "+1 555-0100")
            }
        }
    }
    .padding()
    .frame(width: 600)
}

#Preview("BentoGrid — 3 Column") {
    BentoGrid(columns: 3) {
        BentoCell(title: "Sent") {
            Text("Mar 15, 2026")
                .font(.system(size: 13))
                .frame(maxWidth: .infinity)
        }
        BentoCell(title: "Expires") {
            Text("Apr 15, 2026")
                .font(.system(size: 13))
                .foregroundStyle(.orange)
                .frame(maxWidth: .infinity)
        }
        BentoCell(title: "Approval") {
            BentoPill(text: "Pending", color: .orange)
                .frame(maxWidth: .infinity)
        }
    }
    .padding()
    .frame(width: 600)
}

#Preview("BentoToggleRow") {
    struct TogglePreview: View {
        @State private var practical = true
        @State private var highlights = false
        @State private var threeSixty = true
        @State private var fullLength = false

        var body: some View {
            BentoCell(title: "Video Sections") {
                VStack(spacing: 0) {
                    BentoToggleRow(label: "Practical Magic", isOn: $practical)
                    BentoToggleRow(label: "Highlights", isOn: $highlights)
                    BentoToggleRow(label: "360", isOn: $threeSixty)
                    BentoToggleRow(label: "Full Length", isOn: $fullLength)
                }
            }
            .padding()
            .frame(width: 350)
        }
    }
    return TogglePreview()
}

#Preview("BentoChip") {
    HStack(spacing: 8) {
        BentoChip(text: "Acme Studios", onTap: {})
        BentoChip(text: "Summer Campaign", onTap: {})
        BentoChip(text: "Jane Smith")
    }
    .padding()
}

#Preview("BentoPill") {
    HStack(spacing: 8) {
        BentoPill(text: "Active Client", color: .green)
        BentoPill(text: "Qualified", color: .blue)
        BentoPill(text: "Expired", color: .red)
        BentoPill(text: "Draft", color: .orange)
    }
    .padding()
}

#Preview("BentoTextInput") {
    struct TextInputPreview: View {
        @State private var pageTitle = "Welcome to Your Portal"
        @State private var subtitle = ""

        var body: some View {
            BentoCell(title: "Page Content") {
                VStack(spacing: 10) {
                    BentoTextInput(
                        label: "Page Title",
                        value: pageTitle,
                        onSave: { pageTitle = $0 }
                    )
                    BentoTextInput(
                        label: "Subtitle",
                        value: subtitle,
                        placeholder: "Add a subtitle...",
                        onSave: { subtitle = $0 }
                    )
                }
            }
            .padding()
            .frame(width: 350)
        }
    }
    return TextInputPreview()
}
