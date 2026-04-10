import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerClient();

  const { data: countries, error } = await supabase
    .from('countries')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to fetch countries:', error);
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
  }

  return NextResponse.json(countries || []);
}

// Update a country's data (admin use)
export async function PATCH(request: Request) {
  const supabase = createServerClient();
  const body = await request.json();
  const { numeric_id, ...updates } = body;

  if (!numeric_id) {
    return NextResponse.json({ error: 'Missing numeric_id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('countries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('numeric_id', numeric_id);

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
