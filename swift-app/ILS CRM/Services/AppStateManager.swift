import Foundation
import Observation
import os

/// Manages app lifecycle state: license validation, grace period, periodic re-check.
/// Uses @Observable so SwiftUI views react to state changes automatically.
///
/// Extracted from App struct to avoid @State capture bugs — the App struct is
/// recreated by SwiftUI, so background Tasks on it capture stale copies.
@Observable
@MainActor
final class AppStateManager {
    enum AppState {
        case loading
        case revoked
        case offlineLocked
        case onboarding
        case ready
    }

    var appState: AppState = .loading

    private let logger = Logger(subsystem: "com.ils-crm", category: "app-state")
    @ObservationIgnored private var periodicCheckTask: Task<Void, Never>?

    deinit {
        periodicCheckTask?.cancel()
    }

    // MARK: - License Check

    func performLicenseCheck() async {
        let email = UserDefaults.standard.string(forKey: "user_email") ?? ""

        // No email yet — skip license check (onboarding hasn't happened)
        guard !email.isEmpty else {
            appState = .onboarding
            return
        }

        // Check if license PAT is configured
        let licenseService = LicenseService.shared
        guard await licenseService.hasPAT() else {
            // No license PAT — proceed to app (license check not configured yet)
            logger.info("No license PAT configured, skipping license check")
            appState = .ready
            return
        }

        let status = await licenseService.checkLicense(email: email)

        switch status {
        case .active:
            await licenseService.saveLastVerified()
            logger.info("License valid, starting app")
            appState = .ready
            startPeriodicLicenseCheck(email: email)
        case .error(let message):
            if await licenseService.isWithinGracePeriod() {
                logger.warning("License check failed (\(message)), within grace period")
                appState = .ready
                startPeriodicLicenseCheck(email: email)
            } else {
                logger.error("License check failed, grace period expired")
                appState = .offlineLocked
            }
        case .revoked, .suspended, .notFound:
            logger.error("License not active: \(String(describing: status))")
            licenseService.deleteLocalStore()
            appState = .revoked
        }
    }

    // MARK: - Periodic Re-check

    private func startPeriodicLicenseCheck(email: String) {
        periodicCheckTask?.cancel()
        periodicCheckTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2 * 60 * 60)) // 2 hours
                guard !Task.isCancelled else { break }

                let status = await LicenseService.shared.checkLicense(email: email)
                switch status {
                case .active:
                    await LicenseService.shared.saveLastVerified()
                case .error:
                    if await !LicenseService.shared.isWithinGracePeriod() {
                        self?.appState = .offlineLocked
                    }
                case .revoked, .suspended, .notFound:
                    LicenseService.shared.deleteLocalStore()
                    self?.appState = .revoked
                }
            }
        }
    }
}
