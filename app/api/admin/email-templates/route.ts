import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_TEMPLATES } from '@/lib/email-templates-html';

// GET - List all email templates from code (read-only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    // Convert EMAIL_TEMPLATES to array format expected by frontend
    let templates = Object.values(EMAIL_TEMPLATES).map(t => ({
      id: t.slug, // Use slug as id
      slug: t.slug,
      name: t.name,
      subject: t.subject,
      body: t.html,
      type: t.type,
      description: t.description,
      available_variables: t.availableVariables,
      is_active: t.isActive,
      is_default: true,
      created_at: new Date().toISOString(),
      created_by_name: 'System',
    }));

    // Filter by type if provided
    if (type && type !== 'all') {
      templates = templates.filter(t => t.type === type);
    }

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.subject.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch email templates',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST - Not allowed (templates are defined in code)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Email templates are defined in source code and cannot be created via API. Please modify lib/email-templates-html.ts instead.'
    },
    { status: 405 }
  );
}
