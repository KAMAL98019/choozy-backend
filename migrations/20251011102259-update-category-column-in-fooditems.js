'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1️⃣ Remove old 'category' column if it exists
    await queryInterface.removeColumn('food_items', 'category');

    // 2️⃣ Add new 'categoryId' column referencing Category table
    await queryInterface.addColumn('food_items', 'categoryId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Categories', // table name (check your actual table name)
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    // 1️⃣ Remove the new 'categoryId' column
    await queryInterface.removeColumn('food_items', 'categoryId');

    // 2️⃣ Recreate the old 'category' column (rollback)
    await queryInterface.addColumn('food_items', 'category', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
