'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cartId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'carts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subtotal: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      tax: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      deliveryFee: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      totalAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      status: {
        type: Sequelize.ENUM(
          'PENDING',
          'CONFIRMED',
          'PREPARING',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED'
        ),
        defaultValue: 'PENDING'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orders');
  }
};
