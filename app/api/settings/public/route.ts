import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// List of setting keys that are safe to expose publicly
const PUBLIC_SETTINGS = [
  'social_facebook_url',
  'social_twitter_url',
  'social_instagram_url'
]

// GET /api/settings/public - Get public settings (no auth required)
export async function GET(request: NextRequest) {
  try {
    // Get specific keys from query params, or return all public settings
    const { searchParams } = new URL(request.url)
    const keysParam = searchParams.get('keys')

    let keysToFetch: string[] = PUBLIC_SETTINGS

    if (keysParam) {
      // Filter to only allow public settings
      const requestedKeys = keysParam.split(',')
      keysToFetch = requestedKeys.filter(key => PUBLIC_SETTINGS.includes(key))
    }

    if (keysToFetch.length === 0) {
      return NextResponse.json({ settings: {} })
    }

    const { rows } = await pool.query(
      `SELECT key, value
       FROM admin_settings
       WHERE key = ANY($1::text[])`,
      [keysToFetch]
    )

    // Convert to key-value object
    const settings: Record<string, unknown> = {}
    for (const row of rows) {
      let value = row.value
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value)
        } catch {
          // Keep as string if JSON parse fails (e.g., empty string)
        }
      }
      settings[row.key] = value
    }

    // Fill in defaults for missing settings
    for (const key of keysToFetch) {
      if (!(key in settings)) {
        // Default values
        switch (key) {
          case 'social_facebook_url':
          case 'social_twitter_url':
          case 'social_instagram_url':
            settings[key] = ''
            break
          default:
            settings[key] = null
        }
      }
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching public settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}
