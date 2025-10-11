const bcrypt = require('bcrypt');
const { sequelize, Admin } = require('../models');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected!');

    const email = 'secondadmin@gmail.com';
    const plainPassword = 'anotherpass123';

    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      console.log('Admin already exists with this email.');
      return;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const admin = await Admin.create({ email, password: hashedPassword });
    console.log('Admin created successfully with UUID:', admin.id);

    await sequelize.close();
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
}

createAdmin();
