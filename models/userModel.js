import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";

const User = db.define(
  "users",
  {
    user_id: {
      type: DataTypes.INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      required: true,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      required: true,
    },
    password: {
      type: DataTypes.STRING,
      required: true,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      required: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      required: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      required: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    freezeTableName: true,
  }
);

export default User;
