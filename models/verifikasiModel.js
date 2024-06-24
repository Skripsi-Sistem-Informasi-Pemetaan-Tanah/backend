import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";
import Map from "./mapModel.js";
import User from "./userModel.js";

const Verifikasi = db.define(
  "verifikasi",
  {
    verifikasi_id: {
      type: DataTypes.INTEGER,
      unique: true,
      autoIncrement: true,
      primaryKey: true,
    },
    map_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Map,
        key: 'map_id'
      }
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
      type: DataTypes.CHAR(100),
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
    freezeTableName: true,
    timestamps: false,
  }
);

export default Verifikasi;
