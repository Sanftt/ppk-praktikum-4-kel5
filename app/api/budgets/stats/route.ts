import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBudgetStats, getBudgetById } from "@/lib/budget";

// GET /api/budgets/stats?month=X&year=Y atau ?id=Z
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
    const idParam = searchParams.get("id");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    let month: number;
    let year: number;

    if (idParam) {
      const budget = await getBudgetById(idParam, session.userId);
      if (!budget) {
        return NextResponse.json(
          { success: false, message: "Budget tidak ditemukan atau bukan milik Anda" },
          { status: 404 }
        );
      }
      month = budget.month;
      year = budget.year;
    } else {
      const now = new Date();
      month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
      year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

      if (isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json(
          { success: false, message: "Bulan harus berupa angka antara 1 dan 12" },
          { status: 400 }
        );
      }

      if (isNaN(year) || year < 2000 || year > 2100) {
        return NextResponse.json(
          { success: false, message: "Tahun tidak valid" },
          { status: 400 }
        );
      }
    }

    const stats = await getBudgetStats(session.userId, month, year);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghitung statistik budget";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
