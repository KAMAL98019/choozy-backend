'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeliveryOrder extends Model {
    static associate(models) {
      DeliveryOrder.belongsTo(models.Partner, { foreignKey: "partnerId", as: "partner" });
      DeliveryOrder.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });
    }
  }

  DeliveryOrder.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: { type: DataTypes.UUID, allowNull: false },
    partnerId: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'ASSIGNED',
        'ACCEPTED',
        'PICKED_UP',
        'DELIVERED',
        'REJECTED'
      ),
      defaultValue: 'PENDING'
    },
    pickupTime: { type: DataTypes.DATE },
    deliveryTime: { type: DataTypes.DATE },
    deliveryPhoto: { type: DataTypes.STRING },
    earnings: { type: DataTypes.FLOAT },
    distanceKm: { type: DataTypes.FLOAT },
    deliveredAt: { type: DataTypes.DATE },
    pickedUpAt: { type: DataTypes.DATE },
    acceptedAt: { type: DataTypes.DATE },
    rejectionReason: { type: DataTypes.STRING },
    pickupLatitude: { type: DataTypes.DECIMAL(10, 7) },
    pickupLongitude: { type: DataTypes.DECIMAL(10, 7) },
    deliveryLatitude: { type: DataTypes.DECIMAL(10, 7) },
    deliveryLongitude: { type: DataTypes.DECIMAL(10, 7) }
  }, {
    sequelize,
    modelName: 'DeliveryOrder',
    tableName: 'delivery_orders'
  });

  return DeliveryOrder;
};
