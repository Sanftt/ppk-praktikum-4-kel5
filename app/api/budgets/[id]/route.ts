import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBudgetById, updateBudget, deleteBudget, BudgetError } from "@/lib/budget";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/budgets/[id]
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const budget = await getBudgetById(id, session.userId);

    if (!budget) {
      return NextResponse.json(
        { success: false, message: "Budget tidak ditemukan atau bukan milik Anda" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: budget });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data budget";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT /api/budgets/[id]
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const month =
      body.month !== undefined
        ? typeof body.month === "string"
          ? parseInt(body.month, 10)
          : body.month
        : undefined;

    const year =
      body.year !== undefined
        ? typeof body.year === "string"
          ? parseInt(body.year, 10)
          : body.year
        : undefined;

    const rawAmount = body.budgetAmount ?? body.budget_amount;
    const budgetAmount =
      rawAmount !== undefined
        ? typeof rawAmount === "string"
          ? parseFloat(rawAmount.replace(/[^0-9.]/g, ""))
          : rawAmount
        : undefined;

    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json(
        { success: false, message: "Bulan harus berupa angka antara 1 dan 12" },
        { status: 400 }
      );
    }

    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      return NextResponse.json(
        { success: false, message: "Tahun tidak valid" },
        { status: 400 }
      );
    }

    if (budgetAmount !== undefined && (isNaN(budgetAmount) || budgetAmount <= 0)) {
      return NextResponse.json(
        { success: false, message: "Nominal anggaran harus lebih besar dari 0" },
        { status: 400 }
      );
    }

    const updated = await updateBudget({
      id,
      userId: session.userId,
      budgetAmount,
      month,
      year,
    });

    return NextResponse.json({
      success: true,
      message: "Budget berhasil diperbarui",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof BudgetError) {
      if (error.status === 404) {
        return NextResponse.json({ success: false, message: error.message }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { success: false, message: "Budget untuk bulan dan tahun tersebut sudah ada" },
          { status: 409 }
        );
      }
    }

    const message = error instanceof Error ? error.message : "Gagal memperbarui budget";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    await deleteBudget(id, session.userId);

    return NextResponse.json({
      success: true,
      message: "Budget berhasil dihapus",
    });
  } catch (error: unknown) {
    if (error instanceof BudgetError && error.status === 404) {
      return NextResponse.json({ success: false, message: error.message }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : "Gagal menghapus budget";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
