import { PrismaClient } from "@prisma/client";

// One pool per process. Importing the client does not connect to a database.
export const prisma = new PrismaClient();
