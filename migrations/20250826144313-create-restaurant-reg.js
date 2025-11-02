'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('restaurant_reg', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },

      rest_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      restaurant_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },

      rest_address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      avg_cost_two: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },

      rest_logo: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      contact_person_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      contact_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      contact_number: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },

      operational_hours: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      fssai_certificate: {
        type: Sequelize.STRING(1024),
        allowNull: false,
      },

      gst_certificate: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },

      bank_account_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      account_number: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },

      ifsc_code: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },

      agree_to_terms: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
      },

      // 🔹 Delivery Settings
      deliveryType: {
        type: Sequelize.ENUM('RADIUS', 'ZONE'),
        allowNull: false,
        defaultValue: 'RADIUS',
      },

      deliveryRadius: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      deliveryZones: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      restaurantLatitude: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      restaurantLongitude: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      minOrderAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 500,
      },

      baseDeliveryFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50,
      },

      // 🔹 OTP-related fields
      otp: {
        type: Sequelize.STRING(6),
        allowNull: true,
      },

      otpExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      otpVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Helpful indexes for searching
    await queryInterface.addIndex('restaurant_reg', ['rest_name']);
    await queryInterface.addIndex('restaurant_reg', ['contact_number']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('restaurant_reg');
    // Drop ENUM types (important for PostgreSQL)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_restaurant_reg_deliveryType";');
  },
};
