export type WarrantyClaimInput = {
  productName: string;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate: string;
  invoiceNumber?: string | null;
  warrantyExpiryDate: string;
  problem?: string;
};

export function composeWarrantyClaim(input: WarrantyClaimInput): string {
  const model = input.modelNumber ? ` (model ${input.modelNumber})` : "";
  const serial = input.serialNumber ? ` The serial number is ${input.serialNumber}.` : "";
  const invoice = input.invoiceNumber ? `Invoice/order reference: ${input.invoiceNumber}\n` : "";
  return `Subject: Warranty service request — ${input.productName}\n\nHello ${input.brand || "Support Team"},\n\nI am requesting warranty service for my ${input.productName}${model}.${serial}\n\nPurchase date: ${input.purchaseDate}\n${invoice}Warranty expiry: ${input.warrantyExpiryDate}\n\nProblem description:\n${input.problem || "Please describe the issue."}\n\nPlease let me know the next steps for assessment or repair. I can provide the stored proof of purchase if required.\n\nKind regards`;
}
