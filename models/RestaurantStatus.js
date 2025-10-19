// models/RestaurantStatus.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RestaurantStatus extends Model {
    static associate(models) {
     RestaurantStatus.belongsTo(models.RestaurantReg, { foreignKey: 'rest_id' });
    }
  }

  RestaurantStatus.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      rest_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('ONLINE', 'OFFLINE'),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'RestaurantStatus',
      tableName: 'restaurant_statuses',
    }
  );

  return RestaurantStatus;
};
