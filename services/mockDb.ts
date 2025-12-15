import { neon } from '@neondatabase/serverless';
import { Product, Customer, Bill, MarginType, Loan, Payment } from '../types';

// DIRECT CONNECTION TO YOUR NEON DB
// Removed query parameters (sslmode, channel_binding) as they can cause 'Failed to fetch' errors in browser environments
const sql = neon('postgresql://neondb_owner:npg_SVzmu4KA8gJL@ep-muddy-bush-aeihyvce-pooler.c-2.us-east-2.aws.neon.tech/neondb');

// Helper for generating IDs safely
export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Helper to map Snake_Case DB columns to CamelCase TS properties
const mapProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
  cost: Number(row.cost),
  transportCost: Number(row.transport_cost),
  totalCost: Number(row.total_cost),
  marginType: row.margin_type as MarginType,
  marginValue: Number(row.margin_value),
  price: Number(row.price),
  stock: Number(row.stock),
});

const mapCustomer = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  totalLoan: Number(row.total_loan),
  totalPaid: Number(row.total_paid),
  balanceDue: Number(row.balance_due),
});

const mapBill = (row: any): Bill => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  date: row.date,
  customerId: row.customer_id,
  customerName: row.customer_name,
  items: row.items, // JSONB is automatically parsed
  subtotal: Number(row.subtotal),
  totalCost: Number(row.total_cost),
  totalProfit: Number(row.total_profit),
  discount: Number(row.discount),
  total: Number(row.total),
  paymentType: row.payment_type as 'CASH' | 'LOAN',
});

// Initial Seed Data (Only used if DB is empty)
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cement Bag (50kg)', category: 'Construction', cost: 1800, transportCost: 50, totalCost: 1850, marginType: MarginType.FIXED, marginValue: 150, price: 2000, stock: 100 },
  { id: '2', name: 'PVC Pipe 4"', category: 'Plumbing', cost: 800, transportCost: 20, totalCost: 820, marginType: MarginType.PERCENTAGE, marginValue: 20, price: 984, stock: 50 },
  { id: '3', name: 'Paint Bucket (10L)', category: 'Paints', cost: 4500, transportCost: 100, totalCost: 4600, marginType: MarginType.FIXED, marginValue: 400, price: 5000, stock: 25 },
];

