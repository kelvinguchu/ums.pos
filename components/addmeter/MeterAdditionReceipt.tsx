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

// Register the font
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
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "left",
    color: "#000080",
  },
  dateTime: {
    fontSize: 12,
    marginBottom: 20,
    color: "#000080",
  },
  purchaseInfo: {
    marginBottom: 20,
    fontSize: 12,
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
    fontSize: 12,
    color: "white",
  },
  tableCell: {
    padding: 8,
    fontSize: 12,
    color: "#000080",
  },
  // Add specific widths for each column
  typeColumn: {
    width: "25%",
    borderRightWidth: 1,
    borderRightColor: "#000080",
  },
  quantityColumn: {
    width: "25%",
    borderRightWidth: 1,
    borderRightColor: "#000080",
  },
  unitCostColumn: {
    width: "25%",
    borderRightWidth: 1,
    borderRightColor: "#000080",
  },
  totalCostColumn: {
    width: "25%",
  },
  totals: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: "bold",
    color: "#E46020",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#E46020",
  },
});

interface MeterCount {
  type: string;
  count: number;
}

interface BatchGroup {
  type: string;
  count: number;
  totalCost: string;
}

interface BatchDetails {
  purchaseDate: string;
  batchGroups: BatchGroup[];
}

interface MeterAdditionReceiptProps {
  meterCounts: MeterCount[];
  adderName: string;
  batchDetails: BatchDetails;
}

const MeterAdditionReceipt = ({
  meterCounts,
  adderName,
  batchDetails,
}: MeterAdditionReceiptProps) => {
  const totalMeters = meterCounts.reduce((acc, curr) => acc + curr.count, 0);
  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss");
  const totalCost = batchDetails.batchGroups.reduce(
    (acc, group) => acc + Number.parseFloat(group.totalCost || "0"),
    0
  );

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src='/logo.png' style={styles.logo} />
          <Text style={styles.dateTime}>{currentDateTime}</Text>
        </View>

        <Text style={styles.title}>Meter Addition Receipt</Text>

        <Text style={styles.purchaseInfo}>
          Purchase Date:{" "}
          {format(new Date(batchDetails.purchaseDate), "dd/MM/yyyy")}
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableHeaderCell, styles.typeColumn]}>
              <Text>Meter Type</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.quantityColumn]}>
              <Text>Quantity</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.unitCostColumn]}>
              <Text>Unit Cost (KES)</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.totalCostColumn]}>
              <Text>Total Cost (KES)</Text>
            </View>
          </View>

          {batchDetails.batchGroups.map((group, index) => {
            const unitCost = Number.parseFloat(group.totalCost) / group.count;
            return (
              <View
                key={`${group.type}_${group.count}_${group.totalCost}`}
                style={styles.tableRow}>
                <View style={[styles.tableCell, styles.typeColumn]}>
                  <Text>
                    {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.quantityColumn]}>
                  <Text>{group.count}</Text>
                </View>
                <View style={[styles.tableCell, styles.unitCostColumn]}>
                  <Text>{unitCost.toLocaleString()}</Text>
                </View>
                <View style={[styles.tableCell, styles.totalCostColumn]}>
                  <Text>
                    {Number.parseFloat(group.totalCost).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.totals}>Total Meters Added: {totalMeters}</Text>
        <Text style={styles.totals}>
          Total Cost: KES {totalCost.toLocaleString()}
        </Text>
        <Text style={styles.dateTime}>Added By: {adderName}</Text>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default MeterAdditionReceipt;
