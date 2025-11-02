'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partners', {
      id: {
        type: Sequelize.UUID,                     // UUID type
        defaultValue: Sequelize.UUIDV4,           // Auto-generate UUID
        primaryKey: true,
        allowNull: false
      },
      partnerCode: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },


      // ---------------- Personal Details ----------------
      fullName: { type: Sequelize.STRING, allowNull: false },
      mobile: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, unique: true, allowNull: false },
      dob: { type: Sequelize.DATEONLY },
      gender: { type: Sequelize.STRING },
      referralCode: { type: Sequelize.STRING },
      password: { type: Sequelize.STRING, allowNull: false },

      // ✅ Added field
      profilePhoto: { type: Sequelize.STRING },

      // ---------------- Address + Emergency ----------------
      address: { type: Sequelize.STRING },
      city: { type: Sequelize.STRING },
      state: { type: Sequelize.STRING },
      pincode: { type: Sequelize.STRING },
      emergencyName: { type: Sequelize.STRING },
      emergencyMobile: { type: Sequelize.STRING },

      // ---------------- Vehicle Details ----------------
      vehicleType: { type: Sequelize.STRING },
      vehicleModel: { type: Sequelize.STRING },
      licensePlate: { type: Sequelize.STRING },
      rcFile: { type: Sequelize.STRING },
      dlFile: { type: Sequelize.STRING },

      // ---------------- Work Info ----------------
      workType: { type: Sequelize.ENUM("full-time", "part-time", "weekend") },
      breakStart: { type: Sequelize.TIME },
      breakEnd: { type: Sequelize.TIME },

      // ---------------- Payout / Bank Info ----------------
      bankName: { type: Sequelize.STRING },
      accountNumber: { type: Sequelize.STRING },
      ifsc: { type: Sequelize.STRING },
      idProofFile: { type: Sequelize.STRING },

      // ---------------- Status + OTP ----------------
      status: {
        type: Sequelize.ENUM("pending", "active", "on-duty", "inactive", "blocked"),
        allowNull: false,
        defaultValue: "active"
      },
      otp: { type: Sequelize.STRING(6) },
      otpExpiry: { type: Sequelize.DATE },
      otpVerified: { type: Sequelize.BOOLEAN, defaultValue: false },

      // ---------------- Timestamps ----------------
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
    // Drop ENUM types separately to avoid PostgreSQL conflicts
    await queryInterface.dropTable('partners');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Partners_workType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Partners_status";');
  }
};
