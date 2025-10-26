'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add as NULLABLE (so it won't break existing rows)
    await queryInterface.addColumn('Users', 'customerId', {
      type: Sequelize.STRING,
      allowNull: true, // ✅ allow null temporarily
      unique: true,
      after: 'id'
    });

    // Step 2: Optionally fill existing users with dummy IDs (if needed)
    const [users] = await queryInterface.sequelize.query(`SELECT id FROM Users`);
    let count = 1;
    for (const user of users) {
      const custId = 'CUST' + count.toString().padStart(4, '0');
      await queryInterface.sequelize.query(
        `UPDATE Users SET customerId = :custId WHERE id = :id`,
        { replacements: { custId, id: user.id } }
      );
      count++;
    }

    // Step 3: Now make column NOT NULL
    await queryInterface.changeColumn('Users', 'customerId', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'customerId');
  }
};
