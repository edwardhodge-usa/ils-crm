import XCTest

final class ILS_CRM_UITests: XCTestCase {
    let app = XCUIApplication()

    private func pause(for seconds: TimeInterval) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    override func setUpWithError() throws {
        continueAfterFailure = true
        app.launch()
        pause(for: 2)

        // SwiftUI window restoration may not open a window on launch.
        // If no window exists, use the menu bar to open one.
        if app.windows.count == 0 {
            app.menuBars.menuBarItems["File"].click()
            pause(for: 0.5)
            app.menuBars.menuItems["New Window"].click()
            pause(for: 2)
        }

        print("APP windows: \(app.windows.count)")
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
                pause(for: 1)
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
        pause(for: 1)

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
                pause(for: 1)
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
        pause(for: 1)

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
                pause(for: 1)
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

    // MARK: - Detail View Screenshots

    /// Navigate to Tasks and Client Portal tabs and screenshot each detail view.
    func testDetailViewScreenshots() throws {
        // Navigate to Tasks and screenshot detail
        guard let tasksNav = element("nav_tasks") else {
            XCTFail("Tasks nav item not found")
            return
        }
        tasksNav.tap()
        pause(for: 1)
        let taskScreenshot = app.screenshot()
        let taskAttachment = XCTAttachment(screenshot: taskScreenshot)
        taskAttachment.name = "tasks-detail-view"
        taskAttachment.lifetime = .keepAlways
        add(taskAttachment)

        // Navigate to Client Portal and screenshot
        guard let portalNav = element("nav_clientPortal") else {
            XCTFail("Client Portal nav item not found")
            return
        }
        portalNav.tap()
        pause(for: 1)
        let portalScreenshot = app.screenshot()
        let portalAttachment = XCTAttachment(screenshot: portalScreenshot)
        portalAttachment.name = "client-portal-view"
        portalAttachment.lifetime = .keepAlways
        add(portalAttachment)
    }

    // MARK: - Element Existence

    /// Probe element types to find how SwiftUI exposes sidebar items.
    func testProbeElementTypes() throws {
        pause(for: 3)

        // Try finding "Dashboard" text by various element types
        let types: [(String, XCUIElementQuery)] = [
            ("staticTexts", app.staticTexts),
            ("buttons", app.buttons),
            ("cells", app.cells),
            ("otherElements", app.otherElements),
            ("images", app.images),
            ("groups", app.groups),
            ("outlines", app.outlines),
            ("outlineRows", app.outlineRows),
        ]

        for (typeName, query) in types {
            // Check by identifier
            let byId = query["nav_dashboard"]
            if byId.exists {
                print("FOUND nav_dashboard as \(typeName) by identifier")
            }
            // Check by label text
            let byLabel = query["Dashboard"]
            if byLabel.exists {
                print("FOUND Dashboard as \(typeName) by label")
            }
        }

        // Also try descendants
        let desc = app.descendants(matching: .any).matching(identifier: "nav_dashboard")
        print("descendants matching nav_dashboard: \(desc.count)")

        // Try matching by label "Dashboard" in all descendants
        let dashLabel = app.descendants(matching: .any)["Dashboard"]
        print("descendants matching 'Dashboard' label: \(dashLabel.exists)")

        // Print count of all buttons, staticTexts, cells
        print("Total buttons: \(app.buttons.count)")
        print("Total staticTexts: \(app.staticTexts.count)")
        print("Total cells: \(app.cells.count)")
        print("Total outlineRows: \(app.outlineRows.count)")

        // List first 10 staticTexts labels
        let stCount = min(app.staticTexts.count, 15)
        for i in 0..<stCount {
            let el = app.staticTexts.element(boundBy: i)
            print("staticText[\(i)]: label='\(el.label)' id='\(el.identifier)'")
        }

        // List first 10 buttons
        let btnCount = min(app.buttons.count, 15)
        for i in 0..<btnCount {
            let el = app.buttons.element(boundBy: i)
            print("button[\(i)]: label='\(el.label)' id='\(el.identifier)'")
        }

        // List first 10 cells
        let cellCount = min(app.cells.count, 10)
        for i in 0..<cellCount {
            let el = app.cells.element(boundBy: i)
            print("cell[\(i)]: label='\(el.label)' id='\(el.identifier)'")
        }
    }
}
