export const generateCSV = (data: Record<string, any>[], filename: string) => {
  if (!data || data.length === 0) return;

  // Extract headers from the first object
  const headers = Object.keys(data[0]);

  // Convert data to CSV rows
  const csvRows = [
    // Headers row
    headers.join(","),

    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          // Handle values that might contain commas or quotes
          const value =
            row[header] === null || row[header] === undefined
              ? ""
              : row[header];
          const valueStr = String(value);

          // Escape quotes and wrap in quotes if contains comma, quote or newline
          if (
            valueStr.includes(",") ||
            valueStr.includes('"') ||
            valueStr.includes("\n")
          ) {
            return `"${valueStr.replace(/"/g, '""')}"`;
          }
          return valueStr;
        })
        .join(",")
    ),
  ];

  // Join rows with newlines
  const csvContent = csvRows.join("\n");

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
