const SachService = require('../services/sach.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');

exports.create = async (req, res, next) => {
    if (!req.body?.TENSACH) {
        return next(new ApiError(400, 'Tên sách không được để trống'));
    }
    try {
            console.log("Dữ liệu nhận được từ client:", req.body);

        const sachService = new SachService(MongoDB.client);
        const document = await sachService.create(req.body);
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, 'Đã xảy ra lỗi khi tạo sách mới'));
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const { TENSACH } = req.query;
        const documents = TENSACH 
            ? await sachService.findByName(TENSACH)
            : await sachService.find();
        return res.send(documents);
    } catch (error) {
        return next(new ApiError(500, 'Đã xảy ra lỗi khi tìm kiếm sách'));
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const document = await sachService.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, 'Không tìm thấy sách'));
        }
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, `Lỗi khi tìm sách với ID=${req.params.id}`));
    }
};

exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, 'Dữ liệu cập nhật không được để trống'));
    }

    try {
        const sachService = new SachService(MongoDB.client);
        const document = await sachService.update(req.params.id, req.body);
        if (!document) {
            return next(new ApiError(404, 'Không tìm thấy sách để cập nhật'));
        }
        return res.send({ message: 'Sách được cập nhật thành công', document });
    } catch (error) {
        return next(new ApiError(500, `Lỗi khi cập nhật sách với ID=${req.params.id}`));
    }
};

exports.delete = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const document = await sachService.delete(req.params.id);
        if (!document) {
            return next(new ApiError(404, 'Không tìm thấy sách để xóa'));
        }
        return res.send({ message: 'Sách đã được xóa thành công', document });
    } catch (error) {
        return next(new ApiError(500, `Lỗi khi xóa sách với ID=${req.params.id}`));
    }
};

exports.deleteAll = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const deletedCount = await sachService.deleteAll();
        return res.send({ message: `${deletedCount} sách đã được xóa thành công` });
    } catch (error) {
        return next(new ApiError(500, 'Lỗi khi xóa tất cả sách'));
    }
};
