const express = require('express');
const cors = require('cors');

const docgiaRouter = require('./app/routes/docgia.route');
const nhanvienRouter = require('./app/routes/nhanvien.route');
const nxbRouter = require('./app/routes/nxb.route');
const sachRouter = require('./app/routes/sach.route');
const theodoiRouter = require('./app/routes/theodoi.route');

const ApiError = require('./app/api-error');

const app = express();
app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to libary book application' });
});

app.use("/api/docgia", docgiaRouter);
app.use("/api/nhanvien", nhanvienRouter);
app.use("/api/nxb", nxbRouter);
app.use("/api/sach", sachRouter);
app.use("/api/theodoi", theodoiRouter);

app.use((req, res, next) => {
    return next(new ApiError(404, 'Resource not found'));
});

app.use((err, req, res, next) => {
    return res.status(err.statusCode || 500).json({
        message: err.message || 'Internal Server Error',
    });
});

module.exports = app;
