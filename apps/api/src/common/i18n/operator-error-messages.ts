/**
 * Operator-facing API error messages (Uzbek-first).
 * English backend/Nest/class-validator strings are mapped here so the web UI
 * never shows raw technical English to factory operators.
 */

const STATUS_DEFAULTS: Record<number, string> = {
  400: 'Kiritilgan ma’lumotlar noto‘g‘ri. Iltimos, maydonlarni tekshiring.',
  401: 'Sessiya tugagan yoki kirish talab qilinadi. Qayta kiring.',
  403: 'Bu amal uchun ruxsatingiz yo‘q.',
  404: 'So‘ralgan ma’lumot topilmadi.',
  409: 'Bu amal hozir bajarilmaydi (ziddiyat). Holatni tekshirib qayta urinib ko‘ring.',
  422: 'Ma’lumotlar qayta ishlanmadi. Kiritishlarni tekshiring.',
  429: 'Juda ko‘p urinish. Biroz kutib qayta urinib ko‘ring.',
  500: 'Serverda xatolik yuz berdi. Keyinroq urinib ko‘ring.',
  502: 'Server vaqtincha ishlamayapti. Keyinroq urinib ko‘ring.',
  503: 'Xizmat vaqtincha mavjud emas. Keyinroq urinib ko‘ring.',
};

