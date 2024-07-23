import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";
import User from "./userModel.js"

const Map = db.define(
  "maps",
  {
    map_id: {
      type: DataTypes.STRING,
      unique: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
        references: {
          model: User,
          key: 'user_id'
        }
    },
    nama_lahan: {
      type: DataTypes.CHAR(30),
      required: true,
    },
    jenis_lahan: {
      type: DataTypes.CHAR(30),
      required: true,
    },
    deskripsi: {
      type: DataTypes.TEXT,
      required: false,
    },
    koordinat: {
      type: DataTypes.JSONB,
      required: false,
    },
    status: {
      type: DataTypes.CHAR(25),
      required: true,
      defaultValue: "belum tervalidasi",
    },
    progress: {
      type: DataTypes.INTEGER,
      required: true,
      defaultValue: 0,
    },
    komentar: {
      type: DataTypes.TEXT,
      required: false,
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
    freezeTableName: true,
    timestamps: false,
  }
);

export default Map;
