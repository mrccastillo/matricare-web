const Appointment = require("../../models/User/Appointment");
const Notification = require("../../models/User/Notification");
const User = require("../../models/User/User");
const AppError = require("../../Utilities/appError");
const catchAsync = require("../../Utilities/catchAsync");

const formatAppointmentDate = (date) => {
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
};

// Get Appointment by Id
const appointment_get = catchAsync(async (req, res, next) => {
  const { id } = req.query;

  let appointment;
  if (id) {
    appointment = await Appointment.findOne({
      _id: req.query.id,
    }).populate("userId");
  } else {
    appointment = await Appointment.find().populate("userId");
  }

  if (!appointment) return next(new AppError("Appointment not found", 404));

  return res.status(200).json(appointment);
});

// Get Appointment by UserId
const appointment_user_get = catchAsync(async (req, res, next) => {
  const { userId } = req.query;

  const appointment = await Appointment.find(
    userId && { userId: userId }
  ).populate("userId");

  if (!appointment) return next(new AppError("Appointment not found", 404));

  return res.status(200).json(appointment);
});

// Create Appointment
const appointment_post = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return next(new AppError("User not found", 404));
  req.body.userId = user._id;
  const newAppointment = new Appointment(req.body);

  await newAppointment.save();

  const users = await User.find({ role: "Obgyne" });
  const recipientUserIds = users.map((user) => user._id);
  const newNotification = new Notification({
    senderName: "MatriCare",
    message: `You have a new appointment with ${
      req.body.patientName
    } on ${formatAppointmentDate(req.body.date)}`,
    category: "Appointment",
    recipientUserId: recipientUserIds,
  });

  await newNotification.save();

  return res
    .status(200)
    .json({ message: "Appointment Successfully Created", newAppointment });
});

// Update Appointment
const appointment_put = catchAsync(async (req, res, next) => {
  const { id, userId } = req.query;

  if (!id) return next(new AppError("Appointment identifier not found", 400));

  const updatedAppointment = await Appointment.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  if (!updatedAppointment) {
    return next(new AppError("Appointment not found", 404));
  }

  const user = await User.findById(userId);

  // Send Notification by Appointment Status
  if (updatedAppointment.status === "Confirmed") {
    const newNotification = new Notification({
      senderId: user._id,
      senderName: `${user.fullName}`,
      senderPhoneNumber: `${user.phoneNumber}`,
      message: `Your appointment scheduled on ${formatAppointmentDate(
        updatedAppointment.date
      )} has been confirmed!`,
      recipientUserId: updatedAppointment.userId,
      category: "Appointment",
    });

    await newNotification.save();
  } else if (updatedAppointment.status === "Cancelled") {
    const newNotification = new Notification({
      senderId: user._id,
      senderName: `${user.fullName}`,
      senderPhoneNumber: `${user.phoneNumber}`,
      message: `Your appointment scheduled on ${formatAppointmentDate(
        updatedAppointment.date
      )} has been cancelled.`,
      recipientUserId: updatedAppointment.userId,
    });

    await newNotification.save();
  } else if (updatedAppointment.status === "Rescheduled") {
    const newNotification = new Notification({
      senderId: user._id,
      senderName: `${user.fullName}`,
      senderPhoneNumber: `${user.phoneNumber}`,
      message: `The appointment has been moved. Please select another date and time that fits your schedule.`,
      recipientUserId: updatedAppointment.userId,
    });

    await newNotification.save();

    const users = await User.find({ role: "Assistant" }, "_id");
    const recipientUserIds = users.map((user) => user._id);
    await Notification.create({
      senderName: `MatriCare`,
      message: `There are changes in the Appointment. Look it up!`,
      recipientUserId: recipientUserIds,
    });
  }
  return res
    .status(200)
    .json({ message: "Appointment Updated Successfully", updatedAppointment });
});

// Delete Appointment
const appointment_delete = catchAsync(async (req, res, next) => {
  if (!req.query.id)
    return next(new AppError("Appointment identifier not found", 400));

  const deletedAppointment = await Appointment.findByIdAndDelete(req.query.id);

  if (!deletedAppointment)
    return next(new AppError("Appointment not found", 404));
  return res
    .status(200)
    .json({ message: "Appointment Successfully Deleted", deletedAppointment });
});

module.exports = {
  appointment_get,
  appointment_post,
  appointment_user_get,
  appointment_put,
  appointment_delete,
};
