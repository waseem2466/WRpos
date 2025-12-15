export enum MarginType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  cost: number;          // Was costPrice
  transportCost: number;
  totalCost: number;
  marginType: MarginType;
  marginValue: number;
  price: number;         // Was sellingPrice
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalLoan: number;
  totalPaid: number;
  balanceDue: number;
}

export interface BillItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;          // Was costPrice
  price: number;         // Was sellingPrice
  profit: number;
  warranty: boolean;
}

export interface Bill {
  id: string;
  invoiceNumber: string; // Was number
  date: string; // ISO string
  customerId: string | null;
  customerName: string;
  items: BillItem[];
  subtotal: number;      // Was totalAmount
  totalCost: number;
  totalProfit: number;
  discount: number;
  total: number;         // Was finalAmount
  paymentType: 'CASH' | 'LOAN';
}

export interface Loan {
  id: string;
  customerId: string;
  billId: string;
  amount: number;
  date: string;
}

export interface Payment {
  id: string;
  loanId?: string;
  customerId: string;
  amount: number;
  date: string;
  note?: string;
}