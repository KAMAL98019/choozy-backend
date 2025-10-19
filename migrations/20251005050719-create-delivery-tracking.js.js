'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_tracking', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('(UUID())'),
        primaryKey: true,
        allowNull: false
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true
      },
      deliveryPartnerId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      deliveryPartnerName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      deliveryPartnerPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      currentLatitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      currentLongitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      restaurantLatitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      restaurantLongitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      deliveryLatitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      deliveryLongitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      estimatedDeliveryMinutes: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      trackingStatus: {
        type: Sequelize.ENUM(
          'ORDER_CONFIRMED',
          'PREPARING_FOOD',
          'ON_THE_WAY',
          'NEARBY',
          'DELIVERED'
        ),
        defaultValue: 'ORDER_CONFIRMED'
      },
      assignedAt: Sequelize.DATE,
      pickedUpAt: Sequelize.DATE,
      arrivedAt: Sequelize.DATE,

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_tracking');
  }
};
