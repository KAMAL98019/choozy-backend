'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('restaurant_reg', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4, // Sequelize handles UUID generation
        allowNull: false,
        primaryKey: true,
      },

      Rest_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },

      Rest_address: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      cuisine_type: { // keeping your exact field name
        type: Sequelize.STRING(255),
        allowNull: false
      },

      avg_cost_two: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },

      rest_logo: {
        type: Sequelize.TEXT, // store URL/path
        allowNull: true
      },

      contact_person_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      contact_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      contact_number: {
        type: Sequelize.STRING(32),
        allowNull: true
      },

      // Array/JSON structure, e.g. [{day:"Mon", from:"09:00", to:"18:00", enabled:true}, ...]
      operational_hours: {
        type: Sequelize.JSON,
        allowNull: true
      },

      fssai_certificate: {
        type: Sequelize.STRING(1024), // path/link
        allowNull: false
      },

      gst_certificate: {
        type: Sequelize.STRING(1024), // optional path/link
        allowNull: true
      },

      bank_account_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      account_number: {
        type: Sequelize.STRING(64),
        allowNull: true
      },

      ifsc_code: {
        type: Sequelize.STRING(32),
        allowNull: true
      },

      agree_to_terms: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active', // default status

      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Helpful indexes for search
    await queryInterface.addIndex('restaurant_reg', ['Rest_name']);
    await queryInterface.addIndex('restaurant_reg', ['cuisine_type']);
    await queryInterface.addIndex('restaurant_reg', ['contact_number']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('restaurant_reg');
  }
};
