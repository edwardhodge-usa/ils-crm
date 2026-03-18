import SwiftUI
import PhotosUI

/// Editable avatar with Apple Contacts-style photo editing.
///
/// - Hover: pencil overlay appears
/// - Click: popover with "Choose Photo" (PhotosPicker) + "Remove Photo"
/// - After picking: crop sheet with zoom slider + drag to reposition
/// - Drag-and-drop image files directly onto avatar
/// - Cmd+V paste from clipboard
/// - Circle clip for people, rounded rect for companies
struct EditableAvatarView: View {
    let name: String
    let size: CGFloat
    var photoURL: URL? = nil
    var shape: AvatarShape = .circle
    var isUploading: Bool = false

    /// Website domain for "Find Logo" feature (companies only).
    var websiteDomain: String? = nil

    /// Called with cropped JPEG image data when user confirms crop.
    var onPhotoSelected: ((Data) -> Void)? = nil
    /// Called when user removes the current photo.
    var onPhotoRemoved: (() -> Void)? = nil

    @State private var isHovering = false
    @State private var showPopover = false
    @State private var selectedItem: PhotosPickerItem? = nil
    @State private var showCropSheet = false
    @State private var rawImage: NSImage? = nil
    @State private var isDropTargeted = false
    @State private var isLoadingExisting = false

    var body: some View {
        Button {
            showPopover = true
        } label: {
            ZStack {
                AvatarView(name: name, size: size, photoURL: photoURL, shape: shape)

                // Edit overlay on hover or drop target
                if isHovering || showPopover || isDropTargeted {
                    editOverlay
                }

                // Upload spinner
                if isUploading {
                    uploadOverlay
                }
            }
        }
        .buttonStyle(.plain)
        .onHover { isHovering = $0 }
        .popover(isPresented: $showPopover, arrowEdge: .bottom) {
            photoEditPopover
        }
        .onChange(of: selectedItem) { _, newItem in
            guard let newItem else { return }
            Task { await loadPhotoForCrop(newItem) }
        }
        .sheet(isPresented: $showCropSheet, onDismiss: { rawImage = nil }) {
            if let rawImage {
                PhotoCropView(
                    image: rawImage,
                    shape: shape,
                    isPresented: $showCropSheet,
                    onConfirm: { croppedData in
                        onPhotoSelected?(croppedData)
                    }
                )
            } else {
                // Loading state while downloading existing photo
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Loading image…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(width: 400, height: 500)
            }
        }
        // Drag-and-drop support
        .onDrop(of: [.image, .fileURL], isTargeted: $isDropTargeted) { providers in
            handleDrop(providers)
        }
        // Paste support (Cmd+V)
        .onPasteCommand(of: [.image, .png, .jpeg, .tiff]) { providers in
            handlePaste(providers)
        }
    }

    // MARK: - Edit Overlay (pencil icon)

    private var editOverlay: some View {
        ZStack {
            shapeOverlay(opacity: isDropTargeted ? 0.4 : 0.4)
                .colorMultiply(isDropTargeted ? .accentColor : .white)
            Image(systemName: isDropTargeted ? "arrow.down.circle" : "pencil")
                .font(.system(size: size * 0.3, weight: .medium))
                .foregroundStyle(.white)
        }
        .allowsHitTesting(false)
    }

    // MARK: - Upload Overlay

    private var uploadOverlay: some View {
        ZStack {
            shapeOverlay(opacity: 0.5)
            ProgressView()
                .controlSize(.small)
                .tint(.white)
        }
        .allowsHitTesting(false)
    }

    private func shapeOverlay(opacity: Double) -> some View {
        Group {
            switch shape {
            case .circle:
                Circle()
                    .fill(.black.opacity(opacity))
                    .frame(width: size, height: size)
            case .roundedRect:
                RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
                    .fill(.black.opacity(opacity))
                    .frame(width: size, height: size)
            }
        }
    }

    // MARK: - Popover Content

