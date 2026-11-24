
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require("../middleware/authMiddleware");
const Meeting = require("../models/Meeting");
const SharedFile = require("../models/SharedFile");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = [
  ".pdf", ".doc", ".docx", ".txt",
  ".png", ".jpg", ".jpeg",
  ".ppt", ".pptx", ".xls", ".xlsx", ".zip"
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const extension =
      path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(new Error("File type is not allowed"));
    }

    cb(null, true);
  }
});

// CHECK MEETING MEMBERSHIP
const checkMeetingMembership = async (meetingId, userId) => {
  const meeting = await Meeting.findOne({ meetingId });

  if (!meeting) {
    return false;
  }

  const isHost = meeting.host.toString() === userId;

  const isParticipant = meeting.participants.some(
    participant =>
      participant.user.toString() === userId
  );

  return isHost || isParticipant;
};

// UPLOAD FILE
router.post(
  "/upload",
  authMiddleware,
  (req, res, next) => {
    upload.single("file")(req, res, error => {
      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "File size must be 10 MB or less"
              : error.message
        });
      }

      next();
    });
  },
  async (req, res) => {
    let savedFilePath = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a file"
        });
      }

      savedFilePath = req.file.path;

      const { meetingId } = req.body;

      if (
        typeof meetingId !== "string" ||
        !meetingId.trim() ||
        meetingId.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid meeting ID is required"
        });
      }

      // VERIFY MEETING MEMBERSHIP
      const isAuthorized = await checkMeetingMembership(
        meetingId,
        req.user.id
      );

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to upload files to this meeting"
        });
      }

      // SAVE FILE INFORMATION IN MONGODB
      const sharedFile = await SharedFile.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        meetingId,
        uploadedBy: req.user.id
      });

      const fileData = {
        filename: sharedFile.filename,
        originalName: sharedFile.originalName,
        size: sharedFile.size,
        meetingId: sharedFile.meetingId,
        uploadedBy: sharedFile.uploadedBy,
        uploadedAt: sharedFile.uploadedAt
      };

      // NOTIFY MEETING PARTICIPANTS
      const io = req.app.get("io");

      if (io) {
        io.to(meetingId).emit("file-shared", fileData);
      }

      return res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        file: fileData
      });

    } catch (error) {
      console.error("File upload error:", error);

      // REMOVE FILE IF DATABASE SAVE FAILED
      if (savedFilePath && fs.existsSync(savedFilePath)) {
        try {
          fs.unlinkSync(savedFilePath);
        } catch (cleanupError) {
          console.error("File cleanup error:", cleanupError);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Unable to upload file"
      });
    }
  }
);

// DOWNLOAD FILE
router.get(
  "/download/:filename",
  authMiddleware,
  async (req, res) => {
    try {
      const filename = path.basename(req.params.filename);

      // FIND FILE RECORD
      const sharedFile = await SharedFile.findOne({
        filename
      });

      if (!sharedFile) {
        return res.status(404).json({
          success: false,
          message: "File not found"
        });
      }

      // VERIFY MEETING MEMBERSHIP
      const isAuthorized = await checkMeetingMembership(
        sharedFile.meetingId,
        req.user.id
      );

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to download this file"
        });
      }

      const filePath = path.join(uploadDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: "File not found on server"
        });
      }

      return res.download(
        filePath,
        sharedFile.originalName
      );

    } catch (error) {
      console.error("File download error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to download file"
      });
    }
  }
);

module.exports = router;
