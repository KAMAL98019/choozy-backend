'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new ENUM values to 'orders.status'
    await queryInterface.changeColumn('orders', 'status', {
      type: Sequelize.ENUM(
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'ASSIGNED',
        'ACCEPTED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'PENDING'
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert ENUM to original (if rollback)
    await queryInterface.changeColumn('orders', 'status', {
      type: Sequelize.ENUM(
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'PENDING'
    });
  }
};
