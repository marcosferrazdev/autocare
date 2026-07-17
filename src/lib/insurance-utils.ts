/** Calcula a próxima data de pagamento com base no dia do mês (1–31). */
export function nextInsurancePaymentDate(paymentDay: number, from: Date = new Date()): Date {
  const day = Math.min(31, Math.max(1, Math.floor(paymentDay)));
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  let year = start.getFullYear();
  let month = start.getMonth();
  let candidate = new Date(year, month, Math.min(day, daysInMonth(year, month)));

  if (candidate.getTime() < start.getTime()) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = new Date(year, month, Math.min(day, daysInMonth(year, month)));
  }

  return candidate;
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export type UsefulContact = { label: string; phone: string };

export function parseUsefulContacts(raw: string | null | undefined): UsefulContact[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (c): c is UsefulContact =>
          !!c && typeof c === 'object' && typeof (c as UsefulContact).label === 'string' && typeof (c as UsefulContact).phone === 'string'
      )
      .map((c) => ({ label: c.label.trim(), phone: c.phone.trim() }))
      .filter((c) => c.label && c.phone)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function serializeUsefulContacts(contacts: UsefulContact[] | null | undefined): string | null {
  if (!contacts || contacts.length === 0) return null;
  return JSON.stringify(
    contacts
      .map((c) => ({ label: c.label.trim(), phone: c.phone.trim() }))
      .filter((c) => c.label && c.phone)
      .slice(0, 10)
  );
}
