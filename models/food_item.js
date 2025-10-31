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
      FoodItem.belongsTo(models.Cuisine, {
        foreignKey: 'cuisineId',
        as: 'cuisine'
      });
      FoodItem.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category'
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
    
    veg: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    contain_allergens: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    specify_allergence: DataTypes.TEXT,
    customised_options: DataTypes.JSON,
    cuisineId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    categoryId: {   // Add this foreign key
      type: DataTypes.UUID,
      allowNull: true
    },
    dishimage: {  // ✅ ADD THIS FIELD
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FoodItem',
    tableName: 'food_items'
  });
  return FoodItem;
};
