'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserOffer extends Model {
    static associate(models) {
      UserOffer.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      
      UserOffer.belongsTo(models.Offer, {
        foreignKey: 'offerId',
        as: 'offer'
      });
      
      UserOffer.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
    }
  }

  UserOffer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      offerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'offers',
          key: 'id'
        }
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Orders',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('BOOKED', 'USED', 'EXPIRED', 'CANCELLED'),
        defaultValue: 'BOOKED'
      },
      bookedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'UserOffer',
      tableName: 'user_offers'
    }
  );

  return UserOffer;
};