import { readFileSync } from "node:fs";
import path from "node:path";
import {
  extractDigits,
  normalizeUzPhone,
  isValidUzPhone,
  formatUzPhone,
  formatNationalDigits,
  formatUzPhoneInput,
} from "../apps/web/src/lib/phone.ts";

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log("\n--- [TEST SUITE 1] UZBEKISTAN PHONE NUMBER LOGIC ---");

// Test 1: Canonical Normalization
assert(
  normalizeUzPhone("+998 90 123 45 67") === "+998901234567",
  "normalizeUzPhone formatted string -> +998901234567",
);
assert(
  normalizeUzPhone("+998901234567") === "+998901234567",
  "normalizeUzPhone canonical string -> +998901234567",
);
assert(
  normalizeUzPhone("901234567") === "+998901234567",
  "normalizeUzPhone 9 national digits -> +998901234567",
);
assert(
  normalizeUzPhone("8901234567") === "+998901234567",
  "normalizeUzPhone legacy 8901234567 -> +998901234567",
);
assert(
  normalizeUzPhone("+998") === null,
  "normalizeUzPhone prefix only '+998' -> null (cleared/empty)",
);
assert(
  normalizeUzPhone("+998 ") === null,
  "normalizeUzPhone prefix with space '+998 ' -> null",
);
assert(
  normalizeUzPhone("") === null,
  "normalizeUzPhone empty string -> null",
);
assert(
  normalizeUzPhone(null) === null,
  "normalizeUzPhone null -> null",
);
assert(
  normalizeUzPhone(undefined) === null,
  "normalizeUzPhone undefined -> null",
);
assert(
  normalizeUzPhone("   ") === null,
  "normalizeUzPhone whitespace -> null",
);
assert(
  normalizeUzPhone("+998 90 abc 45 67") === null,
  "normalizeUzPhone with letters -> null",
);
assert(
  normalizeUzPhone("+998 90 123 45") === null,
  "normalizeUzPhone incomplete (7 digits) -> null",
);
assert(
  normalizeUzPhone("+998 90 123 45 67 89") === null,
  "normalizeUzPhone overlong (>9 digits) -> null",
);

// Test 2: Validation
assert(
  isValidUzPhone("+998 90 123 45 67") === true,
  "isValidUzPhone formatted phone is valid",
);
assert(
  isValidUzPhone("+998901234567") === true,
  "isValidUzPhone canonical phone is valid",
);
assert(
  isValidUzPhone("901234567") === true,
  "isValidUzPhone 9 digits is valid",
);
assert(
  isValidUzPhone("+998") === false,
  "isValidUzPhone '+998' prefix alone is NOT valid",
);
assert(
  isValidUzPhone("") === false,
  "isValidUzPhone empty is NOT valid",
);
assert(
  isValidUzPhone("12345") === false,
  "isValidUzPhone short number is NOT valid",
);

// Test 3: Display formatting
assert(
  formatUzPhone("+998901234567") === "+998 90 123 45 67",
  "formatUzPhone converts canonical to spaced display",
);
assert(
  formatUzPhone("901234567") === "+998 90 123 45 67",
  "formatUzPhone converts 9 digits to spaced display",
);
assert(
  formatUzPhone("") === "",
  "formatUzPhone empty returns empty",
);
assert(
  formatUzPhone(null) === "",
  "formatUzPhone null returns empty",
);

// Test 4: Real-time typing & paste formatting
assert(
  formatUzPhoneInput("9") === "+998 9",
  "formatUzPhoneInput single digit -> +998 9",
);
assert(
  formatUzPhoneInput("90") === "+998 90",
  "formatUzPhoneInput 2 digits -> +998 90",
);
assert(
  formatUzPhoneInput("901") === "+998 90 1",
  "formatUzPhoneInput 3 digits -> +998 90 1",
);
assert(
  formatUzPhoneInput("90123") === "+998 90 123",
  "formatUzPhoneInput 5 digits -> +998 90 123",
);
assert(
  formatUzPhoneInput("901234567") === "+998 90 123 45 67",
  "formatUzPhoneInput 9 digits -> full formatted number",
);
assert(
  formatUzPhoneInput("9012345679999") === "+998 90 123 45 67",
  "formatUzPhoneInput extra digits capped at 9 digits",
);
assert(
  formatUzPhoneInput("+998") === "+998 ",
  "formatUzPhoneInput only prefix returns '+998 '",
);
assert(
  formatUzPhoneInput("+") === "",
  "formatUzPhoneInput '+' returns ''",
);
assert(
  formatUzPhoneInput("") === "",
  "formatUzPhoneInput '' returns ''",
);

