import { NextRequest, NextResponse } from 'next/server';
import { getBankAccountForGlampingZone } from '@/lib/bank-accounts';

// GET - Get bank account for a glamping zone (for QR generation)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bankAccount = await getBankAccountForGlampingZone(id);

    return NextResponse.json({
      bank_name: bankAccount.bank_name,
      bank_id: bankAccount.bank_id,
      account_number: bankAccount.account_number,
      account_holder: bankAccount.account_holder,
    });
  } catch (error: any) {
    console.error('Error fetching bank account for zone:', error);

    // Fallback to ENV variables if no bank account found
    if (error.message?.includes('No default bank account found') ||
        error.message?.includes('Glamping zone not found')) {
      return NextResponse.json({
        bank_name: process.env.SEPAY_BANK_NAME || 'Vietcombank',
        bank_id: process.env.SEPAY_BANK_ID || 'VCB',
        account_number: process.env.SEPAY_BANK_ACCOUNT || '',
        account_holder: process.env.SEPAY_ACCOUNT_HOLDER || 'GlampingHub',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch bank account' },
      { status: 500 }
    );
  }
}
