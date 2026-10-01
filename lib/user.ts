import bcrypt from "bcrypt"; 
import { prisma } from "./prisma";

export async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
    },
  });
  return users;
}

export async function addUser(data: {
  username: string;
  password: string;
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
    },
  });
  return user;
}
