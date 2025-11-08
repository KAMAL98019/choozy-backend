'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },

      orderNumber: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
      },

      // 🔹 Added from second migration
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

      cartId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'carts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      partnerId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'partners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      customerName: { type: Sequelize.STRING, allowNull: true },
      customerPhone: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.STRING, allowNull: false },
      latitude: { type: Sequelize.FLOAT, allowNull: true },
      longitude: { type: Sequelize.FLOAT, allowNull: true },

      paymentMethod: {
        type: Sequelize.ENUM('CASH', 'CARD', 'UPI'),
        allowNull: false,
      },

      paymentStatus: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'FAILED'),
        defaultValue: 'PENDING',
      },

      subtotal: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      tax: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      deliveryFee: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },
      totalAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.0 },

      status: {
        type: Sequelize.ENUM(
          'PENDING',
          'CONFIRMED',
          'PREPARING',
          'READY',
          'ASSIGNED',
          'ACCEPTED',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED'
        ),
        defaultValue: 'PENDING',
      },


      specialInstructions: { type: Sequelize.TEXT, allowNull: true },
      estimatedPreparationTime: { type: Sequelize.INTEGER, allowNull: true },

      confirmedAt: { type: Sequelize.DATE, allowNull: true },
      preparingAt: { type: Sequelize.DATE, allowNull: true },
      readyAt: { type: Sequelize.DATE, allowNull: true },
      outForDeliveryAt: { type: Sequelize.DATE, allowNull: true },
      deliveredAt: { type: Sequelize.DATE, allowNull: true },
      cancelledAt: { type: Sequelize.DATE, allowNull: true },
      cancellationReason: { type: Sequelize.TEXT, allowNull: true },

      razorpayOrderId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Razorpay order ID'
      },
      razorpayPaymentId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Razorpay payment ID'
      },
      transactionId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Payment transaction ID'
      },

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

    // ✅ Add useful indexes
    await queryInterface.addIndex('orders', ['orderNumber']);
    await queryInterface.addIndex('orders', ['rest_id']);
    await queryInterface.addIndex('orders', ['userId']);
    await queryInterface.addIndex('orders', ['partnerId']);
    await queryInterface.addIndex('orders', ['status']);
  },

  async down(queryInterface, Sequelize) {
    // Drop table first
    await queryInterface.dropTable('orders');

    // ✅ Clean ENUM types (important for PostgreSQL)
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orders_paymentMethod";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orders_paymentStatus";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orders_status";'
    );
  },
};
