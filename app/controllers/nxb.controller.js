const NXBService = require('../services/nxb.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');

exports.create = async (req, res, next) => {
    if (!req.body?.TENNXB) {
        return next(new ApiError(400, 'Tên nhà xuất bản không được bỏ trống'));
    }

    try {
        const nxbService = new NXBService(MongoDB.client);
        const document = await nxbService.create(req.body);
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, 'Có lỗi xảy ra khi tạo nhà xuất bản'));
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const nxbService = new NXBService(MongoDB.client);
        const { TENNXB } = req.query;
        const documents = TENNXB
            ? await nxbService.findByName(TENNXB)
            : await nxbService.find({});
        return res.send(documents);
    } catch (error) {
        return next(new ApiError(500, 'Có lỗi xảy ra khi lấy danh sách nhà xuất bản'));
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const nxbService = new NXBService(MongoDB.client);
        const document = await nxbService.findById(req.params.id);

        if (!document) {
            return next(new ApiError(404, 'Không tìm thấy nhà xuất bản'));
        }
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, `Có lỗi xảy ra khi tìm nhà xuất bản ID: ${req.params.id}`));
    }
};

exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, 'Dữ liệu cập nhật không được để trống'));
    }

    try {
        const nxbService = new NXBService(MongoDB.client);
        const document = await nxbService.update(req.params.id, req.body);
        
        if (!document) {
            return next(new ApiError(404, 'Không tìm thấy nhà xuất bản để cập nhật'));
        }
        return res.send({ message: 'Nhà xuất bản được cập nhật thành công' });
    } catch (error) {
        return next(new ApiError(500, `Có lỗi xảy ra khi cập nhật nhà xuất bản ID: ${req.params.id}`));
    }
};

exports.delete = async (req, res, next) => {
    try {
        const nxbService = new NXBService(MongoDB.client);
        const document = await nxbService.delete(req.params.id);
        
        if (!document) {
            return next(new ApiError(404, 'Không tìm thấy nhà xuất bản để xoá'));
        }
        return res.send({ message: 'Nhà xuất bản được xoá thành công' });
    } catch (error) {
        return next(new ApiError(500, `Có lỗi xảy ra khi xoá nhà xuất bản ID: ${req.params.id}`));
    }
};

exports.deleteAll = async (req, res, next) => {
    try {
        const nxbService = new NXBService(MongoDB.client);
        const deletedCount = await nxbService.deleteAll();
        return res.send({ message: `${deletedCount} nhà xuất bản đã được xoá thành công` });
    } catch (error) {
        return next(new ApiError(500, 'Có lỗi xảy ra khi xoá tất cả nhà xuất bản'));
    }
};
