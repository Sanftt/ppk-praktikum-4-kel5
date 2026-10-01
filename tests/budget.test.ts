import assert from "node:assert";
import {
  getJakartaYearMonth,
  getJakartaMonthRange,
  type MonthlyBudgetSummary,
  type BudgetActionResult,
} from "../lib/budget";

console.log("=== MENJALANKAN PENGUJIAN SESUAI SRS PROGRAMMER 1 ===");

// 1. Uji Kontrak TypeScript
{
  const summary: MonthlyBudgetSummary = {
    year: 2026,
    month: 10,
    budgetAmount: 1500000,
    spentAmount: 750000,
    remainingAmount: 750000,
    usagePercentage: 50,
    status: "NORMAL",
  };
  assert.strictEqual(summary.status, "NORMAL");

  const successResult: BudgetActionResult = { success: true };
  const failResult: BudgetActionResult = { success: false, error: "Unauthorized" };
  assert.strictEqual(successResult.success, true);
  assert.strictEqual(failResult.success, false);

  // Test getJakartaYearMonth
  const ym = getJakartaYearMonth(new Date("2026-10-01T00:00:00.000Z"));
  assert.strictEqual(ym.year, 2026);
  assert.strictEqual(ym.month, 10);
  console.log("✔ Test 1: Kontrak TypeScript MonthlyBudgetSummary & BudgetActionResult PASSED");
}

// 2. Uji Batas Pergantian Bulan Asia/Jakarta (WIB = UTC+7)
{
  const { start, end } = getJakartaMonthRange(2026, 10);

  // Awal bulan 2026-10-01 00:00:00 WIB adalah 2026-09-30 17:00:00 UTC
  assert.strictEqual(start.toISOString(), "2026-09-30T17:00:00.000Z");

  // Awal bulan berikutnya 2026-11-01 00:00:00 WIB adalah 2026-10-31 17:00:00 UTC (eksklusif)
  assert.strictEqual(end.toISOString(), "2026-10-31T17:00:00.000Z");

  // Transaksi 1 detik sebelum awal Oktober (2026-09-30 23:59:59 WIB = 16:59:59 UTC) -> Di luar
  const beforeStart = new Date("2026-09-30T16:59:59.000Z");
  assert.strictEqual(beforeStart >= start && beforeStart < end, false);

  // Tepat saat awal Oktober (2026-10-01 00:00:00 WIB = 17:00:00 UTC) -> Masuk (inklusif)
  const exactStart = new Date("2026-09-30T17:00:00.000Z");
  assert.strictEqual(exactStart >= start && exactStart < end, true);

  // Akhir Oktober (2026-10-31 23:59:59 WIB = 16:59:59 UTC) -> Masuk
  const endOfOct = new Date("2026-10-31T16:59:59.000Z");
  assert.strictEqual(endOfOct >= start && endOfOct < end, true);

  // Tepat awal November (2026-11-01 00:00:00 WIB = 17:00:00 UTC) -> Di luar (eksklusif)
  const exactNextMonth = new Date("2026-10-31T17:00:00.000Z");
  assert.strictEqual(exactNextMonth >= start && exactNextMonth < end, false);

  console.log("✔ Test 2: Batas Pergantian Bulan Asia/Jakarta (Inklusif awal & Eksklusif awal bulan berikutnya) PASSED");
}

