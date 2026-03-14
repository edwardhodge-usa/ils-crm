import Foundation
import Observation

/// Checks Framer page health by issuing HEAD requests to published page URLs.
///
/// Framer has no public CMS REST API, so we check HTTP status codes on the
/// published URLs (`imaginelabstudios.com/ils-clients/{slug}`).
/// 200 = live, anything else = error. Requests are staggered 200ms to avoid
/// rate limiting.
///
/// Key lesson from Electron (2026-03-12):
/// - Framer has no CMS API → use HEAD requests to published URLs
/// - 200 = live, 404 = not published
/// - Stagger 200ms between requests
@MainActor
@Observable
final class FramerHealthService {
    enum PageHealth: String {
        case live, error, unchecked
    }

    private(set) var healthMap: [String: PageHealth] = [:]
    private(set) var isChecking = false
    private var checkTask: Task<Void, Never>?

    /// Cancel any in-flight health check and reset state.
    func cancelCheck() {
        checkTask?.cancel()
        checkTask = nil
        isChecking = false
    }

    /// Start a health check, cancelling any previous one first (re-entrancy guard).
    func startHealthCheck(slugs: [String]) {
        checkTask?.cancel()
        checkTask = Task {
            await checkHealth(slugs: slugs)
        }
    }

    func checkHealth(slugs: [String]) async {
        isChecking = true
        defer { isChecking = false }

        for slug in slugs where !slug.isEmpty {
            if Task.isCancelled { break }
            guard let url = URL(string: "https://www.imaginelabstudios.com/ils-clients/\(slug)") else {
                healthMap[slug] = .error
                continue
            }
            var request = URLRequest(url: url)
            request.httpMethod = "HEAD"
            request.timeoutInterval = 10

            do {
                let (_, response) = try await URLSession.shared.data(for: request)
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                healthMap[slug] = status == 200 ? .live : .error
            } catch {
                healthMap[slug] = .error
            }

            // Stagger 200ms between requests to avoid rate limiting
            try? await Task.sleep(for: .milliseconds(200))
        }
    }

    var liveCount: Int { healthMap.values.filter { $0 == .live }.count }
    var errorCount: Int { healthMap.values.filter { $0 == .error }.count }
}
