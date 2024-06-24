import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";

const User = db.define(
  "users",
  {
    user_id: {
      type: DataTypes.STRING,
      unique: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      required: true,
      unique: true,
    },    
    nama_lengkap: {
      type: DataTypes.STRING,
      required: false,
    },
    email: {
      type: DataTypes.STRING,
      required: true,
    },
    password: {
      type: DataTypes.STRING,
      required: true,
    },
    role: {
      type: DataTypes.INTEGER,
      required: true,
      defaultValue: 1,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      required: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      required: true,
    },
    created_at: {
      type: DataTypes.DATE,
      required: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
  }
);

export default User;
