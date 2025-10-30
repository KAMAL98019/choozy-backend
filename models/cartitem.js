'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      CartItem.belongsTo(models.FoodItem, { foreignKey: 'foodId', as: 'food' });
      CartItem.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
      CartItem.belongsTo(models.Order, { foreignKey: 'orderId' });

    }
  }

  CartItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cartId: { type: DataTypes.UUID, allowNull: false },
    foodId: { type: DataTypes.UUID, allowNull: false },
     orderId: { type: DataTypes.UUID, allowNull:true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: DataTypes.DECIMAL,
    selectedAddOns: {
      type: DataTypes.JSON, // Store as array of objects
      allowNull: true,
      defaultValue: []      // Example: [{ "name": "Extra Paneer", "price": 50 }]
    }


  }, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cartItems'
  });

  return CartItem;
};
