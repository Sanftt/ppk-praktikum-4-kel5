import { prisma } from "./prisma";

// Action getUsers
export async function getUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            list_access: true,
            createdAt: true
        }
    });

    return users;
}import bcrypt from "bcrypt";
import { prisma } from "./prisma";

// Action addUser
export async function addUser(data: {
    username: string;
    password: string;
    list_access?: string;
}) {

    // hash password
    const hashedPassword = await bcrypt.hash(
        data.password,
        10
    );

    const user = await prisma.user.create({
        data: {
            username: data.username,
            password: hashedPassword,
            list_access: data.list_access
        }
    });

    return user;
}