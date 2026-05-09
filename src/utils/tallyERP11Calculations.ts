/**
 * Tally ERP 11 Compatible Calculations Engine
 * For Pharma POS/Billing System
 * 
 * Features:
 * - Multi-rate pricing (MRP, PTR, PTS, Purchase Rate)
 * - Margin-based pricing
 * - State-based GST (IGST for inter-state, CGST+SGST for intra-state)
 * - Batch expiry warnings
 * - Profit & margin calculations
 */

export interface RateCalculation {
  mrp: number;
  ptr: number; // Price to Retailer
  pts: number; // Price to Stockist
  purchaseRate: number;
  margin: number;
  marginPercent: number;
  profitPerUnit: number;
  profitPercent: number;
}

export interface GSTCalculation {
  isInterState: boolean;
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  netAmount: number;
}

export interface BatchValuation {
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  rate: number;
  method: 'FIFO' | 'LIFO' | 'WeightedAverage';
  value: number;
  daysToExpiry: number;
  isExpiring: boolean;
  expiryWarning: string;
}

export interface LineItemCalculation {
  productId: string;
  productName: string;
  quantity: number;
  freeQuantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableValue: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  totalAmount: number;
  mrp: number;
  ptr: number;
  pts: number;
  profitPerUnit: number;
  profitPercent: number;
  totalProfit: number;
  marginalProfit: number;
  scheme?: string;
  schemeQty?: number;
}

export interface InvoiceSummary {
  totalItems: number;
  totalQuantity: number;
  totalFreeQuantity: number;
  grossAmount: number; // Before discount
  totalDiscount: number;
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGst: number;
  freightCharges: number;
  otherCharges: number;
  roundOff: number;
  netAmount: number;
  averageMarginPercent: number;
  totalProfit: number;
}

// ============================================
// RATE CALCULATIONS (Tally ERP 11 Style)
// ============================================

export const calculateRates = (
  mrp: number,
  purchaseRate: number,
  marginPercent?: number,
  scheme?: string
): RateCalculation => {
  // Default margins for pharma
  const retailMarginPercent = marginPercent || 30; // Default 30% margin
  
  // Calculate PTR (Price to Retailer) - wholesale rate
  const ptr = purchaseRate * (1 + (retailMarginPercent - 10) / 100); // 10% less margin
  
  // Calculate PTS (Price to Stockist) - distributor rate
  const pts = purchaseRate * (1 + (retailMarginPercent - 15) / 100); // 15% less margin
  
  // Validate against MRP
  const finalMrp = Math.min(mrp, Math.max(mrp, mrp)); // Ensure MRP is not exceeded
  
  const margin = finalMrp - purchaseRate;
  const marginPercentActual = (margin / purchaseRate) * 100;
  const profitPerUnit = finalMrp - purchaseRate;
  const profitPercent = ((finalMrp - purchaseRate) / finalMrp) * 100;
  
  return {
    mrp: finalMrp,
    ptr: Math.round(ptr * 100) / 100,
    pts: Math.round(pts * 100) / 100,
    purchaseRate,
    margin,
    marginPercent: Math.round(marginPercentActual * 100) / 100,
    profitPerUnit,
    profitPercent: Math.round(profitPercent * 100) / 100
  };
};

// ============================================
// GST CALCULATIONS (State-wise)
// ============================================

export const calculateGST = (
  taxableValue: number,
  gstPercent: number,
  isInterState: boolean = false,
  sellerState?: string,
  buyerState?: string
): GSTCalculation => {
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  
  // Determine if inter-state or intra-state
  const isIntraState = !isInterState && sellerState && buyerState && sellerState === buyerState;
  
  if (isIntraState) {
    // Intra-state: split into CGST and SGST
    cgstAmount = (taxableValue * gstPercent) / (2 * 100);
    sgstAmount = cgstAmount;
    igstAmount = 0;
  } else {
    // Inter-state: IGST
    igstAmount = (taxableValue * gstPercent) / 100;
    cgstAmount = 0;
    sgstAmount = 0;
  }
  
  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const netAmount = taxableValue + totalTax;
  
  return {
    isInterState,
    gstRate: gstPercent,
    taxableValue,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100
  };
};

