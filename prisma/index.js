import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // Prisma를 이용해 데이터베이스를 접근할 때, SQL을 출력해줍니다.
  log: ["query", "info", "warn", "error"],

  errorFormat: "pretty",
}); // PrismaClient 인스턴스를 생성합니다.
