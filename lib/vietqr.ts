/**
 * VietQR - Generate QR code for Vietnamese bank transfers
 *
 * VietQR là chuẩn QR code cho thanh toán ngân hàng tại Việt Nam theo chuẩn EMVCo.
 * Khi quét QR code, app ngân hàng sẽ tự động điền:
 * - Số tài khoản nhận
 * - Số tiền
 * - Nội dung chuyển khoản
 */

import type { BankAccount } from './bank-accounts';

export interface VietQRConfig {
  bankId: string; // Mã ngân hàng (VCB, TCB, MB, ...)
  accountNumber: string; // Số tài khoản
  accountName: string; // Tên chủ tài khoản
  amount: number; // Số tiền (VND)
  description: string; // Nội dung chuyển khoản
  template?: 'compact' | 'print' | 'qr_only'; // Template QR
}

/**
 * Generate VietQR URL
 *
 * Sử dụng VietQR API: https://api.vietqr.io/v2/generate
 */
export function generateVietQRUrl(config: VietQRConfig): string {
  const {
    bankId,
    accountNumber,
    accountName,
    amount,
    description,
    template = 'compact',
  } = config;

  // Build VietQR API URL
  const apiUrl = 'https://img.vietqr.io/image';

  // Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={DESCRIPTION}&accountName={ACCOUNT_NAME}
  const qrUrl = `${apiUrl}/${bankId}-${accountNumber}-${template}.png?` +
    `amount=${amount}&` +
    `addInfo=${encodeURIComponent(description)}&` +
    `accountName=${encodeURIComponent(accountName)}`;

  return qrUrl;
}

/**
 * Generate VietQR for booking payment
 * @param bookingReference - Booking reference code (e.g., GH25000001)
 * @param amount - Payment amount in VND
 * @param isDeposit - true for deposit, false for full payment
 * @param bankAccount - Optional bank account (from database). If not provided, uses ENV variables as fallback
 */
export function generateBookingQRCode(
  bookingReference: string,
  amount: number,
  isDeposit: boolean = true,
  bankAccount?: BankAccount
): string {
  // Priority: Database bank account > ENV variables (fallback)
  const bankId = bankAccount?.bank_id || process.env.SEPAY_BANK_ID || 'VCB';
  const accountNumber = bankAccount?.account_number || process.env.SEPAY_BANK_ACCOUNT || '';
  const accountName = bankAccount?.account_holder || process.env.SEPAY_ACCOUNT_HOLDER || 'GlampingHub';

  // Nội dung chuyển khoản: PHẢI chứa booking_reference để auto-match
  const paymentType = isDeposit ? 'DEPOSIT' : 'FULL';
  const description = `${bookingReference} ${paymentType}`;

  return generateVietQRUrl({
    bankId,
    accountNumber,
    accountName,
    amount,
    description,
    template: 'compact',
  });
}

/**
 * Parse bank ID from bank name
 * Helper để convert tên ngân hàng thành mã ngân hàng
 */
export function getBankId(bankName: string): string {
  const bankMap: Record<string, string> = {
    'Vietcombank': 'VCB',
    'VCB': 'VCB',
    'Techcombank': 'TCB',
    'TCB': 'TCB',
    'MB': 'MB',
    'MBBank': 'MB',
    'VietinBank': 'CTG',
    'CTG': 'CTG',
    'BIDV': 'BIDV',
    'Agribank': 'ABB',
    'ABB': 'ABB',
    'ACB': 'ACB',
    'Sacombank': 'STB',
    'STB': 'STB',
    'VPBank': 'VPB',
    'VPB': 'VPB',
    'TPBank': 'TPB',
    'TPB': 'TPB',
    'SeABank': 'SEAB',
    'SEAB': 'SEAB',
    'HDBank': 'HDB',
    'HDB': 'HDB',
    'VIB': 'VIB',
    'SHB': 'SHB',
    'Eximbank': 'EIB',
    'EIB': 'EIB',
    'MSB': 'MSB',
    'OCB': 'OCB',
    'VietCapitalBank': 'VCCB',
    'VCCB': 'VCCB',
    'SCB': 'SCB',
    'VietABank': 'VAB',
    'VAB': 'VAB',
    'NamABank': 'NAB',
    'NAB': 'NAB',
    'PGBank': 'PGB',
    'PGB': 'PGB',
    'GPBank': 'GPB',
    'GPB': 'GPB',
    'BAC A BANK': 'BAB',
    'BAB': 'BAB',
    'PVcomBank': 'PVCB',
    'PVCB': 'PVCB',
    'Oceanbank': 'OJB',
    'OJB': 'OJB',
    'BVBank': 'BVB',
    'BVB': 'BVB',
    'VRB': 'VRB',
    'Cake': 'CAKE',
    'CAKE': 'CAKE',
    'Ubank': 'UBANK',
    'UBANK': 'UBANK',
    'Timo': 'TIMO',
    'TIMO': 'TIMO',
    'ViettelPay': 'VIETTELPAY',
    'MoMo': 'MOMO',
    'ZaloPay': 'ZALOPAY',
  };

  return bankMap[bankName] || bankName;
}

