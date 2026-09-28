const Task = require('../models/Task');
const { getDbStatus } = require('../config/db');

// In-memory fallback dataset for instant zero-configuration local runs
let inMemoryTasks = [
  {
    _id: '65f1a1000000000000000001',
    title: 'Configure MongoDB Atlas Connection',
    description: 'Create a free MongoDB cluster on cloud.mongodb.com and add the connection string to MONGODB_URI',
    status: 'in-progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    tags: ['database', 'setup'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '65f1a1000000000000000002',
    title: 'Test REST API Endpoints',
    description: 'Verify GET, POST, PUT, DELETE operations via curl, Postman, or built-in UI',
    status: 'completed',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    tags: ['testing', 'qa'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '65f1a1000000000000000003',
    title: 'Deploy to Cloud (Render / Vercel)',
    description: 'Deploy this MERN backend to Render or Vercel using the included configuration files',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    tags: ['deployment', 'devops'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to generate IDs for in-memory fallback
const generateId = () => {
  return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 18);
};

// @desc    Get all tasks with optional filtering, search, and sorting
// @route   GET /api/tasks
// @access  Public
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const query = {};
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = order === 'asc' ? 1 : -1;

      const tasks = await Task.find(query).sort(sortOptions);
      return res.status(200).json({
        success: true,
        count: tasks.length,
        storage: 'mongodb',
        data: tasks,
      });
    }

    // In-memory fallback handling
    let filtered = [...inMemoryTasks];
    if (status) {
      filtered = filtered.filter((t) => t.status.toLowerCase() === status.toLowerCase());
    }
    if (priority) {
      filtered = filtered.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      const valA = new Date(a[sortBy] || a.createdAt).getTime();
      const valB = new Date(b[sortBy] || b.createdAt).getTime();
      return order === 'asc' ? valA - valB : valB - valA;
    });

    return res.status(200).json({
      success: true,
      count: filtered.length,
      storage: 'in-memory-fallback',
      message: 'Operating with in-memory fallback store. Set MONGODB_URI to use persistent MongoDB.',
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Public
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
      }
      return res.status(200).json({ success: true, data: task });
    }

    const task = inMemoryTasks.find((t) => t._id.toString() === id.toString());
    if (!task) {
      return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
    }
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Public
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a task title' });
    }

    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const newTask = await Task.create({
        title: title.trim(),
        description: description ? description.trim() : '',
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate || null,
        tags: Array.isArray(tags) ? tags : [],
      });
      return res.status(201).json({ success: true, data: newTask });
    }

    const created = {
      _id: generateId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryTasks.unshift(created);

    return res.status(201).json({
      success: true,
      storage: 'in-memory-fallback',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Public
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, tags } = req.body;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
      }

      if (title !== undefined) task.title = title.trim();
      if (description !== undefined) task.description = description.trim();
      if (status !== undefined) task.status = status;
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (tags !== undefined) task.tags = tags;

      const updated = await task.save();
      return res.status(200).json({ success: true, data: updated });
    }

    const index = inMemoryTasks.findIndex((t) => t._id.toString() === id.toString());
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
    }

    const existing = inMemoryTasks[index];
    const updated = {
      ...existing,
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? description.trim() : existing.description,
      status: status !== undefined ? status : existing.status,
      priority: priority !== undefined ? priority : existing.priority,
      dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
      tags: tags !== undefined ? tags : existing.tags,
      updatedAt: new Date().toISOString(),
    };

    inMemoryTasks[index] = updated;

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Public
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
      }
      await task.deleteOne();
      return res.status(200).json({ success: true, message: `Task '${id}' deleted successfully` });
    }

    const index = inMemoryTasks.findIndex((t) => t._id.toString() === id.toString());
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
    }

    inMemoryTasks.splice(index, 1);
    return res.status(200).json({ success: true, message: `Task '${id}' deleted successfully` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated task metrics
// @route   GET /api/tasks/stats/summary
// @access  Public
const getTaskStats = async (req, res, next) => {
  try {
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const stats = await Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const total = await Task.countDocuments();
      const highPriority = await Task.countDocuments({ priority: 'high' });

      const breakdown = {
        todo: 0,
        'in-progress': 0,
        completed: 0,
      };

      stats.forEach((s) => {
        if (breakdown[s._id] !== undefined) {
          breakdown[s._id] = s.count;
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          total,
          highPriority,
          breakdown,
        },
      });
    }

    // Fallback stats
    const total = inMemoryTasks.length;
    const highPriority = inMemoryTasks.filter((t) => t.priority === 'high').length;
    const breakdown = {
      todo: inMemoryTasks.filter((t) => t.status === 'todo').length,
      'in-progress': inMemoryTasks.filter((t) => t.status === 'in-progress').length,
      completed: inMemoryTasks.filter((t) => t.status === 'completed').length,
    };

    return res.status(200).json({
      success: true,
      data: {
        total,
        highPriority,
        breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
};
