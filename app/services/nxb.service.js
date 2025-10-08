const { ObjectId } = require('mongodb');

class NXBService {
    constructor(client) {
        this.NXB = client.db().collection('NHAXUATBAN');
    }

    async extractNXBData(payload) {
        const count = await this.NXB.countDocuments();
        const maNhaXuatBan = payload.MANXB || `NXB${String(count + 1).padStart(3, '0')}`;
        const nxb = {
            _id: payload._id,
            MANXB: maNhaXuatBan,
            TENNXB: payload.TENNXB,
            DIACHI: payload.DIACHI,
        };

        Object.keys(nxb).forEach(
            (key) => nxb[key] === undefined && delete nxb[key]
        );
        return nxb;
    }

    async create(payload) {
        const nxb = await this.extractNXBData(payload);
        const result = await this.NXB.findOneAndUpdate(
            { MANXB: nxb.MANXB },
            { $set: nxb },
            { returnDocument: 'after', upsert: true }
        );
        return result;
    }

    async find(filter = {}) {
        const cursor = this.NXB.find(filter);
        return await cursor.toArray();
    }

    async findByName(name) {
        return await this.find({
            TENNXB: { $regex: new RegExp(name, 'i') }
        });
    }

    async findById(id) {
        try {
            const nxb = await this.NXB.findOne({ _id: new ObjectId(id) });
            if (!nxb) {
                throw new Error(`Không tìm thấy NXB với ID: ${id}`);
            }
            return nxb;
        } catch (error) {
            console.error('Lỗi khi tìm NXB:', error);
            throw error;
        }
    }

    async update(id, payload) {
        const filter = { _id: new ObjectId(id) };
        const update = await this.extractNXBData(payload);
        const result = await this.NXB.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: 'after' }
        );
        return result.value;
    }

    async delete(id) {
        const result = await this.NXB.findOneAndDelete({ _id: new ObjectId(id) });
        return result.value;
    }

    async deleteAll() {
        const result = await this.NXB.deleteMany({});
        return result.deletedCount;
    }
}

module.exports = NXBService;
