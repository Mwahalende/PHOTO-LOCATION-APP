/*const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = 3000;

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/photoApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// Define Mongoose schema
const photoSchema = new mongoose.Schema({
  filename: String,
  latitude: String,
  longitude: String,
  placename: String,
  createdAt: { type: Date, default: Date.now }
});
const Photo = mongoose.model("Photo", photoSchema);

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected");
});

// Upload photo route
app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    const { latitude, longitude, placename } = req.body;
    const filename = req.file.filename;

    const newPhoto = new Photo({
      filename,
      latitude,
      longitude,
      placename
    });

    await newPhoto.save();

    // Emit real-time update to all clients
    io.emit("newPhoto", {
      filename,
      latitude,
      longitude,
      placename
    });

    res.json({
      message: "Photo uploaded successfully",
      filename,
      latitude,
      longitude,
      placename
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// API to fetch all photo records
app.get("/api/photos", async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });
    res.json(photos);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Could not retrieve photos" });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
*/


const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const cloudinary = require("cloudinary").v2;

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = 3000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: "drxvftof4",
  api_key: "872961783425164",
  api_secret: "KWEJ6SbPybty7YefACspZ-j-ym0",
});

// MongoDB Connection
mongoose.connect("mongodb+srv://user1:malafiki@leodb.5mf7q.mongodb.net/mediaz?retryWrites=true&w=majority&appName=leodb")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Mongoose Schema
const photoSchema = new mongoose.Schema({
  filename: String,         // Cloudinary URL
  latitude: String,
  longitude: String,
  placename: String,
  createdAt: { type: Date, default: Date.now }
});
const Photo = mongoose.model("Photo", photoSchema);

// Multer (Memory Storage for Cloudinary)
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected");
});

// Cloudinary Upload Helper
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "geo-photos" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
}

// POST /upload: Handle photo + metadata upload
app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    const { latitude, longitude, placename, timestamp } = req.body;
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

    // Upload image buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    // Create photo record
    const newPhoto = new Photo({
      filename: result.secure_url,
      latitude,
      longitude,
      placename,
      createdAt: timestamp ? new Date(timestamp) : Date.now()
    });

    await newPhoto.save();

    // Notify all connected clients
    io.emit("newPhoto", {
      filename: newPhoto.filename,
      latitude: newPhoto.latitude,
      longitude: newPhoto.longitude,
      placename: newPhoto.placename,
      createdAt: newPhoto.createdAt
    });

    res.json({
      message: "Photo uploaded successfully",
      filename: newPhoto.filename,
      latitude: newPhoto.latitude,
      longitude: newPhoto.longitude,
      placename: newPhoto.placename,
      createdAt: newPhoto.createdAt
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /api/photos: Return all photos (newest first)
app.get("/api/photos", async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    console.error("Fetch photos error:", error);
    res.status(500).json({ error: "Could not retrieve photos" });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
