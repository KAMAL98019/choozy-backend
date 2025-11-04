'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cart extends Model {
    static associate(models) {
      Cart.belongsTo(models.User, { 
        foreignKey: 'userId', 
        as: 'user' 
      });
      Cart.belongsTo(models.RestaurantReg, { 
        foreignKey: 'rest_id', 
        as: 'restaurant' 
      });
      Cart.hasMany(models.CartItem, { 
        as: 'items', 
        foreignKey: 'cartId', 
        onDelete: 'CASCADE' 
      });
    }
  }
  
  Cart.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    rest_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'checked_out', 'abandoned', 'expired'),
      defaultValue: 'active'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Cart expires after 24 hours of inactivity'
    }
  }, {
    sequelize,
    modelName: 'Cart',
    tableName: 'carts',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'status']
      },
      {
        fields: ['rest_id']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });
  
  return Cart;
};