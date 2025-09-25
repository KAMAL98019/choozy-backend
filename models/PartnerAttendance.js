'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PartnerAttendance extends Model {
    static associate(models) {
      PartnerAttendance.belongsTo(models.Partner, { foreignKey: 'partnerId' });
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
    },
    attendancePhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attendanceTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PartnerAttendance',
    tableName: 'partner_attendance',
  });

  return PartnerAttendance;
};
