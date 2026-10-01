import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBudgets, getBudgetByPeriod, createBudget, BudgetError } from "@/lib/budget";

// GET /api/budgets (atau /budgets)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    if (monthParam && yearParam) {
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);

      if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000) {
        return NextResponse.json(
          { success: false, message: "Parameter bulan (1-12) dan tahun tidak valid" },
          { status: 400 }
        );
      }

      const budget = await getBudgetByPeriod(session.userId, month, year);
      return NextResponse.json({ success: true, data: budget });
    }

    const budgets = await getBudgets(session.userId);
    return NextResponse.json({ success: true, data: budgets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data budget";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST /api/budgets
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const month = typeof body.month === "string" ? parseInt(body.month, 10) : body.month;
    const year = typeof body.year === "string" ? parseInt(body.year, 10) : body.year;
    const budgetAmount =
      typeof body.budgetAmount === "string"
        ? parseFloat(body.budgetAmount.replace(/[^0-9.]/g, ""))
        : typeof body.budget_amount === "string"
        ? parseFloat(body.budget_amount.replace(/[^0-9.]/g, ""))
        : body.budgetAmount ?? body.budget_amount;

    if (!month || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, message: "Bulan harus berupa angka antara 1 dan 12" },
        { status: 400 }
      );
    }

    if (!year || isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, message: "Tahun tidak valid" },
        { status: 400 }
      );
    }

    if (budgetAmount === undefined || isNaN(budgetAmount) || budgetAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Nominal anggaran harus lebih besar dari 0" },
        { status: 400 }
      );
    }

    const newBudget = await createBudget({
      userId: session.userId,
      month,
      year,
      budgetAmount,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Budget bulanan berhasil dibuat",
        data: newBudget,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof BudgetError && error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "Budget untuk bulan dan tahun ini sudah ada. Gunakan edit untuk mengubah.",
        },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Gagal membuat budget";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
