'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Offer extends Model {
    static associate(models) {
      Offer.belongsTo(models.RestaurantReg, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      Offer.belongsTo(models.Admin, {
        foreignKey: 'createdBy',
        as: 'creator',
      });

      Offer.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category',
      });

      Offer.hasMany(models.UserOffer, {
        foreignKey: 'offerId',
        as: 'bookings',
      });
    }
  }

  Offer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id',
        },
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id',
        },
      },
      offerType: {
        type: DataTypes.ENUM('RESTAURANT', 'ADMIN'),
        defaultValue: 'RESTAURANT',
        allowNull: false,
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      discountType: {
        type: DataTypes.ENUM('PERCENTAGE', 'FLAT'),
        defaultValue: 'PERCENTAGE',
      },
      discountValue: { type: DataTypes.FLOAT, defaultValue: 0 },
      minOrderValue: { type: DataTypes.FLOAT, defaultValue: 0 },
      maxUsagePerUser: { type: DataTypes.INTEGER, defaultValue: 1 },
      totalUsageLimit: { type: DataTypes.INTEGER, allowNull: true },
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      startTime: DataTypes.STRING,
      endTime: DataTypes.STRING,
      applicableItems: DataTypes.JSON,
      termsConditions: DataTypes.TEXT,
      offerImage: DataTypes.STRING,
      isCommissionAuto: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      adminCommission: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE',
      },
      approvalStatus: {
        type: DataTypes.ENUM(
          'PENDING',
          'APPROVED',
          'REJECTED',
          'CHANGES_REQUESTED'
        ),
        defaultValue: 'PENDING',
      },
      approvedBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      approvalDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      adminComments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Offer',
      tableName: 'offers',
    }
  );

  return Offer;
};