export const db = {
  // Run this on App Mount
  init: async () => {
    try {
      console.log('Initializing Cloud Database...');
      
      await sql`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        cost NUMERIC,
        transport_cost NUMERIC,
        total_cost NUMERIC,
        margin_type TEXT,
        margin_value NUMERIC,
        price NUMERIC,
        stock NUMERIC
      )`;

      await sql`CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        total_loan NUMERIC DEFAULT 0,
        total_paid NUMERIC DEFAULT 0,
        balance_due NUMERIC DEFAULT 0
      )`;

      await sql`CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        invoice_number TEXT,
        date TEXT,
        customer_id TEXT,
        customer_name TEXT,
        items JSONB,
        subtotal NUMERIC,
        total_cost NUMERIC,
        total_profit NUMERIC,
        discount NUMERIC,
        total NUMERIC,
        payment_type TEXT
      )`;

      await sql`CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        bill_id TEXT,
        amount NUMERIC,
        date TEXT
      )`;

      await sql`CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        amount NUMERIC,
        date TEXT,
        note TEXT
      )`;

      // Check if products exist, if not seed
      const products = await sql`SELECT count(*) FROM products`;
      if (Number(products[0].count) === 0) {
        console.log('Seeding initial products...');
        for (const p of INITIAL_PRODUCTS) {
          await db.products.add(p);
        }
      }
      return true;
    } catch (e) {
      console.error("Database Init Failed:", e);
      throw e; // Rethrow to handle in App.tsx
    }
  },

  products: {
    getAll: async (): Promise<Product[]> => {
      const rows = await sql`SELECT * FROM products ORDER BY name ASC`;
      return rows.map(mapProduct);
    },
    add: async (p: Product) => {
      await sql`
        INSERT INTO products (id, name, category, cost, transport_cost, total_cost, margin_type, margin_value, price, stock)
        VALUES (${p.id}, ${p.name}, ${p.category}, ${p.cost}, ${p.transportCost}, ${p.totalCost}, ${p.marginType}, ${p.marginValue}, ${p.price}, ${p.stock})
      `;
    },
    update: async (p: Product) => {
      await sql`
        UPDATE products SET 
          name=${p.name}, category=${p.category}, cost=${p.cost}, transport_cost=${p.transportCost}, 
          total_cost=${p.totalCost}, margin_type=${p.marginType}, margin_value=${p.marginValue}, 
          price=${p.price}, stock=${p.stock}
        WHERE id=${p.id}
      `;
    },
    delete: async (id: string) => {
      await sql`DELETE FROM products WHERE id=${id}`;
    }
  },

  customers: {
    getAll: async (): Promise<Customer[]> => {
      const rows = await sql`SELECT * FROM customers ORDER BY name ASC`;
      return rows.map(mapCustomer);
    },
    add: async (c: Customer) => {
      await sql`
        INSERT INTO customers (id, name, phone, total_loan, total_paid, balance_due)
        VALUES (${c.id}, ${c.name}, ${c.phone}, ${c.totalLoan}, ${c.totalPaid}, ${c.balanceDue})
      `;
    },
    update: async (c: Customer) => {
        // Not used often, but for consistency
        await sql`
            UPDATE customers SET name=${c.name}, phone=${c.phone} WHERE id=${c.id}
        `;
    }
  },

  bills: {
    getAll: async (): Promise<Bill[]> => {
      const rows = await sql`SELECT * FROM bills ORDER BY date DESC`;
      return rows.map(mapBill);
    },
    create: async (bill: Bill) => {
      // 1. Create Bill
      await sql`
        INSERT INTO bills (id, invoice_number, date, customer_id, customer_name, items, subtotal, total_cost, total_profit, discount, total, payment_type)
        VALUES (${bill.id}, ${bill.invoiceNumber}, ${bill.date}, ${bill.customerId}, ${bill.customerName}, ${JSON.stringify(bill.items)}, ${bill.subtotal}, ${bill.totalCost}, ${bill.totalProfit}, ${bill.discount}, ${bill.total}, ${bill.paymentType})
      `;

      // 2. Update Stock
      for (const item of bill.items) {
          // If it's not a manual item (manual items have IDs starting with 'manual-')
          if (!item.productId.startsWith('manual-')) {
             await sql`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.productId}`;
          }
      }

      // 3. Update Customer & Create Loan (if needed)
      if (bill.paymentType === 'LOAN' && bill.customerId) {
        await sql`
          UPDATE customers 
          SET total_loan = total_loan + ${bill.total}, 
              balance_due = balance_due + ${bill.total} 
          WHERE id = ${bill.customerId}
        `;
        
        await sql`
          INSERT INTO loans (id, customer_id, bill_id, amount, date)
          VALUES (${generateId()}, ${bill.customerId}, ${bill.id}, ${bill.total}, ${bill.date})
        `;
      }
    }
  },

  loans: {
    getByCustomerId: async (customerId: string): Promise<Loan[]> => {
      const rows = await sql`SELECT * FROM loans WHERE customer_id = ${customerId}`;
      return rows.map((r: any) => ({
          id: r.id, customerId: r.customer_id, billId: r.bill_id, amount: Number(r.amount), date: r.date
      }));
    },
    update: async (updatedLoan: Loan) => {
      // Get old loan to calc diff
      const oldRows = await sql`SELECT amount FROM loans WHERE id=${updatedLoan.id}`;
      if (oldRows.length === 0) return;
      const oldAmount = Number(oldRows[0].amount);
      const diff = updatedLoan.amount - oldAmount;

      await sql`UPDATE loans SET amount=${updatedLoan.amount}, date=${updatedLoan.date} WHERE id=${updatedLoan.id}`;

      // Update customer
      await sql`
        UPDATE customers 
        SET total_loan = total_loan + ${diff}, 
            balance_due = balance_due + ${diff}
        WHERE id=${updatedLoan.customerId}
      `;
    },
    delete: async (id: string) => {
      const rows = await sql`SELECT * FROM loans WHERE id=${id}`;
      if (rows.length === 0) return;
      const loan = rows[0];

      await sql`DELETE FROM loans WHERE id=${id}`;
      
      // Reverse balance
      await sql`
        UPDATE customers 
        SET total_loan = total_loan - ${loan.amount},
            balance_due = balance_due - ${loan.amount}
        WHERE id=${loan.customer_id}
      `;
    }
  },

  payments: {
    getByCustomerId: async (customerId: string): Promise<Payment[]> => {
       const rows = await sql`SELECT * FROM payments WHERE customer_id = ${customerId}`;
       return rows.map((r: any) => ({
           id: r.id, customerId: r.customer_id, amount: Number(r.amount), date: r.date, note: r.note
       }));
    },
    add: async (payment: Payment) => {
      await sql`
        INSERT INTO payments (id, customer_id, amount, date, note)
        VALUES (${payment.id}, ${payment.customerId}, ${payment.amount}, ${payment.date}, ${payment.note || ''})
      `;

      await sql`
        UPDATE customers
        SET total_paid = total_paid + ${payment.amount},
            balance_due = balance_due - ${payment.amount}
        WHERE id = ${payment.customerId}
      `;
    },
    update: async (updatedPayment: Payment) => {
      const oldRows = await sql`SELECT amount FROM payments WHERE id=${updatedPayment.id}`;
      if (oldRows.length === 0) return;
      const oldAmount = Number(oldRows[0].amount);
      const diff = updatedPayment.amount - oldAmount;

      await sql`UPDATE payments SET amount=${updatedPayment.amount}, date=${updatedPayment.date} WHERE id=${updatedPayment.id}`;

      // Update customer: If payment increases, balance decreases
      await sql`
        UPDATE customers
        SET total_paid = total_paid + ${diff},
            balance_due = balance_due - ${diff}
        WHERE id = ${updatedPayment.customerId}
      `;
    },
    delete: async (id: string) => {
      const rows = await sql`SELECT * FROM payments WHERE id=${id}`;
      if (rows.length === 0) return;
      const payment = rows[0];

      await sql`DELETE FROM payments WHERE id=${id}`;

      // Reverse: Remove payment means debt increases back
      await sql`
        UPDATE customers
        SET total_paid = total_paid - ${payment.amount},
            balance_due = balance_due + ${payment.amount}
        WHERE id=${payment.customer_id}
      `;
    }
  }
};