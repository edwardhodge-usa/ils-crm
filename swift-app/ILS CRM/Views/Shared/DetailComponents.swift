import SwiftUI

/// Reusable detail view components — used across all entity detail views
/// (Contacts, Companies, Projects, Proposals, Tasks, Client Portal).
///
/// Mirrors the Electron app's shared component patterns:
/// Apple form row style (label left, value right), section headers with
/// uppercase text, stats rows, and related-record link sections.

// MARK: - DetailHeader

/// Large avatar + name + subtitle + optional action button.
/// Mirrors the header area of Electron's Contact360Page, Company360Page, etc.
struct DetailHeader: View {
    let name: String
    var subtitle: String? = nil
    var actionLabel: String? = nil
    var actionURL: String? = nil
    var photoURL: URL? = nil
    var isCompany: Bool = false
    var isUploading: Bool = false
    var websiteDomain: String? = nil
    var onPhotoSelected: ((Data) -> Void)? = nil
    var onPhotoRemoved: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 8) {
            if onPhotoSelected != nil {
                EditableAvatarView(
                    name: name,
                    size: AvatarSize.xxlarge.dimension,
                    photoURL: photoURL,
                    shape: isCompany ? .roundedRect : .circle,
                    isUploading: isUploading,
                    websiteDomain: websiteDomain,
                    onPhotoSelected: onPhotoSelected,
                    onPhotoRemoved: onPhotoRemoved
                )
            } else {
                AvatarView(name: name, size: AvatarSize.xxlarge.dimension, photoURL: photoURL, shape: isCompany ? .roundedRect : .circle)
            }

            Text(name)
                .font(.title2)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)

            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            if let actionLabel, let urlString = actionURL,
               let url = URL(string: urlString),
               let scheme = url.scheme,
               ["https", "http", "mailto", "tel"].contains(scheme) {
                Button {
                    NSWorkspace.shared.open(url)
                } label: {
                    Text(actionLabel)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - StatsRow

/// Horizontal row of stat boxes.
/// Mirrors Electron's "0 Open Opps | 0 Meetings | — Days Since" stat bars.
struct StatsRow: View {
    let items: [(label: String, value: String)]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                if index > 0 {
                    Divider()
                        .frame(height: 32)
                }
                VStack(spacing: 2) {
                    Text(item.value)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)
                    Text(item.label)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - DetailSection

/// Section wrapper with uppercase header.
/// Mirrors Electron's "CONTACT INFO", "CRM INFO" section headers.
struct DetailSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
                .tracking(0.5)

            content()
        }
        .padding(.top, 16)
    }
}

// MARK: - DetailFieldRow

