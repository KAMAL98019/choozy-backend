'use strict';
const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  class Admin extends Model {
    static associate(models) {
      // Admin approves offers
      Admin.hasMany(models.Offer, { 
        foreignKey: 'approvedBy', 
        as: 'approvedOffers' 
      });
      
      // Admin creates offers
      Admin.hasMany(models.Offer, { 
        foreignKey: 'createdBy', 
        as: 'createdOffers' 
      });
    }
  }
  
  Admin.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true 
      },
      password: { 
        type: DataTypes.STRING, 
        allowNull: false 
      }
    },
    { 
      sequelize, 
      modelName: 'Admin', 
      tableName: 'admins' 
    }
  );
  
  return Admin;
};