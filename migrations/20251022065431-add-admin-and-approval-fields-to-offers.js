'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 🧹 STEP 1: Remove old FK if exists (avoids errors)
    try {
      await queryInterface.removeConstraint('offers', 'offers_approvedBy_foreign_idx');
      console.log('✅ Removed old foreign key constraint on approvedBy');
    } catch (error) {
      console.log('ℹ️ No existing approvedBy foreign key constraint found');
    }

    // 🆕 STEP 2: Add missing columns one by one safely

    // 1️⃣ createdBy (Admin who created the offer)
    try {
      await queryInterface.addColumn('offers', 'createdBy', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'admins', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ Added createdBy column');
    } catch (error) {
      console.log('ℹ️ createdBy already exists');
    }

    // 2️⃣ offerType (RESTAURANT / ADMIN)
    try {
      await queryInterface.addColumn('offers', 'offerType', {
        type: Sequelize.ENUM('RESTAURANT', 'ADMIN'),
        allowNull: false,
        defaultValue: 'RESTAURANT'
      });
      console.log('✅ Added offerType column');
    } catch (error) {
      console.log('ℹ️ offerType already exists');
    }

    // 3️⃣ approvalStatus (PENDING / APPROVED / REJECTED / CHANGES_REQUESTED)
    try {
      await queryInterface.addColumn('offers', 'approvalStatus', {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'),
        allowNull: false,
        defaultValue: 'PENDING'
      });
      console.log('✅ Added approvalStatus column');
    } catch (error) {
      console.log('ℹ️ approvalStatus already exists');
    }

    // 4️⃣ approvedBy (string name/id — no FK)
    try {
      await queryInterface.addColumn('offers', 'approvedBy', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Added approvedBy column (string, no FK)');
    } catch (error) {
      console.log('ℹ️ approvedBy already exists');
    }

    // 5️⃣ approvalDate
    try {
      await queryInterface.addColumn('offers', 'approvalDate', {
        type: Sequelize.DATE,
        allowNull: true
      });
      console.log('✅ Added approvalDate column');
    } catch (error) {
      console.log('ℹ️ approvalDate already exists');
    }

    // 6️⃣ rejectionReason
    try {
      await queryInterface.addColumn('offers', 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      console.log('✅ Added rejectionReason column');
    } catch (error) {
      console.log('ℹ️ rejectionReason already exists');
    }

    // 7️⃣ adminComments
    try {
      await queryInterface.addColumn('offers', 'adminComments', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      console.log('✅ Added adminComments column');
    } catch (error) {
      console.log('ℹ️ adminComments already exists');
    }

    // 8️⃣ maxUsagePerUser
    try {
      await queryInterface.addColumn('offers', 'maxUsagePerUser', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
      console.log('✅ Added maxUsagePerUser column');
    } catch (error) {
      console.log('ℹ️ maxUsagePerUser already exists');
    }

    // 9️⃣ totalUsageLimit
    try {
      await queryInterface.addColumn('offers', 'totalUsageLimit', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
      console.log('✅ Added totalUsageLimit column');
    } catch (error) {
      console.log('ℹ️ totalUsageLimit already exists');
    }

    // 🔟 Make restaurantId nullable (since admin offers may not have restaurant)
    try {
      await queryInterface.changeColumn('offers', 'restaurantId', {
        type: Sequelize.UUID,
        allowNull: true
      });
      console.log('✅ Made restaurantId nullable');
    } catch (error) {
      console.log('ℹ️ restaurantId already nullable or change skipped');
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove all added columns on rollback
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
        console.log(`🗑️ Removed ${column} column`);
      } catch (error) {
        console.log(`ℹ️ Column ${column} not found or already removed`);
      }
    }

    // Drop ENUMs if needed (PostgreSQL only)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_offers_offerType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_offers_approvalStatus";');
  }
};
