import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";
import Map from "../models/mapModel.js";

const History = db.define(
  "histories",
  {
    history_id: {
      type: DataTypes.INTEGER,
      unique: true,
      autoIncrement: true,
      primaryKey: true,
    },
    status: {
      type: DataTypes.CHAR(25),
      required: true,
      defaultValue: "belum tervalidasi",
    },
    map_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Map,
        key: 'map_id'
      }
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

export default History;
