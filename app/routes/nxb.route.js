const express = require('express');
const nxb = require('../controllers/nxb.controller');

const router = express.Router();

router.route('/')
    .get(nxb.findAll)
    .post(nxb.create)
    .delete(nxb.deleteAll);

router.route('/:id')
    .get(nxb.findOne)
    .put(nxb.update)
    .delete(nxb.delete);

module.exports = router;
