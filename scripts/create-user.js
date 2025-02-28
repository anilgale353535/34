const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser(username, email, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    console.log('✅ Kullanıcı başarıyla oluşturuldu:', {
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Komut satırı argümanlarını al
const args = process.argv.slice(2);

if (args.length !== 3) {
  console.log('❌ Kullanım: npm run create-user <username> <email> <password>');
  process.exit(1);
}

const [username, email, password] = args;
createUser(username, email, password); 