/** Exact English (or mixed) message → Uzbek */
const EXACT: Record<string, string> = {
  // Auth / guards
  'Missing access token.': 'Kirish tokeni yo‘q. Qayta kiring.',
  'Invalid access token.': 'Kirish tokeni yaroqsiz. Qayta kiring.',
  'Invalid refresh session.': 'Sessiya yaroqsiz. Qayta kiring.',
  'Invalid email or password.': 'Email yoki parol noto‘g‘ri.',
  'Factory access is not allowed.': 'Bu fabrikaga ruxsatingiz yo‘q.',
  'Insufficient permissions.': 'Bu amal uchun ruxsatingiz yo‘q.',
  'Request context is required for permission checks.':
    'So‘rov konteksti topilmadi. Qayta kiring.',
  'Active factory is required.': 'Faol fabrika tanlanishi shart.',
  'Active factory is required for this endpoint.':
    'Bu amal uchun faol fabrika tanlanishi shart.',
  'Active factory is required for production stages.':
    'Ishlab chiqarish bosqichlari uchun faol fabrika kerak.',

  // Generic entity
  'Employee not found.': 'Xodim topilmadi.',
  'Active employee not found.': 'Faol xodim topilmadi.',
  'Product not found.': 'Mahsulot topilmadi.',
  'Product variant not found.': 'Mahsulot varianti topilmadi.',
  'Active product variant not found.': 'Faol mahsulot varianti topilmadi.',
  'Product variant reference not found.': 'Mahsulot varianti havolasi topilmadi.',
  'Production stage not found.': 'Ishlab chiqarish bosqichi topilmadi.',
  'Salary rate not found.': 'Stavka topilmadi.',
  'Client not found.': 'Mijoz topilmadi.',
  'Active client not found.': 'Faol mijoz topilmadi.',
  'Sales order not found.': 'Buyurtma topilmadi.',
  'Client payment not found.': 'Mijoz to‘lovi topilmadi.',
  'Material not found.': 'Material topilmadi.',
  'Warehouse zone not found.': 'Ombor zonasi topilmadi.',
  'Warehouse not found.': 'Ombor topilmadi.',
  'Expense not found.': 'Xarajat topilmadi.',
  'Expense category not found.': 'Xarajat kategoriyasi topilmadi.',
  'Advance not found.': 'Avans topilmadi.',
  'Payroll period not found.': 'Ish haqi davri topilmadi.',
  'Payroll item not found.': 'Ish haqi yozuvi topilmadi.',
  'User not found.': 'Foydalanuvchi topilmadi.',
  'Tenant not found.': 'Korxona topilmadi.',
  'Supplier not found.': 'Yetkazib beruvchi topilmadi.',
  'Purchase not found.': 'Xarid topilmadi.',

  // Business conflicts
  'Source stage does not have enough quantity.':
    'Manba bosqichda yetarli miqdor yo‘q.',
  'Ombor stage does not have enough quantity.':
    'Ombor bosqichida yetarli miqdor yo‘q.',
  'Only fully paid orders can be delivered in v1.':
    'Faqat to‘liq to‘langan buyurtmalarni yetkazish mumkin.',
  'Finished Products warehouse zone not found.':
    '«Tayyor mahsulot» ombor zonasi topilmadi.',
  'Sales order has no items to return.':
    'Buyurtmada qaytarish uchun mahsulot yo‘q.',
  'Order has allocated client payments. Reverse those payments before cancelling the order.':
    'Buyurtmaga bog‘langan mijoz to‘lovlari bor. Avval to‘lovlarni bekor qiling, keyin buyurtmani bekor qiling.',
  'Allocatable order not found for this client and factory.':
    'Bu mijoz va fabrika uchun taqsimlash mumkin bo‘lgan buyurtma topilmadi.',
  'Delivery cost must be positive.':
    'Yetkazish logistika summasi musbat bo‘lishi kerak.',
  'Cannot reduce order total below already allocated payments. Reverse payments first or keep a higher total.':
    'Buyurtma summasini allaqachon taqsimlangan to‘lovlardan pastga tushirib bo‘lmaydi. Avval to‘lovni bekor qiling yoki summani saqlang.',
  'Order with status DELIVERED cannot be edited. Only pre-delivery orders can be changed.':
    'Yetkazilgan buyurtmani tahrirlab bo‘lmaydi. Faqat yo‘lga chiqmagan buyurtmalar o‘zgartiriladi.',
  'Order with status CLOSED cannot be edited. Only pre-delivery orders can be changed.':
    'Yopilgan buyurtmani tahrirlab bo‘lmaydi.',
  'Order with status CANCELLED cannot be edited. Only pre-delivery orders can be changed.':
    'Bekor qilingan buyurtmani tahrirlab bo‘lmaydi.',
  'Order with status DELIVERED cannot be cancelled. Return delivery first if already delivered.':
    'Yetkazilgan buyurtmani bekor qilib bo‘lmaydi. Avval yetkazuvni qaytaring.',
  'Order with status CLOSED cannot be cancelled. Return delivery first if already delivered.':
    'Yopilgan buyurtmani bekor qilib bo‘lmaydi.',
  'Order with status CANCELLED cannot be cancelled. Return delivery first if already delivered.':
    'Buyurtma allaqachon bekor qilingan.',
  'Duplicate order allocation is not allowed.':
    'Bir xil buyurtmaga ikki marta bog‘lash mumkin emas.',
  'Client payment is already reversed.': 'Bu to‘lov allaqachon bekor qilingan.',
  'Payroll period already exists for this month.':
    'Bu oy uchun ish haqi davri allaqachon mavjud.',
  'Payroll period is already closed.': 'Ish haqi davri allaqachon yopilgan.',
  'Payment exceeds payroll item remaining amount.':
    'To‘lov qolgan ish haqidan oshib ketdi.',
  'Active master-data name, code, or sort order already exists.':
    'Bunday nom, kod yoki tartib raqami allaqachon mavjud.',
  'Product price amount must be positive.':
    'Mahsulot narxi musbat bo‘lishi kerak.',
  'Amount must be positive.': 'Summa musbat bo‘lishi kerak.',
  'Name is required.': 'Ism kiritilishi shart.',
  'Reason is required.': 'Sabab kiritilishi shart.',
  'Reversal reason is required.': 'Bekor qilish sababi kiritilishi shart.',
  'Password is required.': 'Parol kiritilishi shart.',
  'Current password is required.': 'Joriy parol kiritilishi shart.',
  'Current password is invalid.': 'Joriy parol noto‘g‘ri.',
  'Quantity must be a positive decimal.': 'Miqdor musbat son bo‘lishi kerak.',
  'Quantity must be a non-negative decimal.':
    'Miqdor manfiy bo‘lmasligi kerak.',
  'Threshold quantity must be zero or positive.':
    'Minimal qoldiq 0 yoki undan katta bo‘lishi kerak.',
  'At least one factory is required.': 'Kamida bitta fabrika tanlanishi shart.',
  'Factory access contains invalid factory.':
    'Filial ruxsatida yaroqsiz fabrika bor.',
  'Factory does not belong to tenant.': 'Fabrika bu korxonaga tegishli emas.',
  'Role is not allowed.': 'Bu rol ruxsat etilmagan.',
  'Role is not configured.': 'Rol sozlanmagan.',
  'User with this email already exists.':
    'Bu email bilan foydalanuvchi allaqachon mavjud.',
  'Default factory is not configured.': 'Asosiy fabrika sozlanmagan.',
  'Organization settings are not allowed.':
    'Tashkilot sozlamalari uchun ruxsat yo‘q.',
  'Only owner can manage organization settings.':
    'Tashkilot sozlamalarini faqat egasi boshqaradi.',
  'User is outside your organization access.':
    'Foydalanuvchi sizning tashkilotingizdan tashqarida.',
  'Month must be in YYYY-MM or YYYY-MM-DD format.':
    'Oy formati YYYY-MM yoki YYYY-MM-DD bo‘lishi kerak.',
  'Month value is invalid.': 'Oy qiymati noto‘g‘ri.',
  'Allocatable order not found.': 'Bog‘lash mumkin bo‘lgan buyurtma topilmadi.',
  'Active salary rate is required before worker activity can be recorded.':
    'Ishchi faolligini yozishdan oldin faol ishbay stavka kerak.',

  // Platform
  'Invalid platform refresh session.': 'Platforma sessiyasi yaroqsiz.',
  'Invalid platform access token.': 'Platforma tokeni yaroqsiz.',
  'Platform admin is not active.': 'Platforma administratori nofaol.',
  'Invalid bot API key.': 'Bot API kaliti noto‘g‘ri.',
  'Factory TV access token is required.': 'TV ekran tokeni talab qilinadi.',

  // Telegram (operator-facing when used from web)
  'Telegram account is blocked.': 'Telegram hisobi bloklangan.',
  'Invalid or expired Telegram link code.':
    'Telegram bog‘lash kodi noto‘g‘ri yoki muddati o‘tgan.',
  'Employee is not active.': 'Xodim nofaol.',
  'Client is not active.': 'Mijoz nofaol.',
  'Telegram account not found.': 'Telegram hisobi topilmadi.',
  'Telegram account is already blocked.':
    'Telegram hisobi allaqachon bloklangan.',
  'Active Telegram account not found.': 'Faol Telegram hisobi topilmadi.',
  'Could not generate a unique Telegram link code.':
    'Yagona Telegram bog‘lash kodi yaratib bo‘lmadi.',

  // Validation pipe meta
  'property should not exist': 'Keraksiz maydon yuborilgan.',
  'Forbidden resource': 'Bu amal uchun ruxsatingiz yo‘q.',
  Unauthorized: 'Kirish talab qilinadi.',
  'Bad Request': 'Noto‘g‘ri so‘rov.',
  'Not Found': 'Topilmadi.',
  Conflict: 'Ziddiyat yuz berdi.',
  'Internal Server Error': 'Server xatosi.',
};

