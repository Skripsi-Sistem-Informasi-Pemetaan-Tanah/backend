import express from "express";
import { register, login, logout, getUser } from "../controllers/user.js";
import {
  editMap,
  addMap,
  deleteMap,
  getAllMaps,
  getMapById,
  getHistory,
  getValidator,
  getStatus
} from "../controllers/map.js";
import { validasiBerhasil, validasiDitolak, cekValidasi, addKomentar, addKomentarKoordinat, cekMapIDtoVerif } from "../controllers/validasi.js";
import { runValidation, validationRegister } from "../utils/validation.js";
import {
  totalRequest,
  pendingRequest,
  requestPerDay,
  verifiedRequest,
  monthlyRequestChange
} from "../controllers/dashboard.js";
import { taskTable } from "../controllers/request.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { refreshToken } from "../controllers/refreshToken.js";
//Mobile

import {
  checkConnectionDatabase, deleteUser, saveLahan, updateFotoPatokan, getAllLahan, getAllLahanbyUserId} from "../controllers/mobile.js"

const router = express.Router();

router.get("/users", getUser);
router.post("/register", register);
router.post("/login", login);
router.delete("/logout", logout);
router.get("/token", refreshToken);
// router.put('/forgotPassword', forgotPassword)
// router.put('/resetPassword/', resetPassword)

// router.post('/editMap', verifyToken(2), editMap);
// router.post('/addMap', verifyToken(2), addMap);
// router.delete('/deleteMap', verifyToken(2), deleteMap);
// router.get('/getMapById/:mapId', verifyToken(2), getMapById);
//
// router.post('/validasiBerhasil', verifyToken(2), validasiBerhasil);
// router.post('/validasiDitolak', verifyToken(2), validasiDitolak);
// router.post('/cekValidasi/:mapId', verifyToken(2), cekValidasi);
// router.get('/getAllMaps', verifyToken(2), getAllMaps);
// router.get('/getHistory', verifyToken(2), getHistory);
// router.get('/getStatus', verifyToken(2), getStatus);
//
// router.get('/totalRequest', verifyToken(2), totalRequest);
// router.get('/pendingRequest', verifyToken(2), pendingRequest);
// router.get('/requestPerDay', verifyToken(2), requestPerDay);
// router.get('/verifiedRequest', verifyToken(2), verifiedRequest);
// router.get('/monthlyRequestChange', verifyToken(2), monthlyRequestChange);
//
// router.get("/taskTable", verifyToken(2), taskTable);

router.post('/editMap', editMap);
router.post('/addMap', addMap);
router.delete('/deleteMap', deleteMap);
router.get('/getMapById/:mapId',  getMapById);
router.get('/getValidator/:mapId',  getValidator);
router.post('/validasiBerhasil',  validasiBerhasil);
router.post('/validasiDitolak', validasiDitolak);
router.post('/cekValidasi/:mapId', cekValidasi);
router.get('/getAllMaps',  getAllMaps);
router.get('/getHistory',  getHistory);
router.post('/addKomentar',  addKomentar);
router.post('/addKomentarKoordinat',  addKomentarKoordinat);
router.get('/cekMapIdtoVerif',  cekMapIDtoVerif);

router.get('/totalRequest', totalRequest);
router.get('/pendingRequest',  pendingRequest);
router.get('/requestPerDay', requestPerDay);
router.get('/verifiedRequest', verifiedRequest);
router.get('/monthlyRequestChange', monthlyRequestChange);

router.get("/taskTable", taskTable);
//Mobile
router.get('/checkConnectionDatabase', checkConnectionDatabase);
// router.post('/saveUser', saveUser);
// router.put('/updateField', updateUserField);
router.delete('/deleteUser/:id', deleteUser);
router.post('/saveLahan', saveLahan);
router.post('/updateFotoPatokan', updateFotoPatokan);
router.get('/getAllLahan', getAllLahan);
router.get('/getAllLahanbyUserId/:user_id', getAllLahanbyUserId);

export default router;

