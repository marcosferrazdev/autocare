import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { MaintenanceScheduleService } from '@/services/maintenance-schedule-service';
import { sendReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Envia por e-mail (Resend) os lembretes vencidos/próximos de todos os carros.
 * Protegido por CRON_SECRET (header Authorization: Bearer <secret>).
 * Chamar por um cron externo (ex.: Vercel Cron) 1x/dia.
 *
 * ponytail: sem deduplicação — reenvia todo dia enquanto o lembrete estiver
 * atrasado/próximo. Se virar spam, adicionar campo lastNotifiedAt no
 * MaintenanceSchedule e pular os notificados nas últimas 24h.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const cars = await prisma.car.findMany({
    include: { user: { select: { name: true, email: true } } },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const car of cars) {
    try {
      const schedules = await MaintenanceScheduleService.listWithStatus(car.id, car.userId);
      const due = schedules.filter((s) => s.status === 'atrasado' || s.status === 'proximo');
      if (due.length === 0) continue;

      const label = car.nickname || `${car.brand} ${car.model}`;
      await sendReminderEmail(car.user.email, car.user.name, label, due);
      sent++;
    } catch (e: any) {
      errors.push(`${car.id}: ${e.message}`);
    }
  }

  return NextResponse.json({ ok: true, carsChecked: cars.length, emailsSent: sent, errors });
}