/** Field names in validation errors → operator labels */
const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Parol',
  name: 'Ism',
  quantity: 'Miqdor',
  amount: 'Summa',
  reason: 'Sabab',
  note: 'Izoh',
  employeeId: 'Ishchi',
  employeeIds: 'Ishchilar',
  workerShares: 'Ishchi miqdorlari',
  productVariantId: 'Mahsulot',
  sourceStageId: 'Boshlang‘ich bosqich',
  destinationStageId: 'Yakuniy bosqich',
  stageId: 'Bosqich',
  productionStageId: 'Bosqich',
  warehouseZoneId: 'Ombor zonasi',
  warehouseId: 'Ombor',
  materialId: 'Material',
  clientId: 'Mijoz',
  categoryId: 'Kategoriya',
  month: 'Oy',
  phone: 'Telefon',
  code: 'Kod',
  status: 'Holat',
  factoryId: 'Fabrika',
  factoryIds: 'Fabrikalar',
  role: 'Rol',
  roles: 'Rollar',
};

const VALIDATION_PHRASE_MAP: Array<[RegExp, string]> = [
  [/should not be empty/i, 'bo‘sh bo‘lmasligi kerak'],
  [/must be a string/i, 'matn bo‘lishi kerak'],
  [/must be a number/i, 'son bo‘lishi kerak'],
  [/must be an integer number/i, 'butun son bo‘lishi kerak'],
  [/must be an integer/i, 'butun son bo‘lishi kerak'],
  [/must be a positive number/i, 'musbat son bo‘lishi kerak'],
  [/must not be less than (\d+)/i, 'kamida $1 bo‘lishi kerak'],
  [/must not be greater than (\d+)/i, 'ko‘pi bilan $1 bo‘lishi kerak'],
  [
    /must be longer than or equal to (\d+)\s*characters?/i,
    'kamida $1 belgi bo‘lishi kerak',
  ],
  [
    /must be shorter than or equal to (\d+)\s*characters?/i,
    'ko‘pi bilan $1 belgi bo‘lishi kerak',
  ],
  [/must be longer than or equal to (\d+)/i, 'kamida $1 belgi bo‘lishi kerak'],
  [/must be shorter than or equal to (\d+)/i, 'ko‘pi bilan $1 belgi bo‘lishi kerak'],
  [/must be an email/i, 'to‘g‘ri email bo‘lishi kerak'],
  [/must be a uuid/i, 'yaroqli identifikator bo‘lishi kerak'],
  [/must be a valid enum value/i, 'ruxsat etilgan qiymatlardan biri bo‘lishi kerak'],
  [/must be a boolean value/i, 'ha/yo‘q qiymati bo‘lishi kerak'],
  [/must be an array/i, 'ro‘yxat bo‘lishi kerak'],
  [/must contain at least (\d+) elements?/i, 'kamida $1 ta element bo‘lishi kerak'],
  [
    /must contain not more than (\d+) elements?/i,
    'ko‘pi bilan $1 ta element bo‘lishi kerak',
  ],
  [/each value in nested property \S+ must be a string/i, 'har bir qiymat matn bo‘lishi kerak'],
  [/each value in \S+ must be a string/i, 'har bir qiymat matn bo‘lishi kerak'],
  [/nested property \S+ must be either object or array/i, 'ichki maydon formati noto‘g‘ri'],
  [/property (.+) should not exist/i, 'keraksiz maydon yuborilgan'],
  [/must match .* regular expression/i, 'format noto‘g‘ri'],
  [/must be a Date instance/i, 'sana bo‘lishi kerak'],
  [/is not valid/i, 'yaroqsiz'],
];

