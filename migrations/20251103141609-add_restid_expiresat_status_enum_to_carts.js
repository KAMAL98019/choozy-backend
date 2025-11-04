'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ✅ Only change 'status' column type to ENUM
    await queryInterface.changeColumn('carts', 'status', {
      type: Sequelize.ENUM('active', 'checked_out', 'abandoned', 'expired'),
      defaultValue: 'active'
    });

    // ✅ Add 'expiresAt' column if it doesn't exist
    const tableDesc = await queryInterface.describeTable('carts');
    if (!tableDesc.expiresAt) {
      await queryInterface.addColumn('carts', 'expiresAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Cart expires after 24 hours of inactivity'
      });
    }

    // ✅ Add indexes safely
    await queryInterface.addIndex('carts', ['userId', 'status']);
    await queryInterface.addIndex('carts', ['rest_id']);
    await queryInterface.addIndex('carts', ['expiresAt']);
  },

  async down(queryInterface, Sequelize) {
    // 🧹 Rollback indexes
    await queryInterface.removeIndex('carts', ['userId', 'status']);
    await queryInterface.removeIndex('carts', ['rest_id']);
    await queryInterface.removeIndex('carts', ['expiresAt']);

    // 🧹 Remove expiresAt if it exists
    const tableDesc = await queryInterface.describeTable('carts');
    if (tableDesc.expiresAt) {
      await queryInterface.removeColumn('carts', 'expiresAt');
    }

    // 🧹 Revert status column back to STRING
    await queryInterface.changeColumn('carts', 'status', {
      type: Sequelize.STRING
    });

    // Drop ENUM type (Postgres only)
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_carts_status";');
    }
  }
};
