import { NextRequest, NextResponse } from "next/server";
import { EMAIL_TEMPLATES } from "@/lib/email-templates-html";
import { replaceVariables } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateSlug } = body;

    if (!templateSlug) {
      return NextResponse.json(
        { error: "Template slug is required" },
        { status: 400 }
      );
    }

    // Get template from code
    const template = EMAIL_TEMPLATES[templateSlug];

    if (!template) {
      return NextResponse.json(
        { error: `No template found for: ${templateSlug}` },
        { status: 404 }
      );
    }

    // Sample variables for preview
    const sampleVariables: Record<string, any> = {
      customer_name: "Nguyễn Văn A",
      booking_reference: "CH25000001",
      property_name: "Sơn Tinh Camp - Lều Luxury",
      campsite_name: "Sơn Tinh Camp",
      pitch_name: "Lều Luxury A1",
      check_in_date: "01/01/2025",
      check_out_date: "03/01/2025",
      checkin_date: "01/01/2025",
      checkout_date: "03/01/2025",
      check_in_time: "14:00",
      total_amount: "500,000",
      number_of_guests: "2",
      cancellation_reason: "Thay đổi kế hoạch",
      property_address: "123 Đường ABC, Hà Nội",
      amount_due: "250,000",
      due_date: "15/01/2025",
      payment_url: "https://campinghub.com/payment/123",
      confirmation_url: "https://campinghub.com/booking/CH25000001",
      notification_link: "https://campinghub.com/admin-camping/bookings/123",
      guest_name: "Nguyễn Văn A",
      guest_email: "nguyenvana@email.com",
      guest_phone: "0901234567",
      amount: "500,000 VND",
      payment_status: "Chờ thanh toán",
      customer_email: "nguyenvana@email.com",
      app_url: "https://campinghub.com",
      reset_url: "https://campinghub.com/reset-password/abc123",
    };

    // Replace variables in HTML
    const previewHTML = replaceVariables(template.html, sampleVariables);

    return new NextResponse(previewHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error("Preview error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate preview",
      },
      { status: 500 }
    );
  }
}
