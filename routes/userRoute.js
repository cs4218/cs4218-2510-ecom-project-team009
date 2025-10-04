import express from "express";
import { GetNonAdminUsersController } from "../controllers/userController.js";

const router = express.Router();

router.get("/all-users", GetNonAdminUsersController);

export default router;