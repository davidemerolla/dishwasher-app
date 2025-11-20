import Foundation

enum Housemate: String, CaseIterable, Identifiable {
    case me = "Me"
    case sara = "Sara"
    case cuto = "Cuto"
    
    var id: String { self.rawValue }
    
    var colorName: String {
        switch self {
        case .me: return "blue"
        case .sara: return "purple"
        case .cuto: return "orange"
        }
    }
}

struct ShiftManager {
    static let shared = ShiftManager()
    
    // Rotating shifts for Mon-Sat
    // The pattern rotates every week.
    // Base Pattern (Week Offset 0):
    // Mon(2), Tue(3) -> Me
    // Wed(4), Thu(5) -> Sara
    // Fri(6), Sat(7) -> Cuto
    //
    // Week Offset 1:
    // Mon-Tue -> Cuto
    // Wed-Thu -> Me
    // Fri-Sat -> Sara
    
    func getPersonOnDuty(for date: Date) -> Housemate {
        let calendar = Calendar.current
        let weekNumber = calendar.component(.weekOfYear, from: date)
        let weekday = calendar.component(.weekday, from: date) // 1=Sun, 2=Mon, ...
        
        // Calculate rotation offset based on week number
        // We assume Week X is the baseline. You might need to adjust 'weekNumber' by adding a constant
        // to match the specific starting week the user wants.
        // For now, we use weekNumber directly.
        let rotationOffset = weekNumber % 3
        
        if weekday == 1 {
            // Sunday Rotation: Me -> Sara -> Cuto
            // This matches the rotationOffset logic directly if we want:
            // Week 0: Me, Week 1: Sara, Week 2: Cuto
            return getHousemate(at: rotationOffset)
        } else {
            // Mon-Sat Rotation
            // Determine the slot index (0: Mon-Tue, 1: Wed-Thu, 2: Fri-Sat)
            let slotIndex: Int
            switch weekday {
            case 2, 3: slotIndex = 0
            case 4, 5: slotIndex = 1
            case 6, 7: slotIndex = 2
            default: slotIndex = 0 // Should not happen
            }
            
            // Calculate person index
            // Logic: PersonIndex = (SlotIndex - RotationOffset) % 3
            // We add 3 to handle negative results from subtraction
            let personIndex = (slotIndex - rotationOffset + 3) % 3
            return getHousemate(at: personIndex)
        }
    }
    
    private func getHousemate(at index: Int) -> Housemate {
        let housemates: [Housemate] = [.me, .sara, .cuto]
        // Ensure index is within bounds (0-2)
        let safeIndex = (index % 3 + 3) % 3
        return housemates[safeIndex]
    }
}
