// Format- en datumhulpjes (NL locale, tijdzone Europe/Amsterdam).

const MONTHS_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

// Huidige maand als 'YYYY-MM' in Amsterdamse tijd.
export function currentPeriod(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
  });
  // en-CA geeft 'YYYY-MM'
  return fmt.format(now).slice(0, 7);
}

// 'YYYY-MM' -> 'mei 2026'
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS_NL[m - 1]} ${y}`;
}

// Lijst van de laatste N maanden (incl. huidige), nieuwste eerst.
export function recentPeriods(count = 12): string[] {
  const out: string[] = [];
  const cur = currentPeriod();
  let [y, m] = cur.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

// Vorige maand t.o.v. een gegeven periode.
export function previousPeriod(period: string): string {
  let [y, m] = period.split("-").map(Number);
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// Centen -> '€ 1,23'
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

// Tijdstip relatief / leesbaar.
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// "Vandaag 14:32" / "Gisteren 22:41" / "21 mei 09:12"
export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  const dayKey = (x: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
    }).format(x);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (dayKey(d) === dayKey(now)) return `Vandaag ${time}`;
  if (dayKey(d) === dayKey(yesterday)) return `Gisteren ${time}`;

  const date = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${date} ${time}`;
}
