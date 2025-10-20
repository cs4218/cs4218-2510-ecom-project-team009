import mongoose from "mongoose";
import colors from "colors";
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL, {
            maxPoolSize: 10, // Increased to 10 for reliable parallel E2E test execution with 3 workers
            minPoolSize: 2,
        });
        console.log(`Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
    }
};

export default connectDB;