    private var photoEditPopover: some View {
        VStack(spacing: 0) {
            // Preview of current photo (clickable to edit)
            if let photoURL {
                Button {
                    showPopover = false
                    loadExistingPhotoForCrop(from: photoURL)
                } label: {
                    AsyncImage(url: photoURL) { phase in
                        if case .success(let image) = phase {
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(width: 160, height: 160)
                                .clipShape(popoverClipShape)
                        } else {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.quaternary)
                                .frame(width: 160, height: 160)
                                .overlay { ProgressView().controlSize(.small) }
                        }
                    }
                    .padding(.top, 16)
                    .padding(.bottom, 4)
                }
                .buttonStyle(.plain)

                Text("Click photo to crop & resize")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.bottom, 8)
            }

            // Choose Photo button (wraps PhotosPicker)
            PhotosPicker(
                selection: $selectedItem,
                matching: .images,
                photoLibrary: .shared()
            ) {
                HStack(spacing: 6) {
                    Image(systemName: "photo.on.rectangle")
                    Text("Choose Photo…")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .padding(.horizontal, 16)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)

            // Logo tools (companies with a website only)
            if let domain = websiteDomain, !domain.isEmpty {
                Divider()
                    .padding(.horizontal, 8)

                Button {
                    showPopover = false
                    fetchLogoFromWeb(domain: domain)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "network")
                        Text("Fetch Favicon")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 16)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }

            // Search logo online — opens Google Images (works for any company)
            if shape == .roundedRect {
                let searchName = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
                Button {
                    showPopover = false
                    if let url = URL(string: "https://www.google.com/search?tbm=isch&q=\(searchName)+logo+transparent+png") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "magnifyingglass")
                        Text("Search Logo Online")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 16)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }

            // Remove Photo button (only if photo exists)
            if photoURL != nil {
                Divider()
                    .padding(.horizontal, 8)

                Button(role: .destructive) {
                    showPopover = false
                    onPhotoRemoved?()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "trash")
                        Text("Remove Photo")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 16)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.red)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }

            Divider()
                .padding(.horizontal, 8)
                .padding(.top, 2)

            Text("Drop image or ⌘V to paste")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .padding(.vertical, 6)
        }
        .padding(.vertical, 8)
        .frame(width: 220)
    }

    private var popoverClipShape: AnyShape {
        switch shape {
        case .circle: AnyShape(Circle())
        case .roundedRect: AnyShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    // MARK: - Photo Loading → Crop Sheet

    private func loadPhotoForCrop(_ item: PhotosPickerItem) async {
        defer { selectedItem = nil }
        showPopover = false

        guard let data = try? await item.loadTransferable(type: Data.self),
              let nsImage = NSImage(data: data) else { return }

        await MainActor.run {
            rawImage = nsImage
            showCropSheet = true
        }
    }

    // MARK: - Find Logo from Website

    private func fetchLogoFromWeb(domain: String) {
        let cleanDomain = domain
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
            .replacingOccurrences(of: "www.", with: "")
            .components(separatedBy: "/").first ?? domain

        // Try multiple sources in quality order
        let candidates = [
            "https://\(cleanDomain)/apple-touch-icon.png",
            "https://\(cleanDomain)/apple-touch-icon-180x180.png",
            "https://\(cleanDomain)/favicon-192x192.png",
            "https://www.\(cleanDomain)/apple-touch-icon.png",
            "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://\(cleanDomain)&size=256",
        ]

        rawImage = nil
        showCropSheet = true

        Task {
            for urlString in candidates {
                guard let url = URL(string: urlString) else { continue }
                do {
                    let (data, response) = try await URLSession.shared.data(from: url)
                    let httpResp = response as? HTTPURLResponse
                    guard (200...299).contains(httpResp?.statusCode ?? 0) else { continue }
                    guard let nsImage = NSImage(data: data) else { continue }

                    // Skip tiny icons (< 64px) — keep looking for better
                    let px = max(nsImage.size.width, nsImage.size.height)
                    if px >= 64 {
                        rawImage = nsImage
                        return
                    }
                } catch {
                    continue
                }
            }

            // All sources too small — use best available (Google favicon)
            let fallback = "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://\(cleanDomain)&size=128"
            if let url = URL(string: fallback),
               let (data, _) = try? await URLSession.shared.data(from: url),
               let nsImage = NSImage(data: data) {
                rawImage = nsImage
            } else {
                showCropSheet = false
            }
        }
    }

    // MARK: - Load Existing Photo for Crop

    private func loadExistingPhotoForCrop(from url: URL) {
        // Show sheet immediately with loading indicator
        rawImage = nil
        showCropSheet = true

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                guard let nsImage = NSImage(data: data) else {
                    showCropSheet = false
                    return
                }
                rawImage = nsImage
            } catch {
                showCropSheet = false
            }
        }
    }

    // MARK: - Drag & Drop

    private func handleDrop(_ providers: [NSItemProvider]) -> Bool {
        guard let provider = providers.first else { return false }

        // Try loading as image data
        if provider.hasItemConformingToTypeIdentifier("public.image") {
            provider.loadDataRepresentation(forTypeIdentifier: "public.image") { data, _ in
                guard let data, let nsImage = NSImage(data: data) else { return }
                DispatchQueue.main.async {
                    showPopover = false
                    rawImage = nsImage
                    showCropSheet = true
                }
            }
            return true
        }

        // Try loading as file URL
        if provider.hasItemConformingToTypeIdentifier("public.file-url") {
            provider.loadItem(forTypeIdentifier: "public.file-url") { item, _ in
                guard let urlData = item as? Data,
                      let url = URL(dataRepresentation: urlData, relativeTo: nil),
                      let nsImage = NSImage(contentsOf: url) else { return }
                DispatchQueue.main.async {
                    showPopover = false
                    rawImage = nsImage
                    showCropSheet = true
                }
            }
            return true
        }

        return false
    }

    // MARK: - Paste

    private func handlePaste(_ providers: [NSItemProvider]) {
        guard let provider = providers.first else { return }

        provider.loadDataRepresentation(forTypeIdentifier: "public.image") { data, _ in
            guard let data, let nsImage = NSImage(data: data) else { return }
            DispatchQueue.main.async {
                showPopover = false
                rawImage = nsImage
                showCropSheet = true
            }
        }
    }
}

