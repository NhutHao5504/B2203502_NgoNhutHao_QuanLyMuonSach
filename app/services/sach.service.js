const { ObjectId } = require('mongodb');

class SachService {
    constructor(client) {
        this.client = client;
        this.Sach = client.db().collection('SACH');
        this.NXB = client.db().collection('NHAXUATBAN');
    }

    async extractSachData(payload) {
        const count = await this.Sach.countDocuments();
        const maS = payload.MASACH || `Sach${String(count + 1).padStart(3, '0')}`;
        const sach = {
            _id: payload._id,
            MASACH: maS,
            TENSACH: payload.TENSACH,
            DONGIA: payload.DONGIA,
            SOQUYEN: payload.SOQUYEN,
            NAMXUATBAN: payload.NAMXUATBAN,
            MANXB: payload.MANXB,
            TACGIA: payload.TACGIA,
            hinhAnh: payload.hinhAnh,

        };
        Object.keys(sach).forEach((key) => {
            if (sach[key] === undefined) delete sach[key];
        });
        return sach;
    }

    async create(payload) {
        const nxb = await this.NXB.findOne({ MANXB: payload.MANXB });
        if (!nxb) {
            throw new Error("Nhà xuất bản không tồn tại");
        }
        const sach = await this.extractSachData(payload);
        const result = await this.Sach.findOneAndUpdate(
            { MASACH: sach.MASACH },
            { $set: sach },
            { returnDocument: 'after', upsert: true }
        );
        return result;
    }

    async find(filter = {}) {
        const cursor = this.Sach.find(filter);
        return await cursor.toArray();
    }

    async findByName(name) {
        return await this.find({
            TENSACH: { $regex: new RegExp(name, 'i') }
        });
    }

    async findById(id) {
        try {
            const sach = await this.Sach.findOne({ _id: new ObjectId(id) });
            if (!sach) {
                throw new Error(`Không tìm thấy sách với ID: ${id}`);
            }
            return sach;
        } catch (error) {
            console.error('Lỗi khi tìm sách:', error);
            throw error;
        }
    }

    async update(id, payload) {
        if (payload._id) {
            delete payload._id;
        }

        const update = await this.extractSachData(payload);

        try {
            const result = await this.Sach.findOneAndUpdate(
            { _id: new ObjectId(id) }, 
            { $set: update }, 
            { returnDocument: 'after' }
            );

            if (!result) {
            throw new Error(`Không tìm thấy sách với ID=${id}`);
            }
            return result;
        } catch (error) {
            console.error("Chi tiết lỗi:", error);
            throw new Error(`Lỗi khi cập nhật sách với ID=${id}`);
        }
    }


    async delete(id) {
        const result = await this.Sach.findOneAndDelete({ _id: new ObjectId(id) });
        return result;
    }

    async deleteAll() {
        const result = await this.Sach.deleteMany({});
        return result.deletedCount;
    }
}

module.exports = SachService;