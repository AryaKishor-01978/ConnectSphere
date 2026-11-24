
const Meeting = require("../models/Meeting");
const User = require("../models/User");
const crypto = require("crypto");

// CREATE MEETING
const createMeeting = async (req, res) => {
  try {
    const meetingId = crypto.randomUUID().slice(0, 8);
    const userId = req.user.id;

    const meeting = await Meeting.create({
      meetingId,
      host: userId,
      participants: [
        {
          user: userId,
          role: "host"
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET USER MEETING HISTORY
const getMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.find({
      $or: [
        { host: userId },
        { "participants.user": userId }
      ]
    })
      .populate("host", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      meetings
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// REQUEST MEETING ACCESS
const requestMeetingAccess = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found"
      });
    }

    const isParticipant = meeting.participants.some(
      participant => participant.user.toString() === userId
    );

    if (isParticipant) {
      return res.status(200).json({
        success: true,
        status: "approved",
        message: "You already have access to this meeting"
      });
    }

    const existingRequest = meeting.accessRequests.find(
      request => request.user.toString() === userId
    );

    if (existingRequest?.status === "pending") {
      return res.status(200).json({
        success: true,
        status: "pending",
        message: "Your request is already pending"
      });
    }

    if (existingRequest) {
      existingRequest.status = "pending";
      existingRequest.requestedAt = new Date();
      existingRequest.reviewedAt = null;
    } else {
      meeting.accessRequests.push({
        user: userId,
        status: "pending"
      });
    }

    await meeting.save();

    res.status(200).json({
      success: true,
      status: "pending",
      message: "Access request sent to the meeting host"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET MEETING ACCESS REQUESTS (HOST ONLY)
const getMeetingRequests = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found"
      });
    }

    if (meeting.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the host can view access requests"
      });
    }

    await meeting.populate("accessRequests.user", "name email");

    res.status(200).json({
      success: true,
      requests: meeting.accessRequests
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// APPROVE OR REJECT ACCESS REQUEST (HOST ONLY)
const reviewMeetingRequest = async (req, res) => {
  try {
    const { meetingId, userId } = req.params;
    const { status } = req.body;
    const hostId = req.user.id;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected"
      });
    }

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found"
      });
    }

    if (meeting.host.toString() !== hostId) {
      return res.status(403).json({
        success: false,
        message: "Only the host can review requests"
      });
    }

    const accessRequest = meeting.accessRequests.find(
      request => request.user.toString() === userId
    );

    if (!accessRequest || accessRequest.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Pending access request not found"
      });
    }

    accessRequest.status = status;
    accessRequest.reviewedAt = new Date();

    if (status === "approved") {
      const alreadyParticipant = meeting.participants.some(
        participant => participant.user.toString() === userId
      );

      if (!alreadyParticipant) {
        meeting.participants.push({
          user: userId,
          role: "participant"
        });
      }
    }

    await meeting.save();

    res.status(200).json({
      success: true,
      message: `Meeting access ${status} successfully`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createMeeting,
  getMeetings,
  requestMeetingAccess,
  getMeetingRequests,
  reviewMeetingRequest
};
