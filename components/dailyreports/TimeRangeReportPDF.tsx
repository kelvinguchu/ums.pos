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
  dateRange: {
    fontSize: 12,
    color: "#666",
    marginBottom: 15,
  },
  summarySection: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000080",
  },
  comparisonText: {
    fontSize: 10,
    marginBottom: 5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  statBox: {
    width: "50%",
    padding: 10,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
  },
  statValue: {
    fontSize: 14,
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
  },
  totalRow: {
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#000080",
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
  saleCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  saleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  saleTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000080",
  },
  saleMeta: {
    fontSize: 10,
    color: "#555",
  },
  saleTotal: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000080",
  },
  saleMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  metaItem: {
    width: "50%",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  metaValue: {
    fontSize: 10,
    color: "#111827",
  },
  serialsSection: {
    marginTop: 4,
  },
  serialsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000080",
  },
  serialRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  serialCell: {
    width: "25%",
    fontSize: 9,
    color: "#1f2937",
    paddingVertical: 2,
  },
  noSerialsText: {
    fontSize: 9,
    color: "#6b7280",
  },
});

interface TimeRangeReportPDFProps {
  sales: SaleWithMeters[];
  dateRange: {
    startDate: Date;
    endDate: Date;
    label: string;
  };
  metrics: {
    totalSales: number;
    averageDailySales: number;
    totalMeters: number;
    metersByType: { [key: string]: number };
  };
  remainingMetersByType: RemainingMetersByType[];
  agentInventory: AgentInventory[];
}

const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;

