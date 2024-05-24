import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { utilMessage, utilData, utilError } from "../utils/message.js";

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return utilMessage(res, 401);
    const dataUser = await User.findAll({
      where: {
        refresh_token: refreshToken,
      },
    });
    if (!dataUser) return utilMessage(res, 403);
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) return utilMessage(res, 403);
        const userId = dataUser.user_id;
        const userUsername = dataUser.username;
        const userPassword = dataUser.password;
        const accessToken = jwt.sign(
          { userId, userUsername, userPassword },
          process.env.PRIVATE_KEY,
          { expiresIn: "300s" },
        );
        return utilData(res, 200, { accessToken });
      },
    );
  } catch (error) {
    console.log(error);
  }
};
