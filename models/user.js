'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4, parse, stringify } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
       User.hasMany(models.Cart, { foreignKey: 'userId', as: 'carts' });
       
    
       User.hasMany(models.Address, { foreignKey: 'userId', as: 'addresses' });
       User.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
       User.hasMany(models.ReviewDeliveryToCustomer, { foreignKey: 'userId', as: 'reviews' });
    }
  }
  
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    mobile: DataTypes.STRING,
    birthday: DataTypes.DATE,
    anniversary: DataTypes.DATE,
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'   
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};