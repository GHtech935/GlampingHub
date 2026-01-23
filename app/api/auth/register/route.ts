import { NextRequest, NextResponse } from 'next/server';
import { createOrGetCustomer } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  firstName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  lastName: z.string().min(2, 'Họ phải có ít nhất 2 ký tự'),
  phone: z.string().optional(),
  country: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create or get customer (no password for customers)
    const customer = await createOrGetCustomer(data);

    if (!customer) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng hoặc có lỗi xảy ra' },
        { status: 400 }
      );
    }

    // Note: No auto-login for customers (they don't have passwords/sessions)

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi đăng ký' },
      { status: 500 }
    );
  }
}
