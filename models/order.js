'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
      Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Order.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
      Order.hasOne(models.DeliveryOrder, { foreignKey: 'orderId', as: 'delivery_order' });
      Order.belongsTo(models.Partner, { foreignKey: 'partnerId', as: 'partner' });
      Order.belongsTo(models.RestaurantReg, { foreignKey: 'rest_id', as: 'restaurant' });

    }
  }

  Order.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      orderNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      cartId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      partnerId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: { 
        type: DataTypes.STRING, 
        allowNull: false 
      },
      latitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      longitude: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      paymentMethod: { 
        type: DataTypes.ENUM('CASH', 'CARD', 'UPI'), 
        allowNull: false 
      },
      paymentStatus: {
        type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED'),
        defaultValue: 'PENDING'
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
          'READY',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED'
        ),
        defaultValue: 'PENDING'
      },
      specialInstructions: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      estimatedPreparationTime: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      preparingAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      readyAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      outForDeliveryAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    { 
      sequelize, 
      modelName: 'Order',
      tableName: 'orders',
      timestamps: true
    }
  );

  // Before create hook to generate order number
  Order.beforeCreate(async (order) => {
    if (!order.orderNumber) {
      order.orderNumber = `#ORD${Date.now().toString().slice(-5)}`;
    }
  });

  return Order;
};
