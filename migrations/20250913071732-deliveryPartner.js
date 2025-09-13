'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Partners', {
      id: {
        type: Sequelize.UUID,                     // 👉 UUID type
        defaultValue: Sequelize.UUIDV4,           // 👉 auto-generate UUID
        primaryKey: true,                         // 👉 Primary key
        allowNull: false                          // 👉 Cannot be null
      },
      fullName: { type: Sequelize.STRING, allowNull: false },
      mobile: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, unique: true, allowNull: false },
      dob: { type: Sequelize.DATEONLY },
      gender: { type: Sequelize.STRING },
      referralCode: { type: Sequelize.STRING },
      password: { type: Sequelize.STRING, allowNull: false },
      address: { type: Sequelize.STRING },
      city: { type: Sequelize.STRING },
      state: { type: Sequelize.STRING },
      pincode: { type: Sequelize.STRING },
      emergencyName: { type: Sequelize.STRING },
      emergencyMobile: { type: Sequelize.STRING },
      vehicleType: { type: Sequelize.STRING },
      vehicleModel: { type: Sequelize.STRING },
      licensePlate: { type: Sequelize.STRING },
      rcFile: { type: Sequelize.STRING },
      dlFile: { type: Sequelize.STRING },
      workType: { type: Sequelize.ENUM("full-time", "part-time", "weekend") },
      breakStart: { type: Sequelize.TIME },
      breakEnd: { type: Sequelize.TIME },
      bankName: { type: Sequelize.STRING },
      accountNumber: { type: Sequelize.STRING },
      ifsc: { type: Sequelize.STRING },
      idProofFile: { type: Sequelize.STRING },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Partners');
  }
};
