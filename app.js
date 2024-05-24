import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { database } from "./config/connection.js";
import router from "./routes/app.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import User from "./models/userModel.js";
import Map from "./models/mapModel.js";
import history from "./models/historyModel.js";
import koordinat from "./models/koordinatModel.js";


dotenv.config();
database();

const app = express();
const PORT = 5000;

// try {
//   await User.sync({ force: true });
// } catch (error) {
//   console.log(`error : ${error.message}`);
// }
// try {
//   await Map.sync({ force: true });
// } catch (error) {
//   console.log(`error : ${error.message}`);
// }
// try {
//   await history.sync({ force: true });
// } catch (error) {
//   console.log(`error : ${error.message}`);
// }
// try {
//   await koordinat.sync({ force: true });
// } catch (error) {
//   console.log(`error : ${error.message}`);
// }
app.use(cors({ credentials: true, origin: "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(cors({ credentials: true, origin: "http://127.0.0.1:5173" }));
app.use(router);

app.listen(PORT, () => console.log(`Server berjalan pada port: ${PORT}`));
