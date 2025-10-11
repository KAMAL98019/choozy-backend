'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('restaurant_reg', 'deliveryType', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('restaurant_reg', 'deliveryRadius', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
    await queryInterface.addColumn('restaurant_reg', 'deliveryZones', {
      type: Sequelize.JSON,
      allowNull: true
    });
    await queryInterface.addColumn('restaurant_reg', 'restaurantLatitude', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
    await queryInterface.addColumn('restaurant_reg', 'restaurantLongitude', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
    await queryInterface.addColumn('restaurant_reg', 'minOrderAmount', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
    await queryInterface.addColumn('restaurant_reg', 'baseDeliveryFee', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('restaurant_reg', 'deliveryType');
    await queryInterface.removeColumn('restaurant_reg', 'deliveryRadius');
    await queryInterface.removeColumn('restaurant_reg', 'deliveryZones');
    await queryInterface.removeColumn('restaurant_reg', 'restaurantLatitude');
    await queryInterface.removeColumn('restaurant_reg', 'restaurantLongitude');
    await queryInterface.removeColumn('restaurant_reg', 'minOrderAmount');
    await queryInterface.removeColumn('restaurant_reg', 'baseDeliveryFee');
  }
};
