'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
 up: async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('orders', 'rest_id', {
    type: Sequelize.UUID,
    allowNull: false,
  });
},
down: async (queryInterface) => {
  await queryInterface.removeColumn('orders', 'rest_id');
}


};