const SERIAL_COLUMNS = 4;

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const TimeRangeReportPDF = ({
  sales,
  dateRange,
  metrics,
  remainingMetersByType,
  agentInventory,
}: TimeRangeReportPDFProps) => {
  const getAgentCount = (meterType: string) => {
    const inventory = agentInventory.find(
      (item) => item.type.toLowerCase() === meterType.toLowerCase()
    );
    return inventory?.with_agents || 0;
  };

  const allMeterTypes = METER_TYPES.map((type) => {
    const existingData = remainingMetersByType.find(
      (item) => item.type.toLowerCase() === type.toLowerCase()
    );
    return {
      type,
      remaining: existingData?.remaining_meters || 0,
      withAgents: getAgentCount(type),
      soldInPeriod: metrics.metersByType[type] || 0,
    };
  });

  const totals = {
    remaining: allMeterTypes.reduce((sum, item) => sum + item.remaining, 0),
    withAgents: allMeterTypes.reduce((sum, item) => sum + item.withAgents, 0),
    soldInPeriod: allMeterTypes.reduce(
      (sum, item) => sum + item.soldInPeriod,
      0
    ),
  };

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src='/logo.png' style={styles.logo} />
          <Text>{format(new Date(), "dd/MM/yyyy HH:mm:ss")}</Text>
        </View>

        <Text style={styles.title}>{dateRange.label}</Text>
        <Text style={styles.dateRange}>
          Period: {format(dateRange.startDate, "dd/MM/yyyy")} -{" "}
          {format(dateRange.endDate, "dd/MM/yyyy")}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={styles.statValue}>
              KES {metrics.totalSales.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Average Daily Sales</Text>
            <Text style={styles.statValue}>
              KES {metrics.averageDailySales.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Meters Sold</Text>
            <Text style={styles.statValue}>{metrics.totalMeters}</Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Meters Status by Type</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Meter Type</Text>
              <Text style={styles.tableHeaderCell}>In Stock</Text>
              <Text style={styles.tableHeaderCell}>With Agents</Text>
              <Text style={styles.tableHeaderCell}>Sold in Period</Text>
              <Text style={styles.tableHeaderCell}>Total Available</Text>
            </View>
            {allMeterTypes.map((item) => (
              <View key={item.type} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.type}</Text>
                <Text style={styles.tableCell}>{item.remaining}</Text>
                <Text style={styles.tableCell}>{item.withAgents}</Text>
                <Text style={styles.tableCell}>{item.soldInPeriod}</Text>
                <Text style={styles.tableCell}>
                  {item.remaining + item.withAgents}
                </Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={styles.totalCell}>Total</Text>
              <Text style={styles.totalCell}>{totals.remaining}</Text>
              <Text style={styles.totalCell}>{totals.withAgents}</Text>
              <Text style={styles.totalCell}>{totals.soldInPeriod}</Text>
              <Text style={styles.totalCell}>
                {totals.remaining + totals.withAgents}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Daily Sales Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Date</Text>
              <Text style={styles.tableHeaderCell}>Total Sales</Text>
              <Text style={styles.tableHeaderCell}>Meters Sold</Text>
            </View>
            {/* Group sales by date and show daily totals */}
            {Object.entries(
              sales.reduce((acc: any, sale) => {
                const date = sale.sale_date
                  ? format(new Date(sale.sale_date), "dd/MM/yyyy")
                  : "N/A";
                if (!acc[date]) {
                  acc[date] = { totalSales: 0, metersSold: 0 };
                }
                acc[date].totalSales += sale.total_price;
                acc[date].metersSold += sale.batch_amount;
                return acc;
              }, {})
            ).map(([date, data]: [string, any]) => (
              <View key={date} style={styles.tableRow}>
                <Text style={styles.tableCell}>{date}</Text>
                <Text style={styles.tableCell}>
                  KES {data.totalSales.toLocaleString()}
                </Text>
                <Text style={styles.tableCell}>{data.metersSold}</Text>
              </View>
            ))}
          </View>
        </View>
        {/* Detailed Sales with Serial Numbers */}
        <View break />

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Details</Text>
          {sales.map((sale) => {
            const totalMetersCount = sale.meters?.length ?? 0;
            const chunkedSerials = chunkArray(
              sale.meters ?? [],
              SERIAL_COLUMNS
            );

            return (
              <View key={sale.id} style={styles.saleCard}>
                <View style={styles.saleHeaderRow}>
                  <View>
                    <Text style={styles.saleTitle}>{sale.recipient}</Text>
                    <Text style={styles.saleMeta}>
                      {sale.meter_type} • {sale.batch_amount} meters
                    </Text>
                    <Text style={styles.saleMeta}>
                      {sale.sale_date
                        ? format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")
                        : "N/A"}
                    </Text>
                  </View>
                  <Text style={styles.saleTotal}>
                    KES {sale.total_price.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.saleMetaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sales Rep</Text>
                    <Text style={styles.metaValue}>{sale.user_name}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Destination</Text>
                    <Text style={styles.metaValue}>{sale.destination}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Contact</Text>
                    <Text style={styles.metaValue}>
                      {sale.customer_contact || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>County</Text>
                    <Text style={styles.metaValue}>
                      {sale.customer_county || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Customer Type</Text>
                    <Text style={styles.metaValue}>
                      {sale.customer_type || "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.serialsSection}>
                  <Text style={styles.serialsTitle}>
                    Serial Numbers ({totalMetersCount})
                  </Text>
                  {chunkedSerials.length > 0 ? (
                    chunkedSerials.map((row, rowIndex) => (
                      <View
                        key={`${sale.id}-row-${rowIndex}`}
                        style={styles.serialRow}>
                        {row.map((meter) => (
                          <Text
                            key={`${sale.id}-${meter.serial_number}`}
                            style={styles.serialCell}>
                            {meter.serial_number}
                          </Text>
                        ))}
                        {Array.from({
                          length: SERIAL_COLUMNS - row.length,
                        }).map((_, fillerIndex) => (
                          <Text
                            key={`${sale.id}-filler-${rowIndex}-${fillerIndex}`}
                            style={styles.serialCell}>
                            {" "}
                          </Text>
                        ))}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noSerialsText}>
                      No meter serials recorded for this transaction.
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • {dateRange.label} Generated on{" "}
          {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
        </Text>
      </Page>
    </Document>
  );
};

export default TimeRangeReportPDF;
