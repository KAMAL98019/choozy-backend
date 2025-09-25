'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Subscription.belongsTo(models.FoodItem, { foreignKey: 'foodId', as: 'food' });
    }
  }

  Subscription.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      foodId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      planName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.ENUM('CASH', 'CARD', 'UPI'),
        allowNull: false
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false
      },
      startDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      endDate: {
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED'),
        defaultValue: 'ACTIVE',
      }
    },
    {
      sequelize,
      modelName: 'Subscription',
      tableName: 'subscriptions',
    }
  );

  return Subscription;
};
