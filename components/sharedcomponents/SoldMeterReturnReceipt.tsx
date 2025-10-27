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
  highlight: {
    color: "#E46020",
    fontWeight: "bold",
  },
});

interface SoldMeterReturnReceiptProps {
  meters: Array<{
    serialNumber: string;
    type: string;
    soldAt: string;
    status: "healthy" | "faulty";
    faultDescription?: string;
  }>;
  returnedBy: string;
  returnDate: string;
}

export default function SoldMeterReturnReceipt({
  meters,
  returnedBy,
  returnDate,
}: SoldMeterReturnReceiptProps) {
  const healthyMeters = meters.filter((m) => m.status === "healthy");
  const faultyMeters = meters.filter((m) => m.status === "faulty");

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src='/logo.png' style={styles.logo} />
          <Text>{format(new Date(), "dd/MM/yyyy HH:mm:ss")}</Text>
        </View>

        <Text style={styles.title}>Sold Meter Return Receipt</Text>

        <View style={styles.section}>
          <Text>Returned By: {returnedBy}</Text>
          <Text>
            Return Date: {format(new Date(returnDate), "dd/MM/yyyy HH:mm:ss")}
          </Text>
          <Text style={{ marginTop: 10 }}>
            Total Meters: {meters.length} ({healthyMeters.length} healthy,{" "}
            {faultyMeters.length} faulty)
          </Text>
        </View>

        {healthyMeters.length > 0 && (
          <View style={styles.section}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "bold",
                marginBottom: 10,
                color: "#2ECC40",
              }}>
              Healthy Meters (Returned to Stock)
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Serial Number</Text>
                <Text style={styles.tableCell}>Type</Text>
                <Text style={styles.tableCell}>Originally Sold</Text>
              </View>
              {healthyMeters.map((meter, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{meter.serialNumber}</Text>
                  <Text style={styles.tableCell}>{meter.type}</Text>
                  <Text style={styles.tableCell}>
                    {format(new Date(meter.soldAt), "dd/MM/yyyy")}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {faultyMeters.length > 0 && (
          <View style={styles.section}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "bold",
                marginBottom: 10,
                color: "#FF4136",
              }}>
              Faulty Meters
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Serial Number</Text>
                <Text style={styles.tableCell}>Type</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  Fault Description
                </Text>
              </View>
              {faultyMeters.map((meter, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{meter.serialNumber}</Text>
                  <Text style={styles.tableCell}>{meter.type}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {meter.faultDescription}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Sold Meter Return Receipt
        </Text>
      </Page>
    </Document>
  );
}
