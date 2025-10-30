'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('offers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },

      // Foreign key to restaurants table
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'restaurant_reg', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      discountType: {
        type: Sequelize.ENUM('PERCENTAGE', 'FLAT'),
        allowNull: false,
        defaultValue: 'PERCENTAGE'
      },
      discountValue: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },

      minOrderValue: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },

      startDate: { type: Sequelize.DATE, allowNull: true },
      endDate: { type: Sequelize.DATE, allowNull: true },
      startTime: { type: Sequelize.STRING, allowNull: true },
      endTime: { type: Sequelize.STRING, allowNull: true },

      // New column: categoryId
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      applicableItems: {
        type: Sequelize.JSON,
        allowNull: true
      },

      termsConditions: { type: Sequelize.TEXT, allowNull: true },
      offerImage: { type: Sequelize.STRING, allowNull: true },

      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },

      // Commission fields
      isCommissionAuto: { type: Sequelize.BOOLEAN, defaultValue: true },
      adminCommission: { type: Sequelize.FLOAT, defaultValue: 0 },

      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('offers');
  }
};
