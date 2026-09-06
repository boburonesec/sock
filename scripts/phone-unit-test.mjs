import assert from "node:assert/strict";
import {
  extractDigits,
  formatNationalDigits,
  formatUzPhone,
  formatUzPhoneInput,
  isValidUzPhone,
  normalizeUzPhone,
} from "../apps/web/src/lib/phone.ts";

console.log("Running Uzbekistan Phone Utilities Unit Tests...");

// 1. extractDigits
assert.equal(extractDigits("+998 (90) 123-45-67"), "998901234567");
assert.equal(extractDigits(""), "");
assert.equal(extractDigits(null), "");
assert.equal(extractDigits("abc"), "");

// 2. normalizeUzPhone
assert.equal(normalizeUzPhone("+998 90 123 45 67"), "+998901234567");
assert.equal(normalizeUzPhone("+998901234567"), "+998901234567");
assert.equal(normalizeUzPhone("901234567"), "+998901234567");
assert.equal(normalizeUzPhone("8 90 123 45 67"), "+998901234567");
assert.equal(normalizeUzPhone(""), null);
assert.equal(normalizeUzPhone(null), null);
assert.equal(normalizeUzPhone("   "), null);
assert.equal(normalizeUzPhone("+998"), null);
assert.equal(normalizeUzPhone("+"), null);

// 3. isValidUzPhone
assert.equal(isValidUzPhone("+998 90 123 45 67"), true);
assert.equal(isValidUzPhone("+998901234567"), true);
assert.equal(isValidUzPhone("901234567"), true);
assert.equal(isValidUzPhone("+998 90 123"), false); // incomplete
assert.equal(isValidUzPhone("+998"), false); // incomplete
assert.equal(isValidUzPhone(""), false); // empty
assert.equal(isValidUzPhone(null), false);
assert.equal(isValidUzPhone("+998 abc 123"), false);
assert.equal(isValidUzPhone("+99890123456789"), false); // too long

// 4. formatUzPhone
assert.equal(formatUzPhone("+998901234567"), "+998 90 123 45 67");
assert.equal(formatUzPhone("901234567"), "+998 90 123 45 67");
assert.equal(formatUzPhone("+998 90 123 45 67"), "+998 90 123 45 67");
assert.equal(formatUzPhone(""), "");
assert.equal(formatUzPhone(null), "");

// 5. formatUzPhoneInput (interactive typing)
assert.equal(formatUzPhoneInput(""), "");
assert.equal(formatUzPhoneInput("+"), "");
assert.equal(formatUzPhoneInput("+998"), "+998 ");
assert.equal(formatUzPhoneInput("9"), "+998 9");
assert.equal(formatUzPhoneInput("90"), "+998 90");
assert.equal(formatUzPhoneInput("90123"), "+998 90 123");
assert.equal(formatUzPhoneInput("9012345"), "+998 90 123 45");
assert.equal(formatUzPhoneInput("901234567"), "+998 90 123 45 67");
assert.equal(formatUzPhoneInput("+998 90 123 45 67"), "+998 90 123 45 67");
// Paste with extra spaces or dashes
assert.equal(formatUzPhoneInput("+998 (90) 123-45-67"), "+998 90 123 45 67");
assert.equal(formatUzPhoneInput("8 90 123 45 67"), "+998 90 123 45 67");

console.log("ALL PHONE UNIT TESTS PASSED!");
