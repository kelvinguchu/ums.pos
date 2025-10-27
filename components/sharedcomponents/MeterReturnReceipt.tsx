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
  section: {
    marginBottom: 20,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000080",
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: "#000080",
    color: "white",
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 10,
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

interface MeterReturnReceiptProps {
  meters: Array<{
    serialNumber: string;
    type: string;
    assignedAt: string;
  }>;
  agentName: string;
  agentLocation: string;
  returnedBy: string;
  returnDate: string;
}

export default function MeterReturnReceipt({
  meters,
  agentName,
  agentLocation,
  returnedBy,
  returnDate,
}: MeterReturnReceiptProps) {
  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src='/logo.png' style={styles.logo} />
          <Text>{format(new Date(), "dd/MM/yyyy HH:mm:ss")}</Text>
        </View>

        <Text style={styles.title}>Meter Return Receipt</Text>

        <View style={styles.section}>
          <Text>Agent Name: {agentName}</Text>
          <Text>Location: {agentLocation}</Text>
          <Text>Returned By: {returnedBy}</Text>
          <Text>
            Return Date: {format(new Date(returnDate), "dd/MM/yyyy HH:mm:ss")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>
            Returned Meters
          </Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Serial Number</Text>
              <Text style={styles.tableCell}>Type</Text>
              <Text style={styles.tableCell}>Originally Assigned</Text>
            </View>
            {meters.map((meter, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{meter.serialNumber}</Text>
                <Text style={styles.tableCell}>{meter.type}</Text>
                <Text style={styles.tableCell}>
                  {format(new Date(meter.assignedAt), "dd/MM/yyyy")}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Meter Return Receipt
        </Text>
      </Page>
    </Document>
  );
}
