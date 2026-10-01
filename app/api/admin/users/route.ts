import { NextResponse } from "next/server";
import { getUsers, addUser } from "@/lib/user";

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
// POST tambah user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await addUser({
      username: body.username,
      password: body.password,
      list_access: body.list_access,
    });
    return NextResponse.json(
      {
        message: "User berhasil dibuat",
        user,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Gagal membuat user",
      },
      {
        status: 500,
      },
    );
  }
}