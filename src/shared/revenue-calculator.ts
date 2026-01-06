export interface RevenueCalculation {
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  netAmount: number;
  currency: string;
}

export const calculateRevenue = (
  amount: number,
  platformFeePercent: number = 20,
  processingFeePercent: number = 2.9
): RevenueCalculation => {
  const platformFee = amount * (platformFeePercent / 100);
  const processingFee = amount * (processingFeePercent / 100);
  const netAmount = amount - platformFee - processingFee;

  return {
    grossAmount: amount,
    platformFee,
    processingFee,
    netAmount,
    currency: 'NOK',
  };
};

export const formatCurrency = (amount: number, currency: string = 'NOK'): string => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency,
  }).format(amount);
};

export default calculateRevenue;
