'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
      Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Order.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
    }
  }

  Order.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      cartId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      subtotal: DataTypes.FLOAT,
      tax: DataTypes.FLOAT,
      deliveryFee: DataTypes.FLOAT,
      totalAmount: DataTypes.FLOAT,
      status: {
        type: DataTypes.ENUM(
          'PENDING',
          'CONFIRMED',
          'PREPARING',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED'
        ),
        defaultValue: 'PENDING'
      }
    },
    { sequelize, modelName: 'Order' }
  );

  return Order;
};
