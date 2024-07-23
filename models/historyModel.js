import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";
import Map from "../models/mapModel.js";

const History = db.define(
  "history",
  {
    history_id: {
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
    old_coordinate: {
      type: DataTypes.TEXT,
      required: false,
    },
    new_coordinate: {
      type: DataTypes.TEXT,
      required: false,
    },
    status: {
      type: DataTypes.CHAR(25),
      required: true,
      defaultValue: "belum tervalidasi",
    },
    old_status: {
      type: DataTypes.CHAR(25),
      required: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      required: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

export default History;
