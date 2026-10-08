const express = require("express");

const CategoryController = require("../controller/CategoryController");

const verifyToken = require("../../../middlewares/verifyToken");

const router = express.Router();

//------------------------------------
// GET
//------------------------------------

router.get(
  "/",
  CategoryController.getAll
);

router.get(
  "/search",
  CategoryController.search
);

router.get(
  "/newest",
  CategoryController.newest
);

router.get(
  "/:id",
  CategoryController.getById
);

//------------------------------------
// POST
//------------------------------------

router.post(
  "/",
  verifyToken,
  CategoryController.create
);

//------------------------------------
// PUT
//------------------------------------

router.put(
  "/:id",
  verifyToken,
  CategoryController.update
);

//------------------------------------
// DELETE
//------------------------------------

router.delete(
  "/:id",
  verifyToken,
  CategoryController.delete
);

module.exports = router;