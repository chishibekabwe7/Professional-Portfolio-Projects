import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  await prisma.trackerDevice.upsert({
    where: { imei: "9170129590" },
    update: {
      label: "ST-901AL — Vehicle 1",
      ownerId: "system"
    },
    create: {
      imei: "9170129590",
      label: "ST-901AL — Vehicle 1",
      ownerId: "system"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
