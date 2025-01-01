import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.worklog.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.project.deleteMany({})

  await prisma.user.createMany({
    data: [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
      },
      {
        id: 3,
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: 'password123',
      },
    ],
  })

  // Create Projects
  await prisma.project.createMany({
    data: [
      {
        id: 1,
        name: 'Project Batu',
        location: 'Batu',
      },
      {
        id: 2,
        name: 'Project Malang',
        location: 'Malang',
      },
      {
        id: 3,
        name: 'Project Surabaya',
        location: 'Surabaya',
      },
    ],
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })