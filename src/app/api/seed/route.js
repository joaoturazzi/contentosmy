import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSQL } from '@/lib/db';
import { SEED } from '@/lib/seed';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getSQL();

    // Check if already seeded
    const check = await sql`SELECT COUNT(*)::int as count FROM w2_projects`;
    if (check[0].count > 0) {
      return NextResponse.json({ message: 'Already seeded', seeded: false });
    }

    // Seed projects
    for (const p of SEED.projects) {
      await sql`INSERT INTO w2_projects (id, name, area, status, description, notes, goal_id, created_at)
        VALUES (${p.id}, ${p.name}, ${p.area}, ${p.status}, ${p.description}, ${p.notes}, ${p.goalId}, ${p.createdAt})`;
    }

    // Seed tasks
    for (const t of SEED.tasks) {
      await sql`INSERT INTO w2_tasks (id, title, project_id, priority, due_date, notes, done, goal_id, created_at)
        VALUES (${t.id}, ${t.title}, ${t.projectId}, ${t.priority}, ${t.dueDate}, ${t.notes}, ${t.done}, ${t.goalId}, ${t.createdAt})`;
    }

    // Seed goals
    for (const g of SEED.goals) {
      await sql`INSERT INTO w2_goals (id, title, description, category, status, progress, deadline, progress_mode, key_results, created_at)
        VALUES (${g.id}, ${g.title}, ${g.description}, ${g.category}, ${g.status}, ${g.progress}, ${g.deadline}, ${g.progressMode}, ${JSON.stringify(g.keyResults)}, ${g.createdAt})`;
    }

    // Seed content
    for (const c of SEED.content) {
      await sql`INSERT INTO w2_content (id, title, channel, type, status, scheduled_date, description, created_at)
        VALUES (${c.id}, ${c.title}, ${c.channel}, ${c.type}, ${c.status}, ${c.scheduledDate}, ${c.description}, ${c.createdAt})`;
    }

    // Seed tools
    for (const t of SEED.tools) {
      await sql`INSERT INTO w2_tools (id, name, category, status, url, description)
        VALUES (${t.id}, ${t.name}, ${t.category}, ${t.status}, ${t.url}, ${t.desc})`;
    }

    return NextResponse.json({ message: 'Seed complete', seeded: true });
  } catch (err) {
    console.error('[API] Seed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
