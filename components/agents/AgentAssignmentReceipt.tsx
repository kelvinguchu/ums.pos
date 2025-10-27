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
  section: {
    marginBottom: 20,
  },
  agentInfo: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
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
  summaryText: {
    fontSize: 12,
    marginBottom: 5,
    color: "#000080",
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000080",
    marginTop: 40,
    marginBottom: 5,
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

interface AgentAssignmentReceiptProps {
  meters: Array<{
    serialNumber: string;
    type: string;
  }>;
  agentName: string;
  agentLocation: string;
  assignedBy: string;
}

const AgentAssignmentReceipt = ({
  meters,
  agentName,
  agentLocation,
  assignedBy,
}: AgentAssignmentReceiptProps) => {
  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss");
  const metersByType = meters.reduce(
    (acc: { [key: string]: typeof meters }, meter) => {
      if (!acc[meter.type]) acc[meter.type] = [];
      acc[meter.type].push(meter);
      return acc;
    },
    {}
  );

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

        <Text style={styles.title}>Agent Meter Assignment Receipt</Text>

        <View style={styles.agentInfo}>
          <Text style={styles.summaryText}>Agent Name: {agentName}</Text>
          <Text style={styles.summaryText}>Location: {agentLocation}</Text>
          <Text style={styles.summaryText}>
            Assignment Date: {currentDateTime}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Meter Type</Text>
              <Text style={[styles.tableHeaderCell, styles.lastCell]}>
                Serial Number
              </Text>
            </View>
            {meters.map((meter) => (
              <View
                key={`${meter.type}-${meter.serialNumber}`}
                style={styles.tableRow}>
                <Text style={styles.tableCell}>{meter.type}</Text>
                <Text style={[styles.tableCell, styles.lastCell]}>
                  {meter.serialNumber}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.summaryText}>Summary:</Text>
          {Object.entries(metersByType).map(([type, typeMeters]) => (
            <Text key={type} style={styles.summaryText}>
              {type}: {typeMeters.length} meters
            </Text>
          ))}
          <Text
            style={[styles.summaryText, { fontWeight: "bold", marginTop: 10 }]}>
            Total Meters Assigned: {meters.length}
          </Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.summaryText}>Assigned By:</Text>
            <Text style={styles.summaryText}>{assignedBy}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.summaryText}>Signature & Date</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.summaryText}>Received By:</Text>
            <Text style={styles.summaryText}>{agentName}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.summaryText}>Signature & Date</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default AgentAssignmentReceipt;
