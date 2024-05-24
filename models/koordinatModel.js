import { Sequelize, DataTypes } from "sequelize";
import { db } from "../config/db.js";
import  Map  from "../models/mapModel.js"

const koordinat = db.define(
  "koordinat",
  {
    koordinat_id: {
      type: DataTypes.INTEGER,
      unique: true,
      autoIncrement: true,
      primaryKey: true,
    },
    koordinat: {
      type: DataTypes.ARRAY(DataTypes.DOUBLE),
      required: true,
    },
    status: {
      type: DataTypes.INTEGER,
      required: true,
      defaultValue: 0,
    },
    image: {
        type: DataTypes.CHAR(100),
        required: false,
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

export default koordinat;