/**
 * Get payment info for display
 */
export interface PaymentInfo {
  bankName: string;
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  qrCodeUrl: string;
}

/**
 * Get booking payment info
 * @param bookingReference - Booking reference code
 * @param amount - Payment amount
 * @param isDeposit - true for deposit, false for full payment
 * @param bankAccount - Optional bank account (from database)
 */
export function getBookingPaymentInfo(
  bookingReference: string,
  amount: number,
  isDeposit: boolean = true,
  bankAccount?: BankAccount
): PaymentInfo {
  // Priority: Database bank account > ENV variables (fallback)
  const bankName = bankAccount?.bank_name || process.env.SEPAY_BANK_NAME || 'Vietcombank';
  const bankId = bankAccount?.bank_id || process.env.SEPAY_BANK_ID || 'VCB';
  const accountNumber = bankAccount?.account_number || process.env.SEPAY_BANK_ACCOUNT || '';
  const accountName = bankAccount?.account_holder || process.env.SEPAY_ACCOUNT_HOLDER || 'GlampingHub';

  const paymentType = isDeposit ? 'DEPOSIT' : 'FULL';
  const description = `${bookingReference} ${paymentType}`;

  const qrCodeUrl = generateBookingQRCode(bookingReference, amount, isDeposit, bankAccount);

  return {
    bankName,
    bankId,
    accountNumber,
    accountName,
    amount,
    description,
    qrCodeUrl,
  };
}

/**
 * Generate VietQR for balance payment (remaining amount after deposit)
 * @param bookingReference - Booking reference code (e.g., GH25000001)
 * @param amount - Balance amount in VND
 * @param bankAccount - Optional bank account (from database)
 */
export function generateBalanceQRCode(
  bookingReference: string,
  amount: number,
  bankAccount?: BankAccount
): string {
  // Priority: Database bank account > ENV variables (fallback)
  const bankId = bankAccount?.bank_id || process.env.SEPAY_BANK_ID || 'VCB';
  const accountNumber = bankAccount?.account_number || process.env.SEPAY_BANK_ACCOUNT || '';
  const accountName = bankAccount?.account_holder || process.env.SEPAY_ACCOUNT_HOLDER || 'GlampingHub';

  // Nội dung chuyển khoản: booking_reference + balance suffix (không dùng _ vì một số ngân hàng không hỗ trợ)
  const description = `${bookingReference}balance`;

  return generateVietQRUrl({
    bankId,
    accountNumber,
    accountName,
    amount,
    description,
    template: 'compact',
  });
}

/**
 * Get balance payment info for display
 * @param bookingReference - Booking reference code
 * @param amount - Balance amount
 * @param bankAccount - Optional bank account (from database)
 */
export function getBalancePaymentInfo(
  bookingReference: string,
  amount: number,
  bankAccount?: BankAccount
): PaymentInfo {
  // Priority: Database bank account > ENV variables (fallback)
  const bankName = bankAccount?.bank_name || process.env.SEPAY_BANK_NAME || 'Vietcombank';
  const bankId = bankAccount?.bank_id || process.env.SEPAY_BANK_ID || 'VCB';
  const accountNumber = bankAccount?.account_number || process.env.SEPAY_BANK_ACCOUNT || '';
  const accountName = bankAccount?.account_holder || process.env.SEPAY_ACCOUNT_HOLDER || 'GlampingHub';

  const description = `${bookingReference}balance`;
  const qrCodeUrl = generateBalanceQRCode(bookingReference, amount, bankAccount);

  return {
    bankName,
    bankId,
    accountNumber,
    accountName,
    amount,
    description,
    qrCodeUrl,
  };
}
