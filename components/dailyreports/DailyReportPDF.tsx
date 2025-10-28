import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type {
  AgentInventory,
  RemainingMetersByType,
  SaleWithMeters,
} from "./types";

Font.register({
  family: "GeistMono",
  src: "/fonts/GeistMonoVF.woff",
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "GeistMono",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000080",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000080",
  },
  summarySection: {
    marginBottom: 20,
  },
  comparisonText: {
    fontSize: 12,
    marginBottom: 5,
  },
  highlightedText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000080",
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000080",
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000080",
  },
  tableHeader: {
    backgroundColor: "#000080",
  },
  tableHeaderCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    color: "white",
  },
  tableCell: {
    padding: 8,
    flex: 1,
    fontSize: 10,
    color: "black",
  },
  totalRow: {
    backgroundColor: "#f8f9fa",
  },
  totalCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
    color: "#000080",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#000080",
  },
});

interface DailyReportPDFProps {
  todaySales: SaleWithMeters[];
  yesterdaySales: SaleWithMeters[];
  remainingMetersByType: RemainingMetersByType[];
  agentInventory: AgentInventory[];
  todayTotalEarnings: number;
  yesterdayTotalEarnings: number;
}

// Add this interface for better type safety
interface MetersSoldByType {
  [key: string]: number;
}

// Add the constant for meter types
const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;

// Heavy PDF generation logic running on the main thread
const DailyReportPDF = ({
  todaySales,
  yesterdaySales,
  remainingMetersByType,
  agentInventory,
  todayTotalEarnings,
  yesterdayTotalEarnings,
}: DailyReportPDFProps) => {
  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss");

  // Calculate metrics
  const salesGrowth =
    ((todayTotalEarnings - yesterdayTotalEarnings) / yesterdayTotalEarnings) *
    100;
  const salesGrowthText = `${salesGrowth >= 0 ? "+" : ""}${salesGrowth.toFixed(2)}%`;

  // Calculate meters sold by type for today
  const metersSoldByType = todaySales.reduce<MetersSoldByType>((acc, sale) => {
    acc[sale.meter_type] = (acc[sale.meter_type] || 0) + sale.batch_amount;
    return acc;
  }, {});

  // Function to get agent inventory count
  const getAgentCount = (meterType: string) => {
    const inventory = agentInventory.find(
      (item) => item.type.toLowerCase() === meterType.toLowerCase()
    );
    return inventory?.with_agents || 0;
  };

  // Ensure all meter types are represented
  const allMeterTypes = METER_TYPES.map((type) => {
    const existingData = remainingMetersByType.find(
      (item) => item.type.toLowerCase() === type.toLowerCase()
    );
    return {
      type,
      remaining: existingData?.remaining_meters || 0,
      withAgents: getAgentCount(type),
      soldToday: metersSoldByType[type] || 0,
    };
  });

  // Calculate totals
  const totals = {
    remaining: allMeterTypes.reduce((sum, item) => sum + item.remaining, 0),
    withAgents: allMeterTypes.reduce((sum, item) => sum + item.withAgents, 0),
    soldToday: allMeterTypes.reduce((sum, item) => sum + item.soldToday, 0),
  };

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src='/logo.png' style={styles.logo} />
          <Text>{currentDateTime}</Text>
        </View>

        <Text style={styles.title}>Daily Sales Report</Text>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Daily Performance Summary</Text>
          <Text style={styles.comparisonText}>
            Today's Total Sales:{" "}
            <Text style={styles.highlightedText}>
              KES {todayTotalEarnings.toLocaleString()}
            </Text>
          </Text>
          <Text style={styles.comparisonText}>
            Yesterday's Total Sales: KES{" "}
            {yesterdayTotalEarnings.toLocaleString()}
          </Text>
          <Text style={styles.comparisonText}>
            Sales Growth:{" "}
            <Text style={styles.highlightedText}>{salesGrowthText}</Text>
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Meters Inventory Status</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Meter Type</Text>
              <Text style={styles.tableHeaderCell}>In Stock</Text>
              <Text style={styles.tableHeaderCell}>With Agents</Text>
              <Text style={styles.tableHeaderCell}>Sold Today</Text>
              <Text style={styles.tableHeaderCell}>Total Available</Text>
            </View>
            {allMeterTypes.map((item) => (
              <View key={item.type} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.type}</Text>
                <Text style={styles.tableCell}>{item.remaining}</Text>
                <Text style={styles.tableCell}>{item.withAgents}</Text>
                <Text style={styles.tableCell}>{item.soldToday}</Text>
                <Text style={styles.tableCell}>
                  {item.remaining + item.withAgents}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={styles.totalCell}>Total</Text>
              <Text style={styles.totalCell}>{totals.remaining}</Text>
              <Text style={styles.totalCell}>{totals.withAgents}</Text>
              <Text style={styles.totalCell}>{totals.soldToday}</Text>
              <Text style={styles.totalCell}>
                {totals.remaining + totals.withAgents}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Detailed Sales Transactions</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Seller</Text>
              <Text style={styles.tableHeaderCell}>Type</Text>
              <Text style={styles.tableHeaderCell}>Amount</Text>
              <Text style={styles.tableHeaderCell}>Total Price</Text>
              <Text style={styles.tableHeaderCell}>Time</Text>
              <Text style={styles.tableHeaderCell}>Recipient</Text>
            </View>
            {todaySales.map((sale) => (
              <View key={sale.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{sale.user_name}</Text>
                <Text style={styles.tableCell}>{sale.meter_type}</Text>
                <Text style={styles.tableCell}>{sale.batch_amount}</Text>
                <Text style={styles.tableCell}>
                  KES {sale.total_price.toLocaleString()}
                </Text>
                <Text style={styles.tableCell}>
                  {sale.sale_date
                    ? format(new Date(sale.sale_date), "HH:mm:ss")
                    : "N/A"}
                </Text>
                <Text style={styles.tableCell}>{sale.recipient}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Serial Numbers Section */}
        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Details</Text>
          {todaySales.map((sale) => (
            <View key={`serials-${sale.id}`} style={{ marginBottom: 15 }}>
              <Text style={styles.comparisonText}>
                Sale to {sale.recipient} - {sale.meter_type} (
                {sale.batch_amount} meters)
              </Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={styles.tableHeaderCell}>Serial Number</Text>
                  <Text style={styles.tableHeaderCell}>Destination</Text>
                  <Text style={styles.tableHeaderCell}>Contact</Text>
                </View>
                {sale.meters.map((meter, idx) => (
                  <View
                    key={`${sale.id}-${meter.serial_number}`}
                    style={styles.tableRow}>
                    <Text style={styles.tableCell}>{meter.serial_number}</Text>
                    <Text style={styles.tableCell}>{meter.destination}</Text>
                    <Text style={styles.tableCell}>
                      {meter.customer_contact || "N/A"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Daily Report Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default DailyReportPDF;
