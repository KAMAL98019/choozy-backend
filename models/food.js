'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4, parse, stringify } = require('uuid'); // helper

module.exports = (sequelize, DataTypes) => {
  class Food extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Food.init({
     id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    price: DataTypes.DECIMAL,
    imageUrl: DataTypes.STRING,
    isAvailable: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Food',
  });
  return Food;
};