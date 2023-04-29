const Sequelize = require("sequelize");

// this is the database connection pool that is managed by sequelize that we created earlier
const sequelize = require("../util/database");

// define a model that will be managed by sequelize
const User = sequelize.define("user", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  // name: {
  //   type: Sequelize.STRING,
  //   allowNull: false,
  // },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  resetToken: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  resetTokenExpiration: {
    type: Sequelize.DATE,
    allowNull: true,
  },
});

module.exports = User;
