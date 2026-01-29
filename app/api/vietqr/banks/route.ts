import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

/**
 * GET /api/vietqr/banks
 *
 * Fetch list of banks from VietQR API
 * Returns simplified bank data for use in dropdowns
 */
export async function GET() {
  try {
    const response = await fetch('https://api.vietqr.io/v2/banks', {
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch banks from VietQR');
    }

    const data = await response.json();

    // Transform to simpler format
    const banks = data.data.map((bank: VietQRBank) => ({
      id: bank.id,
      name: bank.name,
      shortName: bank.shortName,
      code: bank.code,
      bin: bank.bin,
      logo: bank.logo,
    }));

    return NextResponse.json({
      success: true,
      data: banks,
    });
  } catch (error) {
    console.error('Error fetching VietQR banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}