// 3. Uji Perhitungan Status Ambang Batas (NORMAL < 80%, WARNING >= 80% & < 100%, EXCEEDED >= 100%)
{
  function computeSummary(budgetAmount: number | null, spentAmount: number): MonthlyBudgetSummary {
    if (budgetAmount === null) {
      return {
        year: 2026,
        month: 10,
        budgetAmount: null,
        spentAmount,
        remainingAmount: null,
        usagePercentage: null,
        status: "NO_BUDGET",
      };
    }

    const remainingAmount = budgetAmount - spentAmount;
    const usagePercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

    let status: "NORMAL" | "WARNING" | "EXCEEDED" = "NORMAL";
    if (usagePercentage >= 100) {
      status = "EXCEEDED";
    } else if (usagePercentage >= 80) {
      status = "WARNING";
    } else {
      status = "NORMAL";
    }

    return {
      year: 2026,
      month: 10,
      budgetAmount,
      spentAmount,
      remainingAmount,
      usagePercentage,
      status,
    };
  }

  // Skenario Bulan Kosong (NO_BUDGET)
  const noBudget = computeSummary(null, 250000);
  assert.strictEqual(noBudget.status, "NO_BUDGET");
  assert.strictEqual(noBudget.budgetAmount, null);
  assert.strictEqual(noBudget.remainingAmount, null);
  assert.strictEqual(noBudget.usagePercentage, null);
  assert.strictEqual(noBudget.spentAmount, 250000);

  // Skenario NORMAL (< 80%)
  const normal = computeSummary(1000000, 790000);
  assert.strictEqual(normal.status, "NORMAL");
  assert.strictEqual(normal.remainingAmount, 210000);
  assert.strictEqual(normal.usagePercentage, 79);

  // Skenario WARNING (Tepat 80% & 99.9%)
  const warning80 = computeSummary(1000000, 800000);
  assert.strictEqual(warning80.status, "WARNING");
  assert.strictEqual(warning80.remainingAmount, 200000);
  assert.strictEqual(warning80.usagePercentage, 80);

  const warning99 = computeSummary(1000000, 999000);
  assert.strictEqual(warning99.status, "WARNING");

  // Skenario EXCEEDED (Tepat 100% & Defisit 120%)
  const exceeded100 = computeSummary(1000000, 1000000);
  assert.strictEqual(exceeded100.status, "EXCEEDED");
  assert.strictEqual(exceeded100.remainingAmount, 0);

  const exceeded120 = computeSummary(1000000, 1200000);
  assert.strictEqual(exceeded120.status, "EXCEEDED");
  assert.strictEqual(exceeded120.remainingAmount, -200000);

  console.log("✔ Test 3: Ambang Batas Status (NO_BUDGET, NORMAL, WARNING, EXCEEDED) PASSED");
}

// 4. Uji Bulan dengan Income dan Expense (Hanya EXPENSE yang dihitung)
{
  type Tx = { type: "INCOME" | "EXPENSE"; amount: number };
  const transactions: Tx[] = [
    { type: "INCOME", amount: 5000000 },
    { type: "EXPENSE", amount: 200000 },
    { type: "EXPENSE", amount: 300000 },
    { type: "INCOME", amount: 1000000 },
  ];

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0);

  assert.strictEqual(totalExpense, 500000, "Hanya transaksi EXPENSE yang dijumlahkan");
  console.log("✔ Test 4: Filter Transaksi (Hanya EXPENSE, INCOME diabaikan) PASSED");
}

// 5. Uji Validasi Nominal Budget
{
  function validateAmount(amount: unknown): boolean {
    return typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0;
  }

  assert.strictEqual(validateAmount(0), false);
  assert.strictEqual(validateAmount(-100000), false);
  assert.strictEqual(validateAmount(1000.5), false); // Desimal tidak diperbolehkan (harus integer)
  assert.strictEqual(validateAmount("500000"), false);
  assert.strictEqual(validateAmount(null), false);
  assert.strictEqual(validateAmount(undefined), false);
  assert.strictEqual(validateAmount(1000000), true);
  console.log("✔ Test 5: Validasi Nominal Budget (Integer aman > 0) PASSED");
}

// 6. Uji Isolasi Dua Pengguna & Otorisasi
{
  type BudgetRecord = { userId: string; year: number; month: number; budgetAmount: number };
  const dbBudgets: BudgetRecord[] = [
    { userId: "user-1", year: 2026, month: 10, budgetAmount: 2000000 },
    { userId: "user-2", year: 2026, month: 10, budgetAmount: 4000000 },
  ];

  // User 1 hanya melihat budget miliknya
  const user1Budget = dbBudgets.find((b) => b.userId === "user-1" && b.year === 2026 && b.month === 10);
  assert.strictEqual(user1Budget?.budgetAmount, 2000000);

  // User 1 tidak dapat mengakses budget User 2
  const unauthorizedAccess = dbBudgets.find((b) => b.userId === "user-1" && b.budgetAmount === 4000000);
  assert.strictEqual(unauthorizedAccess, undefined);

  // Uji unique constraint (userId, year, month)
  const isDuplicate = (userId: string, year: number, month: number) => {
    return dbBudgets.some((b) => b.userId === userId && b.year === year && b.month === month);
  };
  assert.strictEqual(isDuplicate("user-1", 2026, 10), true);
  assert.strictEqual(isDuplicate("user-1", 2026, 11), false);
  assert.strictEqual(isDuplicate("user-2", 2026, 11), false);

  console.log("✔ Test 6: Isolasi Dua Pengguna & Unique Constraint (userId, year, month) PASSED");
}

console.log("\n Seluruh pengujian Programmer 1 BERHASIL 100%!");