/// Apple form row: label left, value right, full-width, separator at bottom.
/// Replaces the simpler FieldRow for detail views that need link support
/// and the popup chevron indicator for dropdown fields.
struct DetailFieldRow: View {
    let label: String
    var value: String = "—"
    var isLink: Bool = false
    var linkURL: String? = nil
    var showChevron: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .foregroundStyle(.primary)
                Spacer()
                valueView
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 36)

            Divider()
        }
    }

    @ViewBuilder
    private var valueView: some View {
        if isLink, let urlString = linkURL,
           let url = URL(string: urlString),
           let scheme = url.scheme,
           ["https", "http", "mailto", "tel"].contains(scheme) {
            Button {
                NSWorkspace.shared.open(url)
            } label: {
                HStack(spacing: 4) {
                    Text(value)
                        .foregroundStyle(Color.accentColor)
                    if showChevron {
                        Text("⌃")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.accentColor)
                    }
                }
            }
            .buttonStyle(.plain)
        } else {
            HStack(spacing: 4) {
                Text(value.isEmpty ? "—" : value)
                    .foregroundStyle(.secondary)
                if showChevron {
                    Text("⌃")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - EditableFieldRow

enum EditableFieldType {
    case text
    case textarea
    case singleSelect(options: [String])
    case multiSelect(options: [String])
    case number(prefix: String?)
    case date
    case checkbox
    case readonly
}

/// Click-to-edit form row — label left, value/editor right.
/// Matches Electron's EditableFormRow: tap value → inline editor → auto-save on blur/commit.
struct EditableFieldRow: View {
    let label: String
    let key: String
    let type: EditableFieldType
    let value: String?
    var isLink: Bool = false
    var onSave: ((String, Any?) -> Void)? = nil

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    @State private var isEditing = false
    @State private var editText = ""
    @State private var selectedOptions: Set<String> = []
    @FocusState private var textFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .foregroundStyle(.primary)
                Spacer()
                valueView
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 36)
            .contentShape(Rectangle())
            .applyTapGesture(type: type, isEditing: isEditing) {
                editText = value ?? ""
                isEditing = true
            }

            Divider()
        }
        .onAppear {
            resetState()
        }
        .onChange(of: value) { _, _ in
            resetState()
        }
        .onChange(of: key) { _, _ in
            resetState()
        }
    }

    @ViewBuilder
    private var valueView: some View {
        switch type {
        case .readonly:
            if isLink, let val = value, !val.isEmpty {
                linkText(val)
            } else {
                Text(value ?? "—")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

        case .text:
            if isEditing {
                TextField("", text: $editText)
                    .font(.system(size: 13))
                    .textFieldStyle(.plain)
                    .multilineTextAlignment(.trailing)
                    .focused($textFieldFocused)
                    .onSubmit { commitEdit() }
                    .onAppear { textFieldFocused = true }
                    .onChange(of: textFieldFocused) { _, focused in
                        if !focused { commitEdit() }
                    }
            } else if isLink, let val = value, !val.isEmpty {
                linkText(val)
            } else {
                Text(value.isNilOrEmpty ? "—" : value!)
                    .font(.system(size: 13))
                    .foregroundStyle(value.isNilOrEmpty ? .tertiary : .secondary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

        case .textarea:
            if isEditing {
                TextEditor(text: $editText)
                    .font(.system(size: 13))
                    .frame(minHeight: 60)
                    .focused($textFieldFocused)
                    .onAppear { textFieldFocused = true }
                    .onChange(of: textFieldFocused) { _, focused in
                        if !focused { commitEdit() }
                    }
            } else {
                Text(value.isNilOrEmpty ? "—" : value!)
                    .font(.system(size: 13))
                    .foregroundStyle(value.isNilOrEmpty ? .tertiary : .secondary)
                    .lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

        case .singleSelect(let options):
            Menu {
                Button("None") { onSave?(key, nil) }
                Divider()
                ForEach(options, id: \.self) { option in
                    Button(option) { onSave?(key, option) }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(value ?? "—")
                        .font(.system(size: 13))
                        .foregroundStyle(value != nil ? .primary : .tertiary)
                    Text("⌃")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            .menuStyle(.borderlessButton)

        case .multiSelect(let options):
            Menu {
                ForEach(options, id: \.self) { option in
                    Button(action: {
                        if selectedOptions.contains(option) {
                            selectedOptions.remove(option)
                        } else {
                            selectedOptions.insert(option)
                        }
                        let sorted = options.filter { selectedOptions.contains($0) }
                        let joined = sorted.isEmpty ? nil : sorted.joined(separator: ", ")
                        onSave?(key, joined)
                    }) {
                        HStack {
                            Text(option)
                            Spacer()
                            if selectedOptions.contains(option) {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    if selectedOptions.isEmpty {
                        Text("—")
                            .font(.system(size: 13))
                            .foregroundStyle(.tertiary)
                    } else {
                        Text(selectedOptions.sorted().joined(separator: ", "))
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                    Text("⌃")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
            }
            .menuStyle(.borderlessButton)

        case .number(let prefix):
            if isEditing {
                HStack(spacing: 2) {
                    if let p = prefix {
                        Text(p)
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    TextField("", text: $editText)
                        .font(.system(size: 13))
                        .textFieldStyle(.plain)
                        .focused($textFieldFocused)
                        .onSubmit { commitEdit() }
                        .frame(maxWidth: 120)
                        .multilineTextAlignment(.trailing)
                        .onChange(of: editText) { _, newValue in
                            let filtered = newValue.filter { $0.isNumber || $0 == "." || $0 == "-" }
                            if filtered != newValue { editText = filtered }
                        }
                }
            } else {
                Text(formatNumber(value, prefix: prefix))
                    .font(.system(size: 13))
                    .foregroundStyle(value != nil ? .secondary : .tertiary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

        case .date:
            HStack(spacing: 4) {
                if value != nil {
                    DatePicker("", selection: dateBinding, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                    Button {
                        onSave?(key, nil)
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(.tertiary)
                    }
                    .buttonStyle(.plain)
                } else {
                    Spacer()
                    Button("Set Date") {
                        onSave?(key, Self.isoFormatter.string(from: Date()))
                    }
                    .font(.system(size: 12))
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                }
            }

        case .checkbox:
            Toggle("", isOn: checkBinding)
                .labelsHidden()
                .toggleStyle(.checkbox)
        }
    }

    private func resetState() {
        editText = value ?? ""
        isEditing = false
        if case .multiSelect = type, let val = value, !val.isEmpty {
            selectedOptions = Set(val.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) })
        } else if case .multiSelect = type {
            selectedOptions = []
        }
    }

    private func commitEdit() {
        isEditing = false
        let trimmed = editText.trimmingCharacters(in: .whitespacesAndNewlines)
        onSave?(key, trimmed.isEmpty ? nil : trimmed)
    }

    private var dateBinding: Binding<Date> {
        Binding<Date>(
            get: {
                guard let value else { return Date() }
                return Self.isoFormatter.date(from: value)
                    ?? Self.isoFormatter.date(from: value)
                    ?? Date()
            },
            set: { newDate in
                onSave?(key, Self.isoFormatter.string(from: newDate))
            }
        )
    }

    private var checkBinding: Binding<Bool> {
        Binding<Bool>(
            get: { value == "true" || value == "1" },
            set: { newValue in onSave?(key, newValue ? "true" : "false") }
        )
    }

    private func formatNumber(_ val: String?, prefix: String?) -> String {
        guard let val = val, let num = Double(val) else { return "—" }
        let formatter = NumberFormatter()
        formatter.numberStyle = prefix == "$" ? .currency : .decimal
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: num)) ?? "—"
    }

    @ViewBuilder
    private func linkText(_ val: String) -> some View {
        Button {
            let url: URL?
            if val.contains("@") && !val.hasPrefix("mailto:") {
                url = URL(string: "mailto:\(val)")
            } else if val.hasPrefix("http://") || val.hasPrefix("https://") || val.hasPrefix("mailto:") || val.hasPrefix("tel:") {
                url = URL(string: val)
            } else {
                url = URL(string: "https://\(val)")
            }
            if let url { NSWorkspace.shared.open(url) }
        } label: {
            Text(val)
                .font(.system(size: 13))
                .foregroundStyle(.blue)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - EditableFieldRow Helpers

private extension Optional where Wrapped == String {
    var isNilOrEmpty: Bool {
        switch self {
        case .none: return true
        case .some(let str): return str.isEmpty
        }
    }
}

private extension View {
    @ViewBuilder
    func applyTapGesture(type: EditableFieldType, isEditing: Bool, action: @escaping () -> Void) -> some View {
        switch type {
        case .text, .textarea, .number:
            if !isEditing {
                Button(action: action) {
                    self
                }
                .buttonStyle(.plain)
            } else {
                self
            }
        default:
            self
        }
    }
}

// MARK: - RelatedRecordRow

/// For linked-records sections with a "+" add button.
/// Shows a label with count and optional list of linked record names.
struct RelatedRecordRow: View {
    let label: String
    var items: [String] = []
    var onAdd: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(label)
                    .foregroundStyle(.primary)
                if !items.isEmpty {
                    Text("\(items.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.12))
                        .clipShape(Capsule())
                }
                Spacer()
                if let onAdd {
                    Button {
                        onAdd()
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.accentColor)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 36)

            if !items.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(items, id: \.self) { item in
                        HStack(spacing: 8) {
                            AvatarView(name: item, size: AvatarSize.small.dimension)
                            Text(item)
                                .font(.subheadline)
                                .foregroundStyle(.primary)
                            Spacer()
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)

                        if item != items.last {
                            Divider()
                                .padding(.leading, 48)
                        }
                    }
                }
            }

            Divider()
        }
    }
}

// MARK: - SortDropdown

/// Compact inline picker for sort options.
/// Uses explicit buttons so selection remains easy to test in previews.
struct SortDropdown<T: Hashable & CustomStringConvertible>: View {
    let options: [T]
    @Binding var selection: T

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.self) { option in
                let isSelected = selection == option

                Button(option.description) {
                    selection = option
                }
                .font(.caption)
                .foregroundStyle(isSelected ? Color.white : Color.primary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule(style: .continuous)
                        .fill(isSelected ? Color.accentColor : Color.secondary.opacity(0.12))
                )
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(
            Capsule(style: .continuous)
                .fill(Color.secondary.opacity(0.08))
        )
    }
}

// MARK: - ListHeader

/// Reusable header for entity list pages: title + optional count badge + optional action button.
/// Mirrors the header pattern across Electron's list pages.
struct ListHeader: View {
    let title: String
    var count: Int? = nil
    var buttonLabel: String? = nil
    var onButton: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 8) {
            Text(title)
                .font(.system(size: 15, weight: .bold))
                .tracking(-0.2)

            if let count {
                Text("\(count)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(Capsule())
            }

            Spacer()

            if let buttonLabel, let onButton {
                Button {
                    onButton()
                } label: {
                    Text(buttonLabel)
                        .font(.system(size: 12, weight: .semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

// MARK: - Previews

#Preview("DetailHeader") {
    VStack(spacing: 24) {
        DetailHeader(
            name: "Jane Smith",
            subtitle: "Creative Director",
            actionLabel: "Email",
            actionURL: "mailto:jane@example.com"
        )
        DetailHeader(
            name: "Acme Studios",
            subtitle: "Media & Entertainment"
        )
    }
    .padding()
    .frame(width: 400)
}

#Preview("StatsRow") {
    StatsRow(items: [
        (label: "Open Opps", value: "3"),
        (label: "Meetings", value: "12"),
        (label: "Days Since", value: "14")
    ])
    .padding()
    .frame(width: 400)
}

#Preview("DetailSection + DetailFieldRow") {
    VStack(alignment: .leading, spacing: 0) {
        DetailSection(title: "Contact Info") {
            DetailFieldRow(label: "Email", value: "jane@example.com", isLink: true, linkURL: "mailto:jane@example.com")
            DetailFieldRow(label: "Phone", value: "+1 555-0100", isLink: true, linkURL: "tel:+15550100")
            DetailFieldRow(label: "LinkedIn", value: "linkedin.com/in/jane", isLink: true, linkURL: "https://linkedin.com/in/jane")
        }
        DetailSection(title: "CRM Info") {
            DetailFieldRow(label: "Status", value: "Active Client", showChevron: true)
            DetailFieldRow(label: "Priority", value: "High", showChevron: true)
            DetailFieldRow(label: "Lead Score", value: "85")
        }
    }
    .padding(.horizontal, 16)
    .frame(width: 400)
}

#Preview("RelatedRecordRow") {
    VStack(spacing: 0) {
        RelatedRecordRow(
            label: "Contacts",
            items: ["Jane Smith", "Bob Johnson"],
            onAdd: {}
        )
        RelatedRecordRow(
            label: "Opportunities",
            items: [],
            onAdd: {}
        )
    }
    .frame(width: 400)
}

#Preview("ListHeader") {
    VStack(spacing: 12) {
        ListHeader(title: "Contacts", count: 59, buttonLabel: "+ New Contact", onButton: {})
        ListHeader(title: "Companies", count: 70)
    }
    .frame(width: 500)
}
