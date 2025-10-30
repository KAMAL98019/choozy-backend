'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('food_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      rest_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurant_reg',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      dishimage: {  // ✅ Added
        type: DataTypes.STRING,
        allowNull: true
      },
      dishname: {
        type: Sequelize.STRING,
        allowNull: false
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'categories', // ✅ lowercase
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cuisineId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'cuisines', // ✅ lowercase
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      veg: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      contain_allergens: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      specify_allergence: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      customised_options: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('food_items');
  }
};