// MARK: - PhotoCropView

/// Crop editor sheet — zoom out to fit entire image, zoom in to crop.
/// Unlike Apple Contacts, allows zooming out past fill level so any
/// image (logos, wide banners, tall portraits) can be fitted into the icon.
/// Empty space fills with white (companies) or neutral gray (contacts).
struct PhotoCropView: View {
    let image: NSImage
    let shape: AvatarShape
    @Binding var isPresented: Bool
    let onConfirm: (Data) -> Void

    private let cropSize: CGFloat = 280

    @State private var scale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    private let maxScale: CGFloat = 5.0

    // The scale at which the image exactly fills the crop area (scaledToFill)
    private var fillScale: CGFloat {
        let wRatio = cropSize / image.size.width
        let hRatio = cropSize / image.size.height
        return max(wRatio, hRatio)
    }

    // The scale at which the entire image fits inside the crop area (scaledToFit)
    private var fitScale: CGFloat {
        let wRatio = cropSize / image.size.width
        let hRatio = cropSize / image.size.height
        return min(wRatio, hRatio)
    }

    // Allow zooming out to 25% of fit scale (lots of padding room)
    private var minScale: CGFloat { fitScale * 0.25 }

    // Displayed image dimensions at current scale
    private var displayW: CGFloat { image.size.width * scale }
    private var displayH: CGFloat { image.size.height * scale }

