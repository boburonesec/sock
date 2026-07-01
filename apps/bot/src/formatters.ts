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
        `${formatDate(advance.requestedAt)} — ${advance.status}`,
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
        `${formatMonth(item.month)} — ${item.status}`,
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
        `${order.orderNumber} — ${order.status}`,
        `To‘lov holati: ${order.paymentStatus}`,
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
        `${formatDate(payment.paymentDate)} — ${payment.method}`,
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

function formatAmount(value: string): string {
  return `${value} so‘m`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(value));
}