const PHRASE_FALLBACKS: Array<[RegExp, string]> = [
  [/\bnot found\b/i, 'topilmadi'],
  [/\balready exists\b/i, 'allaqachon mavjud'],
  [/\bis required\b/i, 'talab qilinadi'],
  [/\bmust be positive\b/i, 'musbat bo‘lishi kerak'],
  [/\binsufficient permissions\b/i, 'ruxsat yetarli emas'],
  [/\binvalid\b/i, 'noto‘g‘ri'],
  [/\bunauthorized\b/i, 'ruxsatsiz'],
  [/\bforbidden\b/i, 'taqiqlangan'],
  [/\bconflict\b/i, 'ziddiyat'],
];

function looksLikeEnglish(text: string): boolean {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const cyrillicOrUz = (text.match(/[А-Яа-яЁё‘’ʻʼo‘g‘]/g) ?? []).length;
  // Heuristic: mostly Latin letters and common English words
  if (latin < 4) return false;
  if (cyrillicOrUz > latin / 3) return false;
  return /\b(the|is|are|not|found|required|invalid|must|already|access|token|password|employee|product|stage|order|payment)\b/i.test(
    text,
  ) || /^[A-Za-z0-9][A-Za-z0-9 .,'"_:;!?\-/()]+$/.test(text);
}

function labelField(property: string): string {
  if (FIELD_LABELS[property]) return FIELD_LABELS[property];
  // nested path: workerShares.0.quantity
  const leaf = property.split('.').pop() ?? property;
  if (FIELD_LABELS[leaf]) return FIELD_LABELS[leaf];
  return property;
}

export function translateValidationConstraint(
  property: string,
  constraintMessage: string,
): string {
  const field = labelField(property);
  let raw = constraintMessage.trim();

  // Strip class-validator property prefix: "quantity must be..."
  raw = raw.replace(new RegExp(`^${property}\\s+`, 'i'), '').trim();
  raw = raw.replace(/^each value in nested property \S+\s+/i, '').trim();
  raw = raw.replace(/^each value in \S+\s+/i, '').trim();
  raw = raw.replace(/^nested property \S+\s+/i, '').trim();

  // Already operator Uzbek (custom DTO messages) — keep as-is
  if (!looksLikeEnglish(raw)) {
    return raw;
  }

  for (const [pattern, replacement] of VALIDATION_PHRASE_MAP) {
    if (pattern.test(raw)) {
      const phrase = raw.replace(pattern, replacement).replace(/\s+/g, ' ').trim();
      // Drop leftover English tokens if any
      const cleaned = phrase
        .replace(/\bcharacters?\b/gi, '')
        .replace(/\belements?\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `${field}: ${cleaned}`;
    }
  }

  return `${field}: qiymat noto‘g‘ri`;
}

export function translateOperatorMessage(
  message: string,
  statusCode?: number,
): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return statusCode
      ? STATUS_DEFAULTS[statusCode] ?? STATUS_DEFAULTS[500]
      : STATUS_DEFAULTS[400];
  }

  if (EXACT[trimmed]) {
    return EXACT[trimmed];
  }

  // Nested "Color not found." style from product catalog helper
  const entityNotFound = trimmed.match(/^([A-Za-z ]+) not found\.?$/i);
  if (entityNotFound) {
    const entity = entityNotFound[1].trim();
    const entityMap: Record<string, string> = {
      Color: 'Rang',
      Material: 'Material',
      Season: 'Mavsum',
      Product: 'Mahsulot',
      Stage: 'Bosqich',
      'Production stage': 'Ishlab chiqarish bosqichi',
      Employee: 'Xodim',
      Client: 'Mijoz',
      User: 'Foydalanuvchi',
      Supplier: 'Yetkazib beruvchi',
      Order: 'Buyurtma',
      Payment: 'To‘lov',
      Warehouse: 'Ombor',
      Zone: 'Zona',
    };
    const label = entityMap[entity] ?? entity;
    return `${label} topilmadi.`;
  }

  // class-validator default: "quantity must be a positive number"
  const validationLike = trimmed.match(/^([a-zA-Z0-9_.]+)\s+(.+)$/);
  if (validationLike && looksLikeEnglish(trimmed)) {
    return translateValidationConstraint(validationLike[1], validationLike[2]);
  }

  // Dynamic rate-limit messages
  const loginRate = trimmed.match(
    /^Too many login attempts\. Try again in (\d+) seconds\.?$/i,
  );
  if (loginRate) {
    return `Juda ko‘p login urinishi. ${loginRate[1]} soniyadan keyin qayta urinib ko‘ring.`;
  }
  const refreshRate = trimmed.match(
    /^Too many refresh attempts\. Try again in (\d+) seconds\.?$/i,
  );
  if (refreshRate) {
    return `Juda ko‘p sessiya yangilash. ${refreshRate[1]} soniyadan keyin qayta urinib ko‘ring.`;
  }

  if (!looksLikeEnglish(trimmed)) {
    return trimmed;
  }

  let translated = trimmed;
  for (const [pattern, replacement] of PHRASE_FALLBACKS) {
    translated = translated.replace(pattern, replacement);
  }

  // If still looks fully English technical, use status default
  if (looksLikeEnglish(translated)) {
    return statusCode
      ? STATUS_DEFAULTS[statusCode] ??
          'Amal bajarilmadi. Ma’lumotlarni tekshirib qayta urinib ko‘ring.'
      : 'Amal bajarilmadi. Ma’lumotlarni tekshirib qayta urinib ko‘ring.';
  }

  return translated;
}

export function translateOperatorMessages(
  messages: string | string[],
  statusCode?: number,
): string {
  if (Array.isArray(messages)) {
    const parts = messages
      .map((item) => translateOperatorMessage(String(item), statusCode))
      .filter(Boolean);
    // Unique preserve order
    const unique = Array.from(new Set(parts));
    return unique.join(' · ') || STATUS_DEFAULTS[statusCode ?? 400];
  }

  return translateOperatorMessage(messages, statusCode);
}

export function defaultMessageForStatus(statusCode: number): string {
  return (
    STATUS_DEFAULTS[statusCode] ??
    'Amal bajarilmadi. Keyinroq urinib ko‘ring yoki administratorga murojaat qiling.'
  );
}
