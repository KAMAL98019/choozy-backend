'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1️⃣ Rename proofUrl → deliveryPhoto
    const tableDesc = await queryInterface.describeTable('delivery_orders');
    if (tableDesc.proofUrl) {
      await queryInterface.renameColumn('delivery_orders', 'proofUrl', 'deliveryPhoto');
    }

    // 2️⃣ Add missing columns
    if (!tableDesc.earnings) {
      await queryInterface.addColumn('delivery_orders', 'earnings', { type: Sequelize.FLOAT, allowNull: true });
    }
    if (!tableDesc.distanceKm) {
      await queryInterface.addColumn('delivery_orders', 'distanceKm', { type: Sequelize.FLOAT, allowNull: true });
    }
    if (!tableDesc.deliveredAt) {
      await queryInterface.addColumn('delivery_orders', 'deliveredAt', { type: Sequelize.DATE, allowNull: true });
    }

    // 3️⃣ Update status enum to match model
    await queryInterface.changeColumn('delivery_orders', 'status', {
      type: Sequelize.ENUM(
        'PENDING',
        'ASSIGNED',
        'ACCEPTED',
        'PICKED_UP',
        'DELIVERED_PENDING_OTP',
        'DELIVERED',
        'REJECTED'
      ),
      defaultValue: 'PENDING',
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert status enum
    await queryInterface.changeColumn('delivery_orders', 'status', {
      type: Sequelize.ENUM('assigned','pickedup','delivered'),
      defaultValue: 'assigned',
      allowNull: false
    });

    const tableDesc = await queryInterface.describeTable('delivery_orders');
    if (tableDesc.deliveryPhoto) {
      await queryInterface.renameColumn('delivery_orders', 'deliveryPhoto', 'proofUrl');
    }
    if (tableDesc.earnings) {
      await queryInterface.removeColumn('delivery_orders', 'earnings');
    }
    if (tableDesc.distanceKm) {
      await queryInterface.removeColumn('delivery_orders', 'distanceKm');
    }
    if (tableDesc.deliveredAt) {
      await queryInterface.removeColumn('delivery_orders', 'deliveredAt');
    }
  }
};
