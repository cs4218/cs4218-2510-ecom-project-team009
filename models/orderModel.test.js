import mockingoose from "mockingoose";
import Order from "./orderModel.js";
import mongoose from "mongoose";

describe("Order Model", () => {
    beforeEach(() => {
        mockingoose.resetAll();
    });

    const cleanDoc = {
        _id: new mongoose.Types.ObjectId().toString(),
        products: [new mongoose.Types.ObjectId().toString()],
        payment: {},
        buyer: new mongoose.Types.ObjectId().toString(),
        status: "",
    };
    it("should return the mocked order on findOne", async () => {
        const _doc = { ...cleanDoc, status: "Processing", payment: { method: "card" } };

        mockingoose(Order).toReturn(_doc, "findOne");

        const found = await Order.findOne({ _id: _doc._id });
        expect(found._id.toString()).toBe(_doc._id);
        expect(found.status.toString()).toBe(_doc.status);
        expect(found.toObject().payment).toMatchObject(_doc.payment);
    });

    it("should return the mocked order on save", async () => {
        const _doc = { ...cleanDoc, status: "Not Process", payment: { method: "cash" } };

        mockingoose(Order).toReturn(_doc, "save");

        const order = new Order(_doc);
        const saved = await order.save();
        expect(saved._id.toString()).toBe(_doc._id);
        expect(saved.status.toString()).toBe(_doc.status);
        expect(saved.toObject().payment).toMatchObject(_doc.payment);
    });

    it("should fail validation for invalid status", async () => {
        const order = new Order({
            ...cleanDoc,
            status: "invalid_status",
        });

        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.status).toBeDefined();
    });
});