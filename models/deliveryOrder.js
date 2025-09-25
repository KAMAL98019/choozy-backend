'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeliveryOrder extends Model {
    static associate(models) {
      DeliveryOrder.belongsTo(models.Partner, { foreignKey: 'partnerId' });
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
    status: { type: DataTypes.ENUM("assigned","pickedup","delivered"), defaultValue: "assigned" },
    pickupTime: { type: DataTypes.DATE },
    deliveryTime: { type: DataTypes.DATE },
    proofUrl: { type: DataTypes.STRING }
  }, {
    sequelize,
    modelName: 'DeliveryOrder',
    tableName: 'delivery_orders'
  });

  return DeliveryOrder;
};
