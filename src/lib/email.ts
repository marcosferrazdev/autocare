import { Resend } from 'resend';
import type { UpcomingSchedule } from '@/services/maintenance-schedule-service';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'AutoCare <onboarding@resend.dev>';

function line(s: UpcomingSchedule): string {
  const parts: string[] = [];
  if (s.status === 'atrasado') parts.push('ATRASADO');
  if (s.kmRemaining !== null) {
    parts.push(s.kmRemaining < 0 ? `${Math.abs(s.kmRemaining)} km atrás` : `faltam ${s.kmRemaining} km`);
  }
  if (s.daysRemaining !== null) {
    parts.push(s.daysRemaining < 0 ? `${Math.abs(s.daysRemaining)} dias atrás` : `faltam ${s.daysRemaining} dias`);
  }
  return `<li><strong>${s.type}</strong> — ${parts.join(' · ')}</li>`;
}

/** Envia um e-mail com os lembretes vencidos/próximos de um carro. */
export async function sendReminderEmail(
  to: string,
  userName: string,
  carLabel: string,
  due: UpcomingSchedule[]
): Promise<void> {
  const html = `
    <p>Olá, ${userName}!</p>
    <p>Estes lembretes do seu <strong>${carLabel}</strong> precisam de atenção:</p>
    <ul>${due.map(line).join('')}</ul>
    <p style="color:#64748b;font-size:12px">Enviado automaticamente pelo AutoCare.</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `AutoCare · ${due.length} lembrete(s) para ${carLabel}`,
    html,
  });

  // Resend não lança em falha de API — retorna { error }. Propaga pra virar erro real.
  if (error) throw new Error(`Resend: ${error.message}`);
}
