import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_TEMPLATES } from '@/lib/email-templates-html';

// GET - Get single email template by slug (id = slug for code-based templates)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // id is actually the slug for code-based templates
    const template = EMAIL_TEMPLATES[id];

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: template.slug,
        slug: template.slug,
        name: template.name,
        subject: template.subject,
        body: template.html,
        type: template.type,
        description: template.description,
        available_variables: template.availableVariables,
        is_active: template.isActive,
        is_default: true,
        created_by_name: 'System',
      }
    });

  } catch (error: any) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch email template',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT - Not allowed (templates are defined in code)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Email templates are defined in source code and cannot be modified via API. Please modify lib/email-templates-html.ts instead.'
    },
    { status: 405 }
  );
}

// DELETE - Not allowed (templates are defined in code)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Email templates are defined in source code and cannot be deleted via API. Please modify lib/email-templates-html.ts instead.'
    },
    { status: 405 }
  );
}
