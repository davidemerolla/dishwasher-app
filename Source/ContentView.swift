import SwiftUI

struct ContentView: View {
    let shiftManager = ShiftManager.shared
    @State private var today = Date()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Today's Duty Card
                    VStack {
                        Text("Today")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        let person = shiftManager.getPersonOnDuty(for: today)
                        Text(person.rawValue)
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Text(today, style: .date)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(getColor(for: shiftManager.getPersonOnDuty(for: today)).opacity(0.2))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // Weekly Schedule
                    VStack(alignment: .leading) {
                        Text("This Week")
                            .font(.title2)
                            .bold()
                            .padding(.horizontal)
                        
                        ForEach(getCurrentWeekDays(), id: \.self) { date in
                            HStack {
                                Text(date, format: .dateTime.weekday(.wide))
                                    .frame(width: 100, alignment: .leading)
                                
                                Spacer()
                                
                                let person = shiftManager.getPersonOnDuty(for: date)
                                Text(person.rawValue)
                                    .fontWeight(.semibold)
                                    .foregroundColor(getColor(for: person))
                            }
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(10)
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.top)
            }
            .navigationTitle("Dishwasher")
        }
    }
    
    func getColor(for person: Housemate) -> Color {
        switch person {
        case .me: return .blue
        case .sara: return .purple
        case .cuto: return .orange
        }
    }
    
    func getCurrentWeekDays() -> [Date] {
        let calendar = Calendar.current
        let today = Date()
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today))!
        
        return (0..<7).compactMap { dayOffset in
            calendar.date(byAdding: .day, value: dayOffset, to: startOfWeek)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
