// TransactionsMonitorWidget.swift

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), status: "Idle")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), status: "Active")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let status = hourOffset % 2 == 0 ? "Active" : "Idle"
            let entry = SimpleEntry(date: entryDate, status: status)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let status: String
}

struct TransactionsMonitorEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Status:")
            Text(entry.status)
                .font(.headline)
                .foregroundColor(entry.status == "Active" ? .green : .red)
        }
    }
}

struct TransactionsMonitorWidget: Widget {
    let kind: String = "TransactionsMonitorWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                TransactionsMonitorEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                TransactionsMonitorEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Transactions Monitor")
        .description("Monitors your transactions and updates the Dynamic Island accordingly.")
    }
}

#Preview(as: .systemSmall) {
    TransactionsMonitorWidget()
} timeline: {
    SimpleEntry(date: .now, status: "Active")
    SimpleEntry(date: .now.addingTimeInterval(3600), status: "Idle")
}
