'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeliveryTracking extends Model {
    static associate(models) {
      DeliveryTracking.belongsTo(models.Order, { 
        foreignKey: 'orderId', 
        as: 'order' 
      });
      DeliveryTracking.belongsTo(models.Partner, { 
        foreignKey: 'deliveryPartnerId', 
        as: 'deliveryPartner' 
      });
    }
  }

  DeliveryTracking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      deliveryPartnerId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      deliveryPartnerName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      deliveryPartnerPhone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      currentLatitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      currentLongitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      restaurantLatitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      restaurantLongitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      deliveryLatitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      deliveryLongitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      estimatedDeliveryMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 30
      },
      trackingStatus: {
        type: DataTypes.ENUM(
          'ORDER_CONFIRMED',
          'PREPARING_FOOD',
          'ON_THE_WAY',
          'NEARBY',
          'DELIVERED'
        ),
        defaultValue: 'ORDER_CONFIRMED'
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      pickedUpAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      arrivedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'DeliveryTracking',
      tableName: 'delivery_tracking',
      timestamps: true
    }
  );

  return DeliveryTracking;
};
