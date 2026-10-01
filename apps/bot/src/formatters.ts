import type {
  Advance,
  ClientDebt,
  ClientOrder,
  ClientPayment,
  LinkedAccount,
  PayrollItem,
  SalaryRate,
  WorkerActivity,
} from './api-client';

export function formatLinkedAccount(account: LinkedAccount): string {
  if (account.type === 'CLIENT' && account.client) {
    return [
      '✅ Hisob ulandi.',
      '',
      `Client: ${account.client.name}`,
      'Endi /orders, /debt va /payments buyruqlaridan foydalanishingiz mumkin.',
    ].join('\n');
  }

  if (account.type === 'USER') {
    return [
      '✅ Hisob ulandi.',
      '',
      `Operator: ${account.user?.name ?? 'Noma’lum'}`,
      'Endi Paypoq OS bildirishnomalari shu chatga yuboriladi.',
    ].join('\n');
  }

  return [
    '✅ Hisob ulandi.',
    '',
    `Xodim: ${account.employee?.name ?? 'Noma’lum'}`,
    'Endi /salary, /activities, /advances va /payroll buyruqlaridan foydalanishingiz mumkin.',
  ].join('\n');
}

export function formatUnlinkedAccount(): string {
  return [
    '✅ Hisob uzildi.',
    '',
    'Qayta ulanish uchun web app’dan yangi kod olib /link CODE yuboring.',
  ].join('\n');
}

export function formatSalary(rates: SalaryRate[]): string {
  if (rates.length === 0) {
    return 'Hozircha aktiv stavka topilmadi.';
  }

  return [
    '💰 Aktiv ishbay stavkalar',
    '',
    ...rates.map((rate) =>
      [
        `Bosqich: ${rate.stage.name}`,
        rate.productVariant ? `Mahsulot: ${rate.productVariant.label}` : 'Mahsulot: umumiy',
        `Stavka: ${formatAmount(rate.amount)}`,
      ].join('\n'),
    ),
  ].join('\n\n');
}

export function formatActivities(activities: WorkerActivity[]): string {
  if (activities.length === 0) {
    return 'Hozircha faollik yozuvlari topilmadi.';
  }

  return [
    '🧦 Oxirgi faolliklar',
    '',
    ...activities.map((activity) =>
      [
        `${formatDate(activity.activityDate)} — ${activity.stage.name}`,
        activity.productVariant.label,
        `Miqdor: ${activity.quantity}`,
        `Stavka snapshot: ${formatAmount(activity.salaryRateAmount)}`,
      ].join('\n'),
    ),
  ].join('\n\n');
}

