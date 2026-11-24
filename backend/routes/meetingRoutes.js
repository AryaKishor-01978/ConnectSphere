
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createMeeting,
  getMeetings,
  requestMeetingAccess,
  getMeetingRequests,
  reviewMeetingRequest
} = require("../controllers/meetingController");

// CREATE A NEW MEETING
router.post("/", authMiddleware, createMeeting);

// GET USER MEETING HISTORY
router.get("/", authMiddleware, getMeetings);

// REQUEST ACCESS TO A MEETING
router.post(
  "/:meetingId/request-access",
  authMiddleware,
  requestMeetingAccess
);

// GET ACCESS REQUESTS (HOST ONLY)
router.get(
  "/:meetingId/requests",
  authMiddleware,
  getMeetingRequests
);

// APPROVE OR REJECT ACCESS REQUEST
router.patch(
  "/:meetingId/requests/:userId",
  authMiddleware,
  reviewMeetingRequest
);

module.exports = router;
