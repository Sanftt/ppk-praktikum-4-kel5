import { NextResponse } from "next/server";
import { getUsers } from "@/lib/user";

// GET semua user
export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      {
        message: "Gagal mengambil data user",
      },
      {
        status: 500,
      },
    );
  }
}
