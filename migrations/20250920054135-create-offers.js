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

      // Dates & times (date part + optional time)
      startDate: { type: Sequelize.DATE, allowNull: true },
      endDate: { type: Sequelize.DATE, allowNull: true },
      startTime: { type: Sequelize.STRING, allowNull: true }, // e.g. "09:00"
      endTime: { type: Sequelize.STRING, allowNull: true },   // e.g. "23:00"

      // Which items/categories this offer applies to (store JSON array of ids or categories)
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

      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface, Sequelize) {
    // drop enum types are automatically handled by Sequelize, but if errors appear you may need to drop manually
    await queryInterface.dropTable('offers');
  }
};
