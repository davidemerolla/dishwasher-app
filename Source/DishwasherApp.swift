import SwiftUI

@main
struct DishwasherApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    // Request Notification Permissions on launch
                    NotificationManager.shared.requestPermission()
                    NotificationManager.shared.scheduleDailyNotification()
                }
        }
    }
}
