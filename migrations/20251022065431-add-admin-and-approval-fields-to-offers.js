'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // STEP 1: Remove old FK if exists
    try {
      await queryInterface.removeConstraint('offers', 'offers_approvedBy_foreign_idx');
    } catch (error) {}

    // STEP 2: Add missing columns safely

    try {
      await queryInterface.addColumn('offers', 'createdBy', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'admins', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'offerType', {
        type: Sequelize.ENUM('RESTAURANT', 'ADMIN'),
        allowNull: false,
        defaultValue: 'RESTAURANT'
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'approvalStatus', {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'),
        allowNull: false,
        defaultValue: 'PENDING'
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'approvedBy', {
        type: Sequelize.STRING,
        allowNull: true
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'approvalDate', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'adminComments', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'maxUsagePerUser', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    } catch (error) {}

    try {
      await queryInterface.addColumn('offers', 'totalUsageLimit', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    } catch (error) {}

    try {
      await queryInterface.changeColumn('offers', 'restaurantId', {
        type: Sequelize.UUID,
        allowNull: true
      });
    } catch (error) {}
  },

  async down(queryInterface, Sequelize) {
    const columns = [
      'createdBy',
      'offerType',
      'approvalStatus',
      'approvedBy',
      'approvalDate',
      'rejectionReason',
      'adminComments',
      'maxUsagePerUser',
      'totalUsageLimit'
    ];

    for (const column of columns) {
      try {
        await queryInterface.removeColumn('offers', column);
      } catch (error) {}
    }

    // Drop ENUMs if needed (PostgreSQL only)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_offers_offerType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_offers_approvalStatus";');
  }
};
