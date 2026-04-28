const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, // Force IPv4, fixes 'querySrv ECONNREFUSED' for Node >= 18
      serverSelectionTimeoutMS: 5000, 
    });
    console.log(`MongoDB Connected to Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;