console.log("\n--- [TEST SUITE 2] TERMINOLOGY AUDIT ---");
const tenantListPage = readFileSync(
  path.join(process.cwd(), "apps/web/src/app/admin/tenants/page.tsx"),
  "utf8",
);
assert(
  tenantListPage.includes("Mustaqil korxona"),
  "admin/tenants/page.tsx displays 'Mustaqil korxona'",
);
assert(
  !tenantListPage.includes("Oddiy korxona"),
  "admin/tenants/page.tsx has no 'Oddiy korxona'",
);

const tenantDetailPage = readFileSync(
  path.join(process.cwd(), "apps/web/src/app/admin/tenants/[id]/page.tsx"),
  "utf8",
);
assert(
  tenantDetailPage.includes("Mustaqil korxona"),
  "admin/tenants/[id]/page.tsx displays 'Mustaqil korxona'",
);
assert(
  !tenantDetailPage.includes("Oddiy korxona"),
  "admin/tenants/[id]/page.tsx has no 'Oddiy korxona'",
);

console.log("\n--- [TEST SUITE 3] DEVELOPER JARGON CLEANUP ---");
const ordersModule = readFileSync(
  path.join(process.cwd(), "apps/web/src/features/sales/orders/orders-module.tsx"),
  "utf8",
);
assert(
  !ordersModule.includes("Stock qaytdi"),
  "orders-module.tsx has no 'Stock qaytdi'",
);
assert(
  !ordersModule.includes("Delivery return"),
  "orders-module.tsx has no 'Delivery return'",
);
assert(
  ordersModule.includes("Mahsulot omborga qaytdi"),
  "orders-module.tsx has 'Mahsulot omborga qaytdi'",
);
assert(
  ordersModule.includes("Yetkazuvni qaytarishda xatolik yuz berdi"),
  "orders-module.tsx has 'Yetkazuvni qaytarishda xatolik yuz berdi'",
);

const paymentsModule = readFileSync(
  path.join(process.cwd(), "apps/web/src/features/sales/payments/payments-module.tsx"),
  "utf8",
);
assert(
  !paymentsModule.includes("reversal"),
  "payments-module.tsx has no 'reversal'",
);
assert(
  paymentsModule.includes("To‘lov bekor qilindi"),
  "payments-module.tsx has 'To‘lov bekor qilindi'",
);

const reverseDialog = readFileSync(
  path.join(
    process.cwd(),
    "apps/web/src/features/sales/payments/components/payment-reverse-dialog.tsx",
  ),
  "utf8",
);
assert(
  !reverseDialog.includes("reversal"),
  "payment-reverse-dialog.tsx has no 'reversal'",
);
assert(
  !reverseDialog.includes("allocation"),
  "payment-reverse-dialog.tsx has no 'allocation'",
);
assert(
  reverseDialog.includes("taqsimlangan"),
  "payment-reverse-dialog.tsx has 'taqsimlangan'",
);

console.log("\n--- [TEST SUITE 4] FORM LIFECYCLE & STALE STATE CONTRACTS ---");
const masterData = readFileSync(
  path.join(
    process.cwd(),
    "apps/web/src/features/settings/master-data/master-data-pages.tsx",
  ),
  "utf8",
);
assert(
  masterData.includes("[mode, open, record, reset, variant]"),
  "MasterDataFormDrawer resets cleanly when open changes",
);

const productCatalog = readFileSync(
  path.join(
    process.cwd(),
    "apps/web/src/features/settings/product-catalog/product-catalog-page.tsx",
  ),
  "utf8",
);
assert(
  productCatalog.includes("[formState, open, reset]"),
  "ProductFormDrawer and VariantFormDrawer reset cleanly when open changes",
);

const clientForm = readFileSync(
  path.join(
    process.cwd(),
    "apps/web/src/features/sales/clients/components/client-form-drawer.tsx",
  ),
  "utf8",
);
assert(
  clientForm.includes("if (!open) return;"),
  "ClientFormDrawer guards reset against !open to preserve failed submit input",
);
assert(
  clientForm.includes("PhoneInput"),
  "ClientFormDrawer uses PhoneInput",
);
assert(
  clientForm.includes("normalizeUzPhone(values.phone)"),
  "ClientFormDrawer normalizes phone to canonical format",
);

const supplierForm = readFileSync(
  path.join(
    process.cwd(),
    "apps/web/src/features/finance/suppliers/components/supplier-form-drawer.tsx",
  ),
  "utf8",
);
assert(
  supplierForm.includes("if (!open) return;"),
  "SupplierFormDrawer guards reset against !open to preserve failed submit input",
);
assert(
  supplierForm.includes("PhoneInput"),
  "SupplierFormDrawer uses PhoneInput",
);
assert(
  supplierForm.includes("normalizeUzPhone(values.phone)"),
  "SupplierFormDrawer normalizes phone to canonical format",
);

console.log("\n=================================");
console.log(`TOTAL PASS: ${passCount}`);
console.log(`TOTAL FAIL: ${failCount}`);
console.log("=================================\n");

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("ALL FORM UX LIFECYCLE & VALIDATION TESTS PASSED!\n");
  process.exit(0);
}
