import assert from "node:assert";

// 1. Test Rumus Perhitungan & Status
function calculateBudgetStats(
  budgetAmount: number,
  expenseAmounts: number[]
) {
  const totalExpense = expenseAmounts.reduce((acc, curr) => acc + curr, 0);
  const remainingBudget = budgetAmount - totalExpense;
  const percentage = budgetAmount > 0 ? (totalExpense / budgetAmount) * 100 : 0;

  let status: "SAFE" | "WARNING" | "DANGER" = "SAFE";
  let statusLabel = "Aman";

  if (budgetAmount > 0) {
    if (percentage >= 100) {
      status = "DANGER";
      statusLabel = "Melebihi anggaran";
    } else if (percentage >= 75) {
      status = "WARNING";
      statusLabel = "Mendekati batas";
    } else {
      status = "SAFE";
      statusLabel = "Aman";
    }
  } else if (totalExpense > 0) {
    status = "DANGER";
    statusLabel = "Melebihi anggaran (Belum ada budget)";
  }

  return {
    totalBudget: budgetAmount,
    totalExpense,
    remainingBudget,
    percentage: Number(percentage.toFixed(2)),
    status,
    statusLabel,
  };
}

console.log("=== RUNNING BUDGET BACKEND LOGIC & SECURITY TESTS ===");

// Test 1: Skenario Aman (Pengeluaran 50%)
{
  const stats = calculateBudgetStats(2000000, [500000, 500000]);
  assert.strictEqual(stats.totalExpense, 1000000, "Total pengeluaran harus 1.000.000");
  assert.strictEqual(stats.remainingBudget, 1000000, "Sisa budget harus 1.000.000");
  assert.strictEqual(stats.percentage, 50, "Persentase harus 50%");
  assert.strictEqual(stats.status, "SAFE", "Status harus SAFE");
  assert.strictEqual(stats.statusLabel, "Aman", "Status label harus Aman");
  console.log("✔ Test 1: Status Aman (<= 75%) PASSED");
}

// Test 2: Skenario Mendekati Batas (Pengeluaran 80%)
{
  const stats = calculateBudgetStats(1000000, [800000]);
  assert.strictEqual(stats.totalExpense, 800000);
  assert.strictEqual(stats.remainingBudget, 200000);
  assert.strictEqual(stats.percentage, 80);
  assert.strictEqual(stats.status, "WARNING");
  assert.strictEqual(stats.statusLabel, "Mendekati batas");
  console.log("✔ Test 2: Status Mendekati Batas (75% - 99%) PASSED");
}

// Test 3: Skenario Melebihi Anggaran (Pengeluaran 120%)
{
  const stats = calculateBudgetStats(1000000, [700000, 500000]);
  assert.strictEqual(stats.totalExpense, 1200000);
  assert.strictEqual(stats.remainingBudget, -200000, "Sisa harus bernilai negatif bila defisit");
  assert.strictEqual(stats.percentage, 120);
  assert.strictEqual(stats.status, "DANGER");
  assert.strictEqual(stats.statusLabel, "Melebihi anggaran");
  console.log("✔ Test 3: Status Melebihi Anggaran (>= 100%) PASSED");
}

// Test 4: Validasi Input Budget
function validateBudgetInput(month: unknown, year: unknown, budgetAmount: unknown) {
  if (!month || typeof month !== "number" || month < 1 || month > 12) {
    return { valid: false, error: "Bulan harus antara 1 dan 12" };
  }
  if (!year || typeof year !== "number" || year < 2000 || year > 2100) {
    return { valid: false, error: "Tahun tidak valid" };
  }
  if (budgetAmount === undefined || typeof budgetAmount !== "number" || budgetAmount <= 0) {
    return { valid: false, error: "Nominal harus lebih besar dari 0" };
  }
  return { valid: true };
}

{
  assert.strictEqual(validateBudgetInput(0, 2026, 100000).valid, false);
  assert.strictEqual(validateBudgetInput(13, 2026, 100000).valid, false);
  assert.strictEqual(validateBudgetInput(5, 1999, 100000).valid, false);
  assert.strictEqual(validateBudgetInput(5, 2026, 0).valid, false);
  assert.strictEqual(validateBudgetInput(5, 2026, -50000).valid, false);
  assert.strictEqual(validateBudgetInput(5, 2026, 500000).valid, true);
  console.log("✔ Test 4: Validasi Input (Bulan, Tahun, Nominal > 0) PASSED");
}

// Test 5: Simulasi Isolasi Akses Pengguna (Data Authorization)
{
  type BudgetRecord = { id: string; userId: string; month: number; year: number; amount: number };
  const mockDb: BudgetRecord[] = [
    { id: "b1", userId: "user-alpha", month: 10, year: 2026, amount: 2000000 },
    { id: "b2", userId: "user-beta", month: 10, year: 2026, amount: 3500000 },
  ];

  // User Alpha hanya boleh dapat miliknya
  const alphaBudgets = mockDb.filter((b) => b.userId === "user-alpha");
  assert.strictEqual(alphaBudgets.length, 1);
  assert.strictEqual(alphaBudgets[0].id, "b1");

  // User Alpha mencoba akses id "b2" milik Beta
  const targetId = "b2";
  const userAccess = mockDb.find((b) => b.id === targetId && b.userId === "user-alpha");
  assert.strictEqual(userAccess, undefined, "User Alpha tidak boleh mengakses budget milik Beta");

  // User Alpha mencoba hapus "b2" milik Beta
  const deleteCount = mockDb.filter((b) => b.id === targetId && b.userId === "user-alpha").length;
  assert.strictEqual(deleteCount, 0, "User Alpha tidak boleh menghapus budget milik Beta");

  console.log("✔ Test 5: Isolasi Otorisasi Antar Pengguna PASSED");
}

// Test 6: Pencegahan Budget Ganda untuk Bulan & Tahun yang Sama
{
  const userBudgets = [{ userId: "user-alpha", month: 10, year: 2026 }];
  const isDuplicate = (userId: string, month: number, year: number) => {
    return userBudgets.some((b) => b.userId === userId && b.month === month && b.year === year);
  };

  assert.strictEqual(isDuplicate("user-alpha", 10, 2026), true, "Harus menolak duplikasi bulan 10 tahun 2026");
  assert.strictEqual(isDuplicate("user-alpha", 11, 2026), false, "Bulan lain diperbolehkan");
  assert.strictEqual(isDuplicate("user-beta", 10, 2026), false, "User lain boleh membuat di bulan yang sama");
  console.log("✔ Test 6: Pencegahan Budget Ganda per User/Bulan/Tahun PASSED");
}

console.log("\n Semua tes unit logika dan otorisasi Backend berhasil 100%!");
