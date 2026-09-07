// This file is the entry point for Vercel serverless functions
import app from '../app.js';
import connectDB from '../config/database.js';

export default async (req, res) => {
  await connectDB();
  return app(req, res);
};

