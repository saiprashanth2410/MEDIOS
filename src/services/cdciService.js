// src/services/cdciService.js
import Papa from 'papaparse';

export const fetchMedicinesFromCDCI = async () => {
  try {
    
    const response = await fetch('/data/BrandMaster.tsv');
    
    if (!response.ok) {
      throw new Error('Failed to fetch CDCI data');
    }

    const tsvText = await response.text();

    
    const parsed = Papa.parse(tsvText, {
      header: true,          // First row ah header ah treat pannum
      delimiter: '\t',       // Tab character delimiter
      skipEmptyLines: true,  // Empty lines ah skip pannum
    });

   
    const formattedData = parsed.data
      .filter(row => row['Brand Name']) // Empty rows ah filter pannum
      .map((row, index) => {
        // Expiry date CDCI la illa, so default ah oru date vachikalam
        // (Ithu un project ku thevaipadra maathiri maathikonga)
        const defaultExpiryDate = '2027-12-31'; 

        return {
          id: `MED-${row['Identifier'] || index + 1}`,
          name: row['Brand Name'] || 'Unknown Brand',
          generic: row['Generic Name'] || 'Unknown Generic',
          manufacturer: row['Supplier Identifier'] || 'Unknown Manufacturer',
          batchNumber: row['Product Identifier'] || 'N/A',
          category: 'Other', // CDCI la category details illa, so default ah 'Other'
          stock: 0,          // Stock un local data
          price: 0,          // Price un local data
          status: 'In Stock',
          expiryDate: defaultExpiryDate,
        };
      });

    return formattedData;
  } catch (error) {
    console.error('Error fetching CDCI data:', error);
    return []; 
  }
};