'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      CartItem.belongsTo(models.FoodItem, { 
        foreignKey: 'foodId', 
        as: 'food' 
      });
      CartItem.belongsTo(models.Cart, { 
        foreignKey: 'cartId', 
        as: 'cart' 
      });
    }
  }

  CartItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cartId: { 
      type: DataTypes.UUID, 
      allowNull: false 
    },
    foodId: { 
      type: DataTypes.UUID, 
      allowNull: false 
    },
    quantity: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price at the time of adding to cart'
    },
    selectedAddOns: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of selected add-ons with name and price'
    }
  }, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cartItems',
    timestamps: true,
    indexes: [
      {
        fields: ['cartId']
      },
      {
        fields: ['foodId']
      }
    ]
  });

  return CartItem;
};