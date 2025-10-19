'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_orders', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      orderId: { type: Sequelize.UUID, allowNull: false },
      partnerId: { type: Sequelize.UUID, allowNull: true },
      status: { type: Sequelize.ENUM("assigned","pickedup","delivered"), defaultValue: "assigned" },
      pickupTime: { type: Sequelize.DATE },
      deliveryTime: { type: Sequelize.DATE },
      proofUrl: { type: Sequelize.STRING },

      // <-- New fields for map locations
      pickupLatitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      pickupLongitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      deliveryLatitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      deliveryLongitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },

      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('delivery_orders');
  }
};
