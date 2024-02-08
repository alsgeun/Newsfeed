import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getUserByEmail(email) {
    return prisma.users.findUnique({ where: { email } });
}

async function createUser({ data }) {
    return prisma.users.create({ data });
}

module.exports = {
    getUserByEmail,
    createUser,
    prisma,
};