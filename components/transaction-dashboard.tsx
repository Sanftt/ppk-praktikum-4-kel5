"use client";

import { useState, useTransition } from "react";
import {
  addTransaction,
  deleteTransaction,
  toggleThemePreference,
} from "@/lib/actions";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: Date | string;
};

export default function TransactionDashboard({
  transactions,
  theme,
}: {
  transactions: Transaction[];
  theme: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [amountInput, setAmountInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">(
    "ALL",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionError, setActionError] = useState("");

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter((transaction) => {
    const descriptionMatches = transaction.description
      .toLocaleLowerCase("id-ID")
      .includes(search.trim().toLocaleLowerCase("id-ID"));
    const typeMatches = typeFilter === "ALL" || transaction.type === typeFilter;
    const transactionDate = new Date(transaction.date);
    const dateKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, "0")}-${String(transactionDate.getDate()).padStart(2, "0")}`;

    return (
      descriptionMatches &&
      typeMatches &&
      (!dateFrom || dateKey >= dateFrom) &&
      (!dateTo || dateKey <= dateTo)
    );
  });

  const isDark = theme === "dark";

  async function handleAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = formData.get("type") as "INCOME" | "EXPENSE";
    const amountStr = formData.get("amount") as string;
    const amount = parseInt(amountStr.replace(/\./g, ""), 10);
    const description = formData.get("description") as string;

    startTransition(async () => {
      try {
        await addTransaction({ type, amount, description });
        (event.target as HTMLFormElement).reset();
        setAmountInput("");
        setActionError("");
      } catch {
        setActionError("Transaksi gagal disimpan. Silakan coba lagi.");
      }
    });
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value) {
      setAmountInput(parseInt(value, 10).toLocaleString("id-ID"));
    } else {
      setAmountInput("");
    }
  };

  async function handleDelete(id: string) {
    if (confirm("Yakin ingin menghapus transaksi ini?")) {
      startTransition(async () => {
        try {
          await deleteTransaction(id);
          setActionError("");
        } catch {
          setActionError("Transaksi gagal dihapus. Silakan coba lagi.");
        }
      });
    }
  }

  return (
    <div
      className={`p-6 rounded-2xl shadow-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-900"} transition-colors`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ringkasan Keuangan</h2>
        <button
          onClick={() => startTransition(() => toggleThemePreference())}
          className={`px-4 py-2 rounded-full text-sm font-medium ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
        >
          {isDark ? "☀️ Mode Terang" : "🌙 Mode Gelap"}
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div
          className={`p-6 rounded-xl border ${isDark ? "bg-gray-900 border-gray-700" : "bg-blue-50 border-blue-100"}`}
        >
          <p
            className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-blue-600 font-medium"}`}
          >
            Saldo Saat Ini
          </p>
          <h3
            className={`text-3xl font-bold ${balance >= 0 ? (isDark ? "text-blue-400" : "text-blue-900") : "text-red-500"}`}
          >
            Rp {balance.toLocaleString("id-ID")}
          </h3>
        </div>
        <div
          className={`p-6 rounded-xl border ${isDark ? "bg-gray-900 border-gray-700" : "bg-emerald-50 border-emerald-100"}`}
        >
          <p
            className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-emerald-600 font-medium"}`}
          >
            Total Pemasukan
          </p>
          <h3
            className={`text-3xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}
          >
            Rp {totalIncome.toLocaleString("id-ID")}
          </h3>
        </div>
        <div
          className={`p-6 rounded-xl border ${isDark ? "bg-gray-900 border-gray-700" : "bg-rose-50 border-rose-100"}`}
        >
          <p
            className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-rose-600 font-medium"}`}
          >
            Total Pengeluaran
          </p>
          <h3
            className={`text-3xl font-bold ${isDark ? "text-rose-400" : "text-rose-700"}`}
          >
            Rp {totalExpense.toLocaleString("id-ID")}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div
          className={`lg:col-span-1 p-6 rounded-xl border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-100"}`}
        >
          <h3 className="text-lg font-bold mb-4">Tambah Transaksi</h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            {actionError && (
              <p role="alert" className="text-sm text-red-600">
                {actionError}
              </p>
            )}
            <div>
              <label className="block text-sm mb-1">Jenis</label>
              <select
                name="type"
                className={`w-full p-2.5 rounded-lg border outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
              >
                <option value="INCOME">Pemasukan</option>
                <option value="EXPENSE">Pengeluaran</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Nominal</label>
              <div
                className={`flex items-center rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
              >
                <span
                  className={`px-3 py-2.5 font-medium border-r ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
                >
                  Rp
                </span>
                <input
                  name="amount"
                  type="text"
                  required
                  value={amountInput}
                  onChange={handleAmountChange}
                  className="w-full py-2.5 px-3 outline-none bg-transparent"
                  placeholder="50.000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Keterangan</label>
              <input
                name="description"
                type="text"
                required
                className={`w-full p-2.5 rounded-lg border outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
                placeholder="Beli makan siang"
              />
            </div>
            <button
              disabled={isPending}
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </form>
        </div>

        {/* Riwayat */}
        <div
          className={`lg:col-span-2 p-6 rounded-xl border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-100"}`}
        >
          <h3 className="text-lg font-bold mb-4">Riwayat Transaksi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <label className="text-sm">
              Cari keterangan
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: makan siang"
                className={`mt-1 w-full p-2.5 rounded-lg border outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
              />
            </label>
            <label className="text-sm">
              Jenis transaksi
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value as "ALL" | "INCOME" | "EXPENSE",
                  )
                }
                className={`mt-1 w-full p-2.5 rounded-lg border outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
              >
                <option value="ALL">Semua jenis</option>
                <option value="INCOME">Pemasukan</option>
                <option value="EXPENSE">Pengeluaran</option>
              </select>
            </label>
            <label className="text-sm">
              Dari tanggal
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className={`mt-1 w-full p-2.5 rounded-lg border outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
              />
            </label>
            <label className="text-sm">
              Sampai tanggal
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className={`mt-1 w-full p-2.5 rounded-lg border outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
              />
            </label>
          </div>
          {transactions.length === 0 ? (
            <div
              className={`text-center py-10 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              Belum ada transaksi.
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div
              className={`text-center py-10 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              Tidak ada transaksi yang cocok dengan filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100 shadow-sm"}`}
                >
                  <div>
                    <p className="font-semibold">{t.description}</p>
                    <p
                      className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {new Date(t.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-bold ${t.type === "INCOME" ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {t.type === "INCOME" ? "+" : "-"} Rp{" "}
                      {t.amount.toLocaleString("id-ID")}
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