export function formatAdvances(advances: Advance[]): string {
  if (advances.length === 0) {
    return 'Hozircha avans yozuvlari topilmadi.';
  }

  return [
    '💳 Avanslar',
    '',
    ...advances.map((advance) =>
      [
        `${formatDate(advance.requestedAt)} — ${label(advanceStatusLabel, advance.status)}`,
        `Summa: ${formatAmount(advance.amount)}`,
        `Sabab: ${advance.reason}`,
        advance.paidAt ? `To‘langan sana: ${formatDate(advance.paidAt)}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}

export function formatPayroll(items: PayrollItem[]): string {
  if (items.length === 0) {
    return 'Hozircha payroll snapshot topilmadi.';
  }

  return [
    '📋 Payroll',
    '',
    ...items.map((item) =>
      [
        `${formatMonth(item.month)} — ${label(payrollItemStatusLabel, item.status)}`,
        `Ishlangan: ${formatAmount(item.workedAmount)}`,
        `Bonus: ${formatAmount(item.bonusAmount)}`,
        `Jarima: ${formatAmount(item.penaltyAmount)}`,
        `Avans: ${formatAmount(item.advanceAmount)}`,
        `Yakuniy: ${formatAmount(item.finalAmount)}`,
        `To‘langan: ${formatAmount(item.paidAmount)}`,
        `Qoldiq: ${formatAmount(item.remainingAmount)}`,
      ].join('\n'),
    ),
  ].join('\n\n');
}

export function formatClientOrders(orders: ClientOrder[]): string {
  if (orders.length === 0) {
    return 'Hozircha buyurtmalar topilmadi.';
  }

  return [
    '📦 Buyurtmalar',
    '',
    ...orders.map((order) =>
      [
        `${order.orderNumber} — ${label(orderStatusLabel, order.status)}`,
        `To‘lov holati: ${label(paymentStatusLabel, order.paymentStatus)}`,
        `Summa: ${formatAmount(order.totalAmount)}`,
        order.deadline ? `Deadline: ${formatDate(order.deadline)}` : null,
        `Mahsulot qatorlari: ${order.items.length}`,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}

export function formatClientDebt(debt: ClientDebt): string {
  return [
    '🧾 Qarzdorlik',
    '',
    `Client: ${debt.client.name}`,
    `Buyurtmalar jami: ${formatAmount(debt.totalOrders)}`,
    `To‘langan: ${formatAmount(debt.totalPaid)}`,
    `Qarz: ${formatAmount(debt.debt)}`,
  ].join('\n');
}

export function formatClientPayments(payments: ClientPayment[]): string {
  if (payments.length === 0) {
    return 'Hozircha to‘lovlar topilmadi.';
  }

  return [
    '💵 To‘lovlar',
    '',
    ...payments.map((payment) =>
      [
        `${formatDate(payment.paymentDate)} — ${label(paymentMethodLabel, payment.method)}`,
        `Summa: ${formatAmount(payment.amount)}`,
        payment.note ? `Izoh: ${payment.note}` : null,
        payment.allocations.length > 0
          ? `Buyurtmalar: ${payment.allocations
              .map((allocation) => allocation.order.orderNumber)
              .join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}

export const helpText = [
  'Paypoq OS Telegram bot',
  '',
  'Buyruqlar:',
  '/start — bot holatini ko‘rish',
  '/link CODE — web app’dan olingan kod bilan ulanish',
  '/unlink — Telegram hisobni Paypoq OS’dan uzish',
  '/salary — aktiv ishbay stavkalar',
  '/activities — oxirgi faolliklar',
  '/advances — avanslar',
  '/payroll — payroll snapshotlar',
  '/orders — client buyurtmalari',
  '/debt — client qarzdorligi',
  '/payments — client to‘lovlari',
  '/help — yordam',
  '',
  'Bot faqat o‘qish uchun. Ma’lumot kiritish web app orqali qilinadi.',
].join('\n');

export const privateOnlyText = 'Bu bot faqat private chat’da ishlaydi. Iltimos, botga shaxsiy xabar yozing.';

const advanceStatusLabel: Record<string, string> = {
  REQUESTED: 'So‘ralgan',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
  PAID: 'To‘langan',
  APPLIED: 'Hisobga olingan',
  CANCELLED: 'Bekor qilingan',
};

const payrollItemStatusLabel: Record<string, string> = {
  CALCULATED: 'Hisoblangan',
  PARTIALLY_PAID: 'Qisman to‘langan',
  PAID: 'To‘langan',
  CARRIED_FORWARD: 'Keyingi oyga o‘tkazilgan',
};

const orderStatusLabel: Record<string, string> = {
  DRAFT: 'Qoralama',
  CONFIRMED: 'Tasdiqlangan',
  WAITING_PRODUCTION: 'Ishlab chiqarish kutilmoqda',
  READY: 'Tayyor',
  DELIVERED: 'Yetkazilgan',
  CLOSED: 'Yopilgan',
  CANCELLED: 'Bekor qilingan',
};

const paymentStatusLabel: Record<string, string> = {
  UNPAID: 'To‘lanmagan',
  PARTIALLY_PAID: 'Qisman to‘langan',
  PAID: 'To‘langan',
};

const paymentMethodLabel: Record<string, string> = {
  CASH: 'Naqd',
  TRANSFER: 'O‘tkazma',
  OTHER: 'Boshqa',
};

function label(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Backend sends decimal strings ("1500000.00"); only format, never recalculate.
function formatAmount(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return `${value} so‘m`;
  const [, sign, whole, fraction] = match;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const cents = fraction && /[1-9]/.test(fraction) ? `.${fraction.replace(/0+$/, '')}` : '';
  return `${sign}${grouped}${cents} so‘m`;
}

// Factories operate in Asia/Tashkent; the bot container usually runs in UTC,
// which shifted late-evening timestamps to the previous day.
const FACTORY_TIME_ZONE = 'Asia/Tashkent';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone: FACTORY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone: FACTORY_TIME_ZONE,
    year: 'numeric',
    month: 'long',
  }).format(new Date(value));
}
