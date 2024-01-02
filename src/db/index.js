import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";


const connectDB = async () => {
    try {
        
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`, 
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        console.log(`\n mongoDB connected !! DB Host :${connectionInstance.connection.host}`)

    } catch (error) {
        
        console.log("MONGODB CONNECTION ERROR", error);
        process.exit(1);
    }


}

export default connectDB;