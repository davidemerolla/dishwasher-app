import UserNotifications
import UIKit

class NotificationManager {
    static let shared = NotificationManager()
    
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                print("Notification permission granted")
                self.scheduleDailyNotification()
            } else if let error = error {
                print("Error requesting permission: \(error)")
            }
        }
    }
    
    func scheduleDailyNotification() {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        
        let shiftManager = ShiftManager.shared
        let calendar = Calendar.current
        let today = Date()
        
        // Schedule for the next 7 days
        for i in 0..<7 {
            guard let date = calendar.date(byAdding: .day, value: i, to: today) else { continue }
            
            let person = shiftManager.getPersonOnDuty(for: date)
            
            // Only schedule if it's "Me" (optional) or for everyone?
            // User asked for "send us notification", implying everyone gets it if installed on their phones.
            // So we show the name of the person on duty.
            
            let content = UNMutableNotificationContent()
            content.title = "Turno Lavastoviglie"
            content.body = "Oggi \(person.rawValue) è il tuo turno"
            content.sound = .default
            
            // Set time to 9:00 AM
            var dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
            dateComponents.hour = 9
            dateComponents.minute = 0
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
            let request = UNNotificationRequest(identifier: "duty-\(i)", content: content, trigger: trigger)
            
            center.add(request) { error in
                if let error = error {
                    print("Error scheduling notification: \(error)")
                }
            }
        }
    }
}
