/**
 * Exporter utilities for Attendance reports (Excel/CSV and PDF Print triggers)
 */

// Export HTML Table to CSV (Excel compatible)
function exportTableToCSV(filename, tableId = 'attendance-table-el') {
  const table = document.getElementById(tableId);
  if (!table) {
    showToast('Export failed: Data table element not found', 'error');
    return;
  }

  const csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    const row = [];
    // Select th and td elements
    const cols = rows[i].querySelectorAll('td, th');

    for (let j = 0; j < cols.length; j++) {
      // Clean cell content: remove excess spacing, action buttons, and nested tags
      let data = cols[j].innerText.trim();
      
      // If cell contains buttons/actions, skip it (usually the last column)
      if (cols[j].classList.contains('actions-col') || cols[j].querySelector('button')) {
        continue;
      }
      
      // Clean newlines and double quotes
      data = data.replace(/(\r\n|\n|\r)/gm, " ");
      data = data.replace(/"/g, '""');
      
      // Push text cell (wrapped as an Excel text formula to prevent Date hash formatting and ID text truncation)
      row.push('="' + data + '"');
    }
    
    if (row.length > 0) {
      csv.push(row.join(","));
    }
  }

  // Combine to CSV string
  const csvString = csv.join("\n");
  
  // Download trigger
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename || 'attendance_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Excel/CSV export completed successfully', 'success');
  }
}

// Print trigger for PDF generation
function triggerPDFPrint() {
  showToast('Preparing PDF layout for printing...', 'info');
  setTimeout(() => {
    window.print();
  }, 500);
}

// Parse CSV string into JSON for bulk upload
function parseCSVInput(text) {
  const lines = text.split('\n');
  const result = [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const obj = {};
    const currentline = lines[i].split(',');

    for (let j = 0; j < headers.length; j++) {
      let val = currentline[j];
      if (val !== undefined) {
        val = val.trim().replace(/^"|"$/g, ''); // strip outer quotes
        obj[headers[j]] = val;
      } else {
        obj[headers[j]] = '';
      }
    }
    result.push(obj);
  }
  return result;
}

// Client-side simulated biometric import
function triggerBiometricMockImport() {
  const biometricModal = document.getElementById('biometric-modal');
  if (biometricModal) {
    openModal('biometric-modal');
  }
}
