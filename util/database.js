const Sequelize = require("sequelize");

// this will create a new sequelize object which will be connected to the database,
//to be precise, this will be setting a connection pool through sequelize
const sequelize = new Sequelize("node-complete", "root", "password", {
  dialect: "mysql",
  host: "localhost",
});

// this sequelize object here is essentially the databse connection pool that is managed by sequelize
module.exports = sequelize;
