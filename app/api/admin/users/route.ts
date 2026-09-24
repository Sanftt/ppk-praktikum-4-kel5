import { NextResponse } from "next/server";
import { addUser } from "@/lib/user";

// POST tambah user
export async function POST(
    request: Request
) {
    try {
        const body = await request.json();
        const user = await addUser({
            username: body.username,
            password: body.password,
            list_access: body.list_access
        });

        return NextResponse.json(
            {
                message: "User berhasil dibuat",
                user
            },
            {
                status: 201
            }
        );

    } catch {
        return NextResponse.json(
            {
                message: "Gagal membuat user"
            },
            {
                status: 500
            }
        );
    }
}