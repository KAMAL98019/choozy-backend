'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dining_bookings', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },

      bookingNumber: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        comment: 'e.g., #BOOK98765',
      },

      rest_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'restaurant_reg', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      // 🔹 New field merged from second migration
      eventId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'dining_events', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      customerName: { type: Sequelize.STRING, allowNull: false },
      customerPhone: { type: Sequelize.STRING, allowNull: false },
      customerEmail: { type: Sequelize.STRING, allowNull: true },

      bookingDate: { type: Sequelize.DATEONLY, allowNull: false },
      bookingTime: { type: Sequelize.TIME, allowNull: false },

      numberOfGuests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      diningAreaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'dining_spaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      tableNumber: { type: Sequelize.STRING, allowNull: true },
      specialRequests: { type: Sequelize.TEXT, allowNull: true },
      purpose: { type: Sequelize.STRING, allowNull: true },

      status: {
        type: Sequelize.ENUM(
          'PENDING',
          'ADMIN_VERIFIED',
          'CONFIRMED',
          'SEATED',
          'COMPLETED',
          'CANCELLED'
        ),
        allowNull: false,
        defaultValue: 'PENDING',
      },

      staffNotes: { type: Sequelize.TEXT, allowNull: true },
      cancellationReason: { type: Sequelize.TEXT, allowNull: true },
      cancelledBy: {
        type: Sequelize.ENUM('CUSTOMER', 'ADMIN', 'RESTAURANT'),
        allowNull: true,
      },

      bookedAt: { type: Sequelize.DATE, allowNull: true },
      adminVerifiedAt: { type: Sequelize.DATE, allowNull: true },
      restaurantConfirmedAt: { type: Sequelize.DATE, allowNull: true },
      seatedAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      cancelledAt: { type: Sequelize.DATE, allowNull: true },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // ✅ Add helpful indexes
    await queryInterface.addIndex('dining_bookings', ['bookingNumber']);
    await queryInterface.addIndex('dining_bookings', ['rest_id']);
    await queryInterface.addIndex('dining_bookings', ['userId']);
    await queryInterface.addIndex('dining_bookings', ['eventId']);
    await queryInterface.addIndex('dining_bookings', ['status']);
    await queryInterface.addIndex('dining_bookings', ['bookingDate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dining_bookings');

    // Clean up ENUMs (important for PostgreSQL)
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_dining_bookings_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_dining_bookings_cancelledBy";'
    );
  },
};
