'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FoodItem extends Model {
    static associate(models) {
      FoodItem.hasMany(models.CartItem, { foreignKey: 'foodId', as: 'cartItems' });
      FoodItem.belongsTo(models.RestaurantReg, {
        foreignKey: 'rest_id',
        as: 'restaurant'
      });
    }
  }
  FoodItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rest_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dishname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    price: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    veg: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    contain_allergens: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    specify_allergence: DataTypes.TEXT,
    customised_options: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'FoodItem',
    tableName: 'food_items'
  });
  return FoodItem;
};
