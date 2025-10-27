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
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginBottom: 15,
  },
  tableContainer: {
    width: "100%",
    marginBottom: 20,
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableHeader: {
    backgroundColor: "#000080",
  },
  tableHeaderCell: {
    padding: 8,
    flex: 1,
    fontSize: 10,
    color: "white",
    textAlign: "left",
  },
  tableCell: {
    padding: 8,
    flex: 1,
    fontSize: 10,
    color: "#000",
    textAlign: "left",
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

interface TableReportPDFProps {
  title: string;
  headers: string[];
  data: string[][];
}

const TableReportPDF = ({ title, headers, data }: TableReportPDFProps) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src='/logo.png' style={styles.logo} />
        <Text style={styles.timestamp}>
          {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
        </Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.tableContainer}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {headers.map((header, index) => (
              <Text key={index} style={styles.tableHeaderCell}>
                {header}
              </Text>
            ))}
          </View>

          {/* Table Body */}
          {data.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <Text key={cellIndex} style={styles.tableCell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footer}>
        UMS Prepaid Kenya • Report Generated on{" "}
        {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
      </Text>
    </Page>
  </Document>
);

export default TableReportPDF;
