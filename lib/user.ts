import { prisma } from "./prisma";

// Action getUsers
export async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      list_access: true,
      createdAt: true,
    },
  });

  return users;
}
