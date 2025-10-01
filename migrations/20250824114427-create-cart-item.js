'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CartItems', {
     id: {
        type: Sequelize.CHAR,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      cartId: {
        type: Sequelize.UUID
      },
      foodId: {
        type: Sequelize.UUID
      },
      orderId: {
        type: Sequelize.UUID
      },
      
      quantity: {
        type: Sequelize.INTEGER
      },
      unitPrice: {
        type: Sequelize.DECIMAL
      },
       selectedAddOns: {
        type: Sequelize.JSON, // Example: [{ "name": "Extra Paneer", "price": 50 }]
        allowNull: true,
        defaultValue: []
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CartItems');
  }
};