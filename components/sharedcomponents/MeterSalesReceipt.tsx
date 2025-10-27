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
  companyInfo: {
    fontSize: 10,
    color: "#000080",
    textAlign: "right",
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#000080",
  },
  dateTime: {
    fontSize: 12,
    marginBottom: 20,
    color: "#000080", // Navy blue for dates
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
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
    borderRightWidth: 1,
    borderRightColor: "white",
  },
  tableCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    color: "#000080",
    borderRightWidth: 1,
    borderRightColor: "#000080",
  },
  lastCell: {
    borderRightWidth: 0,
  },
  total: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: "bold",
    color: "#E46020", // Orange brand color for total
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#E46020", // Orange for footer
  },
  destinationInfo: {
    marginBottom: 10,
    fontSize: 12,
    color: "#000080",
  },
  signatureRow: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 10,
  },
  signatureField: {
    flex: 1,
    marginRight: 20,
  },
  signatureLabel: {
    fontSize: 10,
    marginBottom: 5,
    color: "#000080",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000080",
    marginTop: 15,
  },
  summaryText: {
    fontSize: 12,
    marginBottom: 5,
    color: "#000080",
  },
  recipientInfo: {
    marginTop: 20,
    fontSize: 12,
    color: "#000080",
  },
});

interface MeterSalesReceiptProps {
  meters: Array<{
    serialNumber: string;
    type: string;
  }>;
  destination: string;
  recipient: string;
  unitPrices: { [key: string]: string };
  userName: string;
  customerType: string;
  customerCounty: string;
  customerContact: string;
  saleDate?: string;
  referenceNumber?: string;
}

const MeterSalesReceipt = ({
  meters,
  destination,
  recipient,
  unitPrices,
  userName,
  customerType,
  customerCounty,
  customerContact,
  saleDate,
  referenceNumber,
}: MeterSalesReceiptProps) => {
  const metersByType = meters.reduce(
    (acc: { [key: string]: typeof meters }, meter) => {
      if (!acc[meter.type]) acc[meter.type] = [];
      acc[meter.type].push(meter);
      return acc;
    },
    {}
  );

  const totalAmount = Object.entries(metersByType).reduce(
    (total, [type, typeMeters]) => {
      return total + typeMeters.length * parseFloat(unitPrices[type] || "0");
    },
    0
  );

  const displayDate = saleDate
    ? format(new Date(saleDate), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");

  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss");

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src='/logo.png' style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>Capital One Plaza,</Text>
            <Text>Eastern Bypass,</Text>
            <Text>Off Thika Road.</Text>
            <Text>0700444448 / 0709155585</Text>
            <Text>info@umskenya.com</Text>
            <Text>umskenya.com</Text>
          </View>
        </View>

        <Text style={styles.title}>Store Transaction Report</Text>

        <Text style={styles.dateTime}>Sale Date: {displayDate}</Text>
        {referenceNumber && (
          <Text style={styles.dateTime}>Reference No: {referenceNumber}</Text>
        )}
        <Text style={styles.dateTime}>
          Receipt Generated: {currentDateTime}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={[styles.table, { marginBottom: 20 }]}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                Customer Type:
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 2, textTransform: "capitalize" },
                ]}>
                {customerType}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>County:</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {customerCounty}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Contact:</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {customerContact}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Recipient:</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{recipient}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Destination:</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{destination}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meter Details</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Meter Type</Text>
              <Text style={styles.tableHeaderCell}>Serial Number</Text>
              <Text style={[styles.tableHeaderCell, styles.lastCell]}>
                Unit Price
              </Text>
            </View>
            {meters.map((meter, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{meter.type}</Text>
                <Text style={styles.tableCell}>{meter.serialNumber}</Text>
                <Text style={[styles.tableCell, styles.lastCell]}>
                  KES. {unitPrices[meter.type]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          {Object.entries(metersByType).map(([type, typeMeters]) => (
            <Text key={type} style={styles.summaryText}>
              {type.charAt(0).toUpperCase() + type.slice(1)}:{" "}
              {typeMeters.length} meters
            </Text>
          ))}
          <Text style={styles.summaryText}>Total Meters: {meters.length}</Text>
          <Text style={[styles.summaryText, { fontWeight: "bold" }]}>
            Total Amount: KES. {totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Prepared by: {userName}</Text>
            <Text style={styles.signatureLabel}>Date: _________________</Text>
            <Text style={styles.signatureLabel}>
              Signature: _________________
            </Text>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>
              Authorized by: _________________
            </Text>
            <Text style={styles.signatureLabel}>Date: _________________</Text>
            <Text style={styles.signatureLabel}>
              Signature: _________________
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default MeterSalesReceipt;