    // Background color for empty space
    private var bgColor: NSColor {
        shape == .roundedRect ? .white : NSColor(white: 0.15, alpha: 1)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Title bar
            HStack {
                Button("Cancel") {
                    DispatchQueue.main.async { isPresented = false }
                }
                Spacer()
                Text("Adjust Photo")
                    .font(.headline)
                Spacer()
                Button("Done") {
                    cropAndConfirm()
                    DispatchQueue.main.async { isPresented = false }
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            Divider()

            // Crop area
            ZStack {
                Color.black

                // Background fill for empty space (visible when zoomed out)
                Color(nsColor: bgColor)
                    .frame(width: cropSize, height: cropSize)

                // The image — zoomable and draggable
                Image(nsImage: image)
                    .resizable()
                    .frame(width: displayW, height: displayH)
                    .offset(offset)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                offset = CGSize(
                                    width: lastOffset.width + value.translation.width,
                                    height: lastOffset.height + value.translation.height
                                )
                            }
                            .onEnded { _ in
                                lastOffset = offset
                            }
                    )

                // Mask overlay
                maskOverlay

                // Crop border
                cropBorder
            }
            .frame(width: cropSize + 40, height: cropSize + 40)
            .clipped()

            // Zoom slider
            HStack(spacing: 12) {
                Image(systemName: "minus.magnifyingglass")
                    .foregroundStyle(.secondary)
                Slider(value: $scale, in: minScale...maxScale)
                    .frame(width: 200)
                Image(systemName: "plus.magnifyingglass")
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 16)

            // Fit / Fill shortcut buttons
            HStack(spacing: 12) {
                Button("Fit") {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        scale = fitScale
                        offset = .zero
                        lastOffset = .zero
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)

                Button("Fill") {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        scale = fillScale
                        offset = .zero
                        lastOffset = .zero
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }

            Text("Drag to reposition")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.top, 8)
                .padding(.bottom, 16)
        }
        .frame(width: 400, height: 500)
        .onAppear {
            // Start at fill scale (image covers the crop area)
            scale = fillScale
            offset = .zero
            lastOffset = .zero
        }
    }

    // MARK: - Mask Overlay

    @ViewBuilder
    private var maskOverlay: some View {
        Canvas { context, canvasSize in
            let fullRect = CGRect(origin: .zero, size: canvasSize)
            context.fill(Path(fullRect), with: .color(.black.opacity(0.6)))

            let cropRect = CGRect(
                x: (canvasSize.width - cropSize) / 2,
                y: (canvasSize.height - cropSize) / 2,
                width: cropSize,
                height: cropSize
            )

            let cutout: Path
            switch shape {
            case .circle:
                cutout = Path(ellipseIn: cropRect)
            case .roundedRect:
                cutout = Path(roundedRect: cropRect, cornerRadius: cropSize * 0.22, style: .continuous)
            }

            context.blendMode = .destinationOut
            context.fill(cutout, with: .color(.white))
        }
        .allowsHitTesting(false)
    }

    @ViewBuilder
    private var cropBorder: some View {
        switch shape {
        case .circle:
            Circle()
                .strokeBorder(.white.opacity(0.5), lineWidth: 1)
                .frame(width: cropSize, height: cropSize)
        case .roundedRect:
            RoundedRectangle(cornerRadius: cropSize * 0.22, style: .continuous)
                .strokeBorder(.white.opacity(0.5), lineWidth: 1)
                .frame(width: cropSize, height: cropSize)
        }
    }

    // MARK: - Crop & Export

    private func cropAndConfirm() {
        // Render at 1024px then downscale to 512px for sharp output
        // (high-quality lanczos resampling — handles low-res logos well)
        let renderPx: Int = 1024
        let outputPx: Int = 512

        let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

        // Step 1: Render crop at high resolution
        guard let ctx = CGContext(
            data: nil,
            width: renderPx,
            height: renderPx,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return }

        // High-quality interpolation for upscaling low-res images
        ctx.interpolationQuality = .high

        let renderSize = CGFloat(renderPx)

        // Fill background (white for logos, transparent/gray for contacts)
        let bg = shape == .roundedRect
            ? CGColor(red: 1, green: 1, blue: 1, alpha: 1)
            : CGColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)
        ctx.setFillColor(bg)
        ctx.fill(CGRect(x: 0, y: 0, width: renderSize, height: renderSize))

        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }

        // Map crop-view coordinates to render coordinates
        let outScale = renderSize / cropSize
        let imgX = (cropSize - displayW) / 2 + offset.width
        let imgY = (cropSize - displayH) / 2 + offset.height

        let destRect = CGRect(
            x: imgX * outScale,
            y: imgY * outScale,
            width: displayW * outScale,
            height: displayH * outScale
        )

        ctx.draw(cgImage, in: destRect)

        guard let hiResCGImage = ctx.makeImage() else { return }

        // Step 2: Downscale from 1024 → 512 with lanczos for sharpness
        guard let downCtx = CGContext(
            data: nil,
            width: outputPx,
            height: outputPx,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return }
        downCtx.interpolationQuality = .high
        downCtx.draw(hiResCGImage, in: CGRect(x: 0, y: 0, width: CGFloat(outputPx), height: CGFloat(outputPx)))

        guard let finalCGImage = downCtx.makeImage() else { return }

        let bitmap = NSBitmapImageRep(cgImage: finalCGImage)
        guard let jpegData = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.90]) else { return }

        onConfirm(jpegData)
    }
}
