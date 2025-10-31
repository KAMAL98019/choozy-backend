'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('delivery_orders').catch(() => null);

    if (!tableDesc) {
      // Table does not exist → create new
      await queryInterface.createTable('delivery_orders', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        orderId: { type: Sequelize.UUID, allowNull: false },
        partnerId: { type: Sequelize.UUID, allowNull: true },
        status: {
          type: Sequelize.ENUM(
            'PENDING','ASSIGNED','ACCEPTED','PICKED_UP','DELIVERED_PENDING_OTP','DELIVERED','REJECTED'
          ),
          defaultValue: 'PENDING'
        },
        pickupTime: { type: Sequelize.DATE },
        deliveryTime: { type: Sequelize.DATE },
        deliveryPhoto: { type: Sequelize.STRING },
        earnings: { type: Sequelize.FLOAT },
        distanceKm: { type: Sequelize.FLOAT },
        deliveredAt: { type: Sequelize.DATE },
        pickedUpAt: { type: Sequelize.DATE },
        acceptedAt: { type: Sequelize.DATE },
        rejectionReason: { type: Sequelize.STRING },
        pickupLatitude: { type: Sequelize.DECIMAL(10,7) },
        pickupLongitude: { type: Sequelize.DECIMAL(10,7) },
        deliveryLatitude: { type: Sequelize.DECIMAL(10,7) },
        deliveryLongitude: { type: Sequelize.DECIMAL(10,7) },
        createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      });
    } else {
      // Table exists → migrate safely
      if (tableDesc.proofUrl && !tableDesc.deliveryPhoto) {
        await queryInterface.renameColumn('delivery_orders', 'proofUrl', 'deliveryPhoto');
      }
      if (!tableDesc.earnings) await queryInterface.addColumn('delivery_orders', 'earnings', { type: Sequelize.FLOAT });
      if (!tableDesc.distanceKm) await queryInterface.addColumn('delivery_orders', 'distanceKm', { type: Sequelize.FLOAT });
      if (!tableDesc.deliveredAt) await queryInterface.addColumn('delivery_orders', 'deliveredAt', { type: Sequelize.DATE });
      if (!tableDesc.pickedUpAt) await queryInterface.addColumn('delivery_orders', 'pickedUpAt', { type: Sequelize.DATE });
      if (!tableDesc.acceptedAt) await queryInterface.addColumn('delivery_orders', 'acceptedAt', { type: Sequelize.DATE });
      if (!tableDesc.rejectionReason) await queryInterface.addColumn('delivery_orders', 'rejectionReason', { type: Sequelize.STRING });

      // Update ENUM safely
      await queryInterface.sequelize.transaction(async t => {
        await queryInterface.changeColumn('delivery_orders', 'status', {
          type: Sequelize.ENUM(
            'PENDING','ASSIGNED','ACCEPTED','PICKED_UP','DELIVERED_PENDING_OTP','DELIVERED','REJECTED'
          ),
          defaultValue: 'PENDING',
          allowNull: false
        }, { transaction: t });
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('delivery_orders');
  }
};
