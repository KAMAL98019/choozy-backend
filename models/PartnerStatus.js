'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PartnerStatus extends Model {
    static associate(models) {
      PartnerStatus.belongsTo(models.Partner, { foreignKey: 'partnerId' });
    }
  }

  PartnerStatus.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    partnerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("online", "offline"),
      defaultValue: "offline",
    },
    fcmToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PartnerStatus',
    tableName: 'partner_status',
  });

  return PartnerStatus;
};
