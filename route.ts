import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { countryName, countryId } = await request.json();

  if (!countryName) {
    return NextResponse.json({ error: 'Missing countryName' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check for cached briefing (less than 1 hour old)
  const { data: cached } = await supabase
    .from('briefings')
    .select('*')
    .eq('country_name', countryName)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    return NextResponse.json({
      ...cached,
      key_facts: cached.key_facts || [],
      recent_news: cached.recent_news || [],
      cached: true,
    });
  }

  // Fetch fresh briefing from Claude
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `You are a geopolitical intelligence analyst. Give a brief real-time briefing on ${countryName}. Search for the latest news. Respond ONLY with a JSON object, no markdown or backticks:
{"headline":"Top story under 15 words","stability":"stable|tensions|conflict|crisis","keyFacts":["fact1","fact2","fact3"],"recentNews":["headline1","headline2","headline3"],"governmentType":"type","leader":"name","population":"approx","gdp":"approx","analysis":"2-3 sentence geopolitical analysis"}`
        }],
      }),
    });

    const data = await res.json();
    const textContent = data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('') || '';

    const parsed = JSON.parse(textContent.replace(/```json|```/g, '').trim());

    // Cache in Supabase
    const briefingRow = {
      country_id: countryId || null,
      country_name: countryName,
      headline: parsed.headline,
      stability: parsed.stability,
      government_type: parsed.governmentType,
      leader: parsed.leader,
      population: parsed.population,
      gdp: parsed.gdp,
      key_facts: parsed.keyFacts || [],
      recent_news: parsed.recentNews || [],
      analysis: parsed.analysis,
    };

    await supabase.from('briefings').insert(briefingRow);

    return NextResponse.json({
      ...briefingRow,
      cached: false,
    });
  } catch (err: any) {
    console.error('Briefing fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch briefing' }, { status: 500 });
  }
}
