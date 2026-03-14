import XCTest

final class ILS_CRM_UITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = true
        app.launch()
        // Wait for app to be ready
        sleep(2)
    }

    /// Helper: find any element by accessibility identifier (SwiftUI Labels/Buttons expose as various types).
    private func element(_ identifier: String, timeout: TimeInterval = 5) -> XCUIElement? {
        // Try common element types in order of likelihood
        let queries: [XCUIElementQuery] = [
            app.buttons,
            app.staticTexts,
            app.scrollViews,
            app.textFields,
            app.otherElements,
        ]
        for query in queries {
            let el = query[identifier].firstMatch
            if el.waitForExistence(timeout: 1) {
                return el
            }
        }
        // Fallback: search all descendants
        let any = app.descendants(matching: .any)[identifier].firstMatch
        if any.waitForExistence(timeout: timeout) {
            return any
        }
        return nil
    }

    // MARK: - Tab Navigation

    /// Navigate to all 10 sidebar tabs and screenshot each.
    func testNavigateAllTabs() throws {
        let tabs: [(id: String, name: String)] = [
            ("nav_dashboard", "Dashboard"),
            ("nav_contacts", "Contacts"),
            ("nav_companies", "Companies"),
            ("nav_pipeline", "Pipeline"),
            ("nav_tasks", "Tasks"),
            ("nav_projects", "Projects"),
            ("nav_proposals", "Proposals"),
            ("nav_clientPortal", "ClientPortal"),
            ("nav_interactions", "Interactions"),
            ("nav_importedContacts", "ImportedContacts"),
        ]

        for tab in tabs {
            if let navItem = element(tab.id, timeout: 5) {
                navItem.tap()
                sleep(1)
                let screenshot = app.screenshot()
                let attachment = XCTAttachment(screenshot: screenshot)
                attachment.name = "Tab_\(tab.name)"
                attachment.lifetime = .keepAlways
                add(attachment)
            } else {
                XCTFail("Sidebar item \(tab.id) not found")
            }
        }
    }

    // MARK: - Tasks Filters

    /// Navigate to Tasks tab, then click through all smart list filters.
    func testTasksSmartListFilters() throws {
        guard let tasksNav = element("nav_tasks") else {
            XCTFail("Tasks nav item not found")
            return
        }
        tasksNav.tap()
        sleep(1)

        let smartLists = [
            ("smartlist_all_tasks", "AllTasks"),
            ("smartlist_overdue", "Overdue"),
            ("smartlist_today", "Today"),
            ("smartlist_scheduled", "Scheduled"),
            ("smartlist_no_date", "NoDate"),
            ("smartlist_waiting", "Waiting"),
            ("smartlist_completed", "Completed"),
        ]

        for (id, name) in smartLists {
            if let item = element(id, timeout: 3) {
                item.tap()
                sleep(1)
                let screenshot = app.screenshot()
                let attachment = XCTAttachment(screenshot: screenshot)
                attachment.name = "SmartList_\(name)"
                attachment.lifetime = .keepAlways
                add(attachment)
            } else {
                XCTFail("Smart list \(id) not found")
            }
        }
    }

    /// Navigate to Tasks tab, then click through type filters.
    func testTasksTypeFilters() throws {
        guard let tasksNav = element("nav_tasks") else {
            XCTFail("Tasks nav item not found")
            return
        }
        tasksNav.tap()
        sleep(1)

        let types = [
            ("type_schedule_meeting", "ScheduleMeeting"),
            ("type_send_qualifications", "SendQualifications"),
            ("type_follow-up_email", "FollowUpEmail"),
            ("type_follow-up_call", "FollowUpCall"),
            ("type_research", "Research"),
            ("type_administrative", "Administrative"),
        ]

        for (id, name) in types {
            if let item = element(id, timeout: 3) {
                item.tap()
                sleep(1)
                let screenshot = app.screenshot()
                let attachment = XCTAttachment(screenshot: screenshot)
                attachment.name = "Type_\(name)"
                attachment.lifetime = .keepAlways
                add(attachment)
            } else {
                XCTFail("Type filter \(id) not found")
            }
        }
    }

    // MARK: - Element Existence

    /// Dump the accessibility hierarchy to understand what XCUITest sees.
    func testDumpHierarchy() throws {
        sleep(3)
        // Dump the full hierarchy to a text attachment
        let hierarchy = app.debugDescription
        let attachment = XCTAttachment(string: hierarchy)
        attachment.name = "AccessibilityHierarchy"
        attachment.lifetime = .keepAlways
        add(attachment)

        // Also write to a file for easy reading
        let path = "/tmp/ils-crm-hierarchy.txt"
        try hierarchy.write(toFile: path, atomically: true, encoding: .utf8)

        // Screenshot
        let screenshot = app.screenshot()
        let ssAttachment = XCTAttachment(screenshot: screenshot)
        ssAttachment.name = "AppState"
        ssAttachment.lifetime = .keepAlways
        add(ssAttachment)
    }
}
