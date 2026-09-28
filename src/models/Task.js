const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'completed'],
        message: '{VALUE} is not a supported status (use todo, in-progress, or completed)',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: '{VALUE} is not a supported priority (use low, medium, or high)',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual / index helpers
taskSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
