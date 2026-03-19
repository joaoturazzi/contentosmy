import { NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getSQL();
    const [row] = await sql('SELECT NOW() AS time');
    return NextResponse.json({ status: 'ok', db: 'connected', time: row.time });
  } catch (err) {
    return NextResponse.json({ status: 'error', db: 'disconnected', error: err.message }, { status: 500 });
  }
}
