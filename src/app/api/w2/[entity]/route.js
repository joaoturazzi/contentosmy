import { NextResponse } from 'next/server';
import { createEntityHandler, VALID_W2_ENTITIES } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request, { params }) {
  const { entity } = await params;
  if (!VALID_W2_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  try {
    const handler = createEntityHandler('w2', entity);
    const rows = await handler.GET();
    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error(`[API] GET w2/${entity} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { entity } = await params;
  if (!VALID_W2_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  try {
    const items = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Body must be an array' }, { status: 400 });
    }
    const handler = createEntityHandler('w2', entity);
    const result = await handler.PUT(items);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[API] PUT w2/${entity} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { entity } = await params;
  if (!VALID_W2_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: 'Unknown entity' }, { status: 404 });
  }
  try {
    const body = await request.json();
    const handler = createEntityHandler('w2', entity);
    const result = await handler.PATCH(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[API] PATCH w2/${entity} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