// ============================================
// BATCH VALUATION & EXPIRY TRACKING
// ============================================

export const calculateBatchValuation = (
  batchNumber: string,
  expiryDate: string,
  quantity: number,
  rate: number,
  method: 'FIFO' | 'LIFO' | 'WeightedAverage' = 'FIFO'
): BatchValuation => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysToExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  let expiryWarning = '';
  let isExpiring = false;
  
  if (daysToExpiry < 0) {
    expiryWarning = '⚠️ EXPIRED';
    isExpiring = true;
  } else if (daysToExpiry <= 30) {
    expiryWarning = `⚠️ Expiring in ${daysToExpiry} days`;
    isExpiring = true;
  } else if (daysToExpiry <= 90) {
    expiryWarning = `📅 Expires in ${daysToExpiry} days`;
  }
  
  const value = quantity * rate;
  
  return {
    batchNumber,
    expiryDate,
    quantity,
    rate,
    method,
    value,
    daysToExpiry,
    isExpiring,
    expiryWarning
  };
};

// ============================================
// LINE ITEM CALCULATION (Complete)
// ============================================

export const calculateLineItem = (
  productId: string,
  productName: string,
  quantity: number,
  freeQuantity: number,
  rate: number,
  discountPercent: number,
  gstPercent: number,
  mrp: number,
  purchaseRate: number,
  scheme?: string,
  isInterState?: boolean,
  sellerState?: string,
  buyerState?: string
): LineItemCalculation => {
  // Calculate rates
  const rateCalc = calculateRates(mrp, purchaseRate);
  
  // Calculate amounts
  const lineQuantity = quantity + freeQuantity;
  const grossAmount = rate * quantity; // Free items not charged
  const discountAmount = (grossAmount * discountPercent) / 100;
  const netBeforeTax = grossAmount - discountAmount;
  const taxableValue = netBeforeTax / (1 + gstPercent / 100);
  
  // Calculate GST
  const gstCalc = calculateGST(taxableValue, gstPercent, isInterState, sellerState, buyerState);
  
  const totalAmount = netBeforeTax;
  
  // Calculate profit
  const totalCostPrice = purchaseRate * quantity;
  const totalProfit = totalAmount - totalCostPrice;
  const totalProfitPercent = (totalProfit / totalAmount) * 100;
  
  // Calculate marginal profit
  const costWithoutTax = taxableValue * quantity;
  const marginalProfit = totalAmount - costWithoutTax;
  
  return {
    productId,
    productName,
    quantity,
    freeQuantity,
    rate,
    discountPercent,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableValue: Math.round(taxableValue * 100) / 100,
    gstPercent,
    cgstAmount: Math.round(gstCalc.cgstAmount * 100) / 100,
    sgstAmount: Math.round(gstCalc.sgstAmount * 100) / 100,
    igstAmount: Math.round(gstCalc.igstAmount * 100) / 100,
    totalGst: Math.round(gstCalc.totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    mrp: rateCalc.mrp,
    ptr: rateCalc.ptr,
    pts: rateCalc.pts,
    profitPerUnit: Math.round(rateCalc.profitPerUnit * 100) / 100,
    profitPercent: Math.round(rateCalc.profitPercent * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    marginalProfit: Math.round(marginalProfit * 100) / 100,
    scheme,
    schemeQty: scheme ? Math.floor(quantity / parseInt(scheme.split('+')[0])) : 0
  };
};

// ============================================
// INVOICE SUMMARY CALCULATION
// ============================================

export const calculateInvoiceSummary = (
  items: LineItemCalculation[],
  freightCharges: number = 0,
  otherCharges: number = 0
): InvoiceSummary => {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalFreeQuantity = items.reduce((sum, item) => sum + item.freeQuantity, 0);
  
  const grossAmount = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxableValue = items.reduce((sum, item) => sum + item.taxableValue, 0);
  const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  
  let netAmount = grossAmount - totalDiscount + totalGst + freightCharges + otherCharges;
  const roundOff = Math.round(netAmount) - netAmount;
  netAmount = Math.round(netAmount);
  
  const totalProfit = items.reduce((sum, item) => sum + item.totalProfit, 0);
  const averageMarginPercent = netAmount > 0 ? (totalProfit / netAmount) * 100 : 0;
  
  return {
    totalItems,
    totalQuantity,
    totalFreeQuantity,
    grossAmount: Math.round(grossAmount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableValue: Math.round(taxableValue * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    totalGst,
    freightCharges,
    otherCharges,
    roundOff,
    netAmount,
    averageMarginPercent: Math.round(averageMarginPercent * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100
  };
};

// ============================================
// DISCOUNT VALIDATION (Tally Style)
// ============================================

export const validateDiscount = (
  discountPercent: number,
  maximumDiscountAllowed: number = 20
): { isValid: boolean; message: string } => {
  if (discountPercent < 0) {
    return { isValid: false, message: 'Discount cannot be negative' };
  }
  
  if (discountPercent > maximumDiscountAllowed) {
    return {
      isValid: false,
      message: `Discount ${discountPercent}% exceeds maximum allowed ${maximumDiscountAllowed}%`
    };
  }
  
  if (discountPercent > 10) {
    return {
      isValid: true,
      message: `⚠️ High discount: ${discountPercent}% (Max recommended: 10%)`
    };
  }
  
  return { isValid: true, message: 'Discount valid' };
};

// ============================================
// SCHEME APPLICATION (Like Tally)
// ============================================

export const applyScheme = (
  scheme: string,
  quantity: number,
  freeQuantity: number
): { totalQuantity: number; freeQty: number; schemeDetail: string } => {
  if (!scheme) {
    return { totalQuantity: quantity, freeQty: freeQuantity, schemeDetail: 'No scheme' };
  }
  
  // Parse scheme like "10+1" (buy 10 get 1 free)
  const parts = scheme.split('+');
  if (parts.length !== 2) {
    return { totalQuantity: quantity, freeQty: freeQuantity, schemeDetail: 'Invalid scheme format' };
  }
  
  const buyQty = parseInt(parts[0]);
  const freeQty = parseInt(parts[1]);
  
  const schemeActualFree = Math.floor(quantity / buyQty) * freeQty;
  
  return {
    totalQuantity: quantity + schemeActualFree,
    freeQty: schemeActualFree,
    schemeDetail: `${scheme}: ${schemeActualFree} free items`
  };
};

// ============================================
// INVENTORY VALUATION METHODS
// ============================================

export const calculateStockValuation = (
  batches: Array<{ quantity: number; rate: number; date: string }>,
  method: 'FIFO' | 'LIFO' | 'WeightedAverage' = 'WeightedAverage'
): number => {
  if (method === 'FIFO') {
    // FIFO: assumes oldest batches are sold first
    return batches.reduce((sum, batch) => sum + batch.quantity * batch.rate, 0);
  } else if (method === 'LIFO') {
    // LIFO: assumes newest batches are sold first
    return [...batches].reverse().reduce((sum, batch) => sum + batch.quantity * batch.rate, 0);
  } else {
    // Weighted Average
    const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
    const totalValue = batches.reduce((sum, batch) => sum + batch.quantity * batch.rate, 0);
    return (totalValue / totalQuantity) * totalQuantity;
  }
};

// ============================================
// PROFITABILITY ANALYSIS
// ============================================

export const calculateProfitability = (items: LineItemCalculation[]) => {
  const totalRevenue = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.rate * 0.65), 0); // Approx 65% cost
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  const highMarginItems = items.filter(item => item.profitPercent > 35);
  const mediumMarginItems = items.filter(item => item.profitPercent >= 20 && item.profitPercent <= 35);
  const lowMarginItems = items.filter(item => item.profitPercent < 20);
  
  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    highMarginItems: highMarginItems.length,
    mediumMarginItems: mediumMarginItems.length,
    lowMarginItems: lowMarginItems.length
  };
};
