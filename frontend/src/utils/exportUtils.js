// Export data to CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values with commas, quotes, or newlines
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent += values.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export to Excel (actually CSV but Excel can open it)
export const exportToExcel = (data, filename) => {
  exportToCSV(data, filename);
};

// Format data for export (remove IDs, format dates, etc.)
export const formatForExport = (data, type) => {
  switch (type) {
    case 'products':
      return data.map(item => ({
        'Name': item.name,
        'Category': item.category,
        'Price (PKR)': item.price,
        'Stock': item.stock,
        'Commission (PKR)': item.commission,
        'Low Stock Alert': item.lowStockAlert,
        'Created': new Date(item.createdAt).toLocaleDateString()
      }));
    
    case 'sellers':
      return data.map(item => ({
        'Name': item.name,
        'Email': item.email || '-',
        'Phone': item.phone || '-',
        'Total Commission (PKR)': item.totalCommission,
        'Joined': new Date(item.createdAt).toLocaleDateString()
      }));
    
    case 'customers':
      return data.map(item => ({
        'Name': item.name,
        'Type': item.type,
        'Email': item.email || '-',
        'Phone': item.phone || '-',
        'Address': item.address || '-',
        'Created': new Date(item.createdAt).toLocaleDateString()
      }));
    
    case 'sales':
      return data.map(item => ({
        'Date': new Date(item.createdAt).toLocaleDateString(),
        'Product': item.productName,
        'Customer': item.customerName,
        'Seller': item.sellerName,
        'Quantity': item.quantity,
        'Unit Price (PKR)': item.unitPrice,
        'Total (PKR)': item.total,
        'Commission (PKR)': item.commission
      }));
    
    default:
      return data;
  }
};
