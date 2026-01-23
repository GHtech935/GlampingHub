import { NextRequest, NextResponse } from "next/server";
import { GLAMPING_EMAIL_TEMPLATES } from "@/lib/glamping-email-templates-html";
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

    // Get template from glamping templates
    const template = GLAMPING_EMAIL_TEMPLATES[templateSlug];

    if (!template) {
      return NextResponse.json(
        { error: `No glamping template found for: ${templateSlug}` },
        { status: 404 }
      );
    }

    // Sample variables for preview (glamping-specific)
    const sampleVariables: Record<string, any> = {
      customer_name: "Nguyen Van A",
      admin_name: "Admin",
      booking_reference: "GL25000001",
      zone_name: "Sapa Glamping Resort",
      item_name: "Villa Deluxe A1",
      check_in_date: "01/01/2025",
      check_out_date: "03/01/2025",
      checkin_date: "01/01/2025",
      checkout_date: "03/01/2025",
      check_in_time: "14:00",
      total_amount: "2,500,000 VND",
      number_of_guests: "2",
      cancellation_reason: "Thay doi ke hoach",
      zone_address: "123 Duong ABC, Sapa, Lao Cai",
      amount_due: "1,250,000 VND",
      amount: "2,500,000 VND",
      due_date: "15/01/2025",
      payment_url: "https://glampinghub.com/payment/123",
      confirmation_url: "https://glampinghub.com/booking/GL25000001",
      notification_link: "https://glampinghub.com/admin-glamping/bookings/123",
      guest_name: "Nguyen Van A",
      guest_email: "nguyenvana@email.com",
      guest_phone: "0901234567",
      payment_status: "Cho thanh toan",
      customer_email: "nguyenvana@email.com",
      app_url: "https://glampinghub.com",
      reset_url: "https://glampinghub.com/reset-password/abc123",
      rebook_url: "https://glampinghub.com/glamping/search",
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
    console.error("Glamping preview error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate glamping preview",
      },
      { status: 500 }
    );
  }
}
