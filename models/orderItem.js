'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      OrderItem.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
      OrderItem.belongsTo(models.FoodItem, { foreignKey: 'foodId', as: 'food' });
    }
  }

  OrderItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      foodId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      quantity: DataTypes.INTEGER,
      price: DataTypes.FLOAT,
      totalPrice: DataTypes.FLOAT
    },
    { sequelize, modelName: 'OrderItem',  tableName: 'orderitems' }
  );

  return OrderItem;
};
