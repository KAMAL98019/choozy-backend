'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('food_items', 'cuisineId', {
      type: Sequelize.UUID,
      references: {
        model: 'Cuisines',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('food_items', 'cuisineId');
  }
};
