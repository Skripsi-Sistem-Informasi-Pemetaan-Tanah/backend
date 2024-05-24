import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";
import User from "./userModel.js"

const Map = db.define(
  "maps",
  {
    map_id: {
      type: DataTypes.INTEGER,
      unique: true,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.CHAR(100),
      allowNull: false,
        references: {
          model: User,
          key: 'username'
        }
    },
    koordinat: {
      type: DataTypes.ARRAY(DataTypes.DOUBLE),
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
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

export default Map;
