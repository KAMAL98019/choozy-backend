'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('offers', 'categoryId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('offers', 'isCommissionAuto', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });

    await queryInterface.addColumn('offers', 'adminCommission', {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('offers', 'categoryId');
    await queryInterface.removeColumn('offers', 'isCommissionAuto');
    await queryInterface.removeColumn('offers', 'adminCommission');
  },
};
