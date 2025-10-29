'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PartnerAttendance extends Model {
    static associate(models) {
      PartnerAttendance.belongsTo(models.Partner, { 
        foreignKey: 'partnerId',
        as: 'partner'
      });
    }
  }

  PartnerAttendance.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    partnerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'partners',   // ✅ FK reference
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    attendancePhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ONLINE', 'OFFLINE'),
      allowNull: false,
      defaultValue: 'OFFLINE',  // ✅ Default OFFLINE
    },
    attendanceTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW   // ✅ Auto set current time
    },
  }, {
    sequelize,
    modelName: 'PartnerAttendance',
    tableName: 'partner_attendances', 
    timestamps: true, // createdAt, updatedAt
  });

  return PartnerAttendance;
};
