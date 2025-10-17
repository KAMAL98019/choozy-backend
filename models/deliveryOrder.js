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
        'DELIVERED_PENDING_OTP',
        'DELIVERED',
        'REJECTED'
      ),
      defaultValue: 'PENDING'
    },
    pickupTime: { type: DataTypes.DATE },
    deliveryTime: { type: DataTypes.DATE },
    deliveryPhoto: { type: DataTypes.STRING },
    earnings: { type: DataTypes.FLOAT },
    distanceKm: { type: DataTypes.FLOAT }
  }, {
    sequelize,
    modelName: 'DeliveryOrder',
    tableName: 'delivery_orders'
  });

  return DeliveryOrder;
};
