'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiningBooking extends Model {
    static associate(models) {
      DiningBooking.belongsTo(models.RestaurantReg, {
        foreignKey: 'rest_id',
        as: 'restaurant'
      });
      DiningBooking.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      DiningBooking.belongsTo(models.DiningSpace, {
        foreignKey: 'diningAreaId',
        as: 'diningArea'
      });
      DiningBooking.belongsTo(models.DiningEvent, {
  foreignKey: 'eventId',
  as: 'event'
});

      
    }
  }

  DiningBooking.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bookingNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    rest_id: DataTypes.UUID,
    userId: DataTypes.UUID,
    eventId: {            // ✅ add this
    type: DataTypes.UUID,
    allowNull: false
  },
    customerName: DataTypes.STRING,
    customerPhone: DataTypes.STRING,
    customerEmail: DataTypes.STRING,
    bookingDate: DataTypes.DATEONLY,
    bookingTime: DataTypes.TIME,
    numberOfGuests: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    diningAreaId: DataTypes.UUID,
    tableNumber: DataTypes.STRING,
    specialRequests: DataTypes.TEXT,
    purpose: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'ADMIN_VERIFIED',
        'CONFIRMED',
        'SEATED',
        'COMPLETED',
        'CANCELLED'
      ),
      defaultValue: 'PENDING'
    },
    staffNotes: DataTypes.TEXT,
    cancellationReason: DataTypes.TEXT,
    cancelledBy: {
      type: DataTypes.ENUM('CUSTOMER', 'ADMIN', 'RESTAURANT')
    },
    bookedAt: DataTypes.DATE,
    adminVerifiedAt: DataTypes.DATE,
    restaurantConfirmedAt: DataTypes.DATE,
    seatedAt: DataTypes.DATE,
    completedAt: DataTypes.DATE,
    cancelledAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'DiningBooking',
    tableName: 'dining_bookings'
  });

  return DiningBooking;
};
