const { query, getDbStatus } = require('../config/db');

// In-memory fallback dataset for development without local PostgreSQL
let inMemoryTasks = [
  {
    id: 1,
    _id: 1,
    title: 'Connect PostgreSQL Database',
    description: 'Set DATABASE_URL in environment variables to link your managed PostgreSQL database',
    status: 'in-progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    _id: 2,
    title: 'Run PostgreSQL Migrations',
    description: 'Auto-creates the tasks table with schema constraints and indexes on startup',
    status: 'completed',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    _id: 3,
    title: 'Deploy PERN Stack Application',
    description: 'Deploy backend and PostgreSQL database directly to Render using render.yaml',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let nextId = 4;

// Helper to normalize task object for client
const formatTask = (row) => ({
  ...row,
  _id: row.id,
});

// @desc    Get all tasks with optional filtering, search, and sorting
// @route   GET /tasks
// @access  Public
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, search, sortBy = 'created_at', order = 'desc' } = req.query;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const conditions = [];
      const values = [];

      if (status) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
      }

      if (priority) {
        values.push(priority);
        conditions.push(`priority = $${values.length}`);
      }

      if (search) {
        values.push(`%${search}%`);
        conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const safeSort = ['created_at', 'due_date', 'title', 'priority'].includes(sortBy) ? sortBy : 'created_at';

      const sql = `
        SELECT 
          id, 
          title, 
          description, 
          status, 
          priority, 
          due_date AS "dueDate", 
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM tasks
        ${whereClause}
        ORDER BY ${safeSort} ${safeOrder}
      `;

      const result = await query(sql, values);
      const data = result.rows.map(formatTask);

      return res.status(200).json({
        success: true,
        count: data.length,
        storage: 'postgresql',
        data,
      });
    }

    // In-memory fallback
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
      return order.toLowerCase() === 'asc' ? valA - valB : valB - valA;
    });

    return res.status(200).json({
      success: true,
      count: filtered.length,
      storage: 'in-memory-fallback',
      message: 'Running in in-memory fallback. Connect PostgreSQL with DATABASE_URL.',
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /tasks/:id
// @access  Public
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const sql = `
        SELECT 
          id, 
          title, 
          description, 
          status, 
          priority, 
          due_date AS "dueDate", 
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM tasks
        WHERE id = $1
      `;
      const result = await query(sql, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
      }

      return res.status(200).json({ success: true, data: formatTask(result.rows[0]) });
    }

    const task = inMemoryTasks.find((t) => t.id.toString() === id.toString());
    if (!task) {
      return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /tasks
// @access  Public
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a task title' });
    }

    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const sql = `
        INSERT INTO tasks (title, description, status, priority, due_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          id, 
          title, 
          description, 
          status, 
          priority, 
          due_date AS "dueDate", 
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
      `;

      const values = [
        title.trim(),
        description ? description.trim() : '',
        status || 'todo',
        priority || 'medium',
        dueDate || null,
      ];

      const result = await query(sql, values);
      return res.status(201).json({ success: true, data: formatTask(result.rows[0]) });
    }

    const created = {
      id: nextId++,
      _id: nextId - 1,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
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
// @route   PUT /tasks/:id
// @access  Public
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate } = req.body;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const updates = [];
      const values = [];

      if (title !== undefined) {
        values.push(title.trim());
        updates.push(`title = $${values.length}`);
      }
      if (description !== undefined) {
        values.push(description.trim());
        updates.push(`description = $${values.length}`);
      }
      if (status !== undefined) {
        values.push(status);
        updates.push(`status = $${values.length}`);
      }
      if (priority !== undefined) {
        values.push(priority);
        updates.push(`priority = $${values.length}`);
      }
      if (dueDate !== undefined) {
        values.push(dueDate);
        updates.push(`due_date = $${values.length}`);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE tasks
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING 
          id, 
          title, 
          description, 
          status, 
          priority, 
          due_date AS "dueDate", 
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
      `;

      const result = await query(sql, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
      }

      return res.status(200).json({ success: true, data: formatTask(result.rows[0]) });
    }

    const index = inMemoryTasks.findIndex((t) => t.id.toString() === id.toString());
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
// @route   DELETE /tasks/:id
// @access  Public
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const sql = `DELETE FROM tasks WHERE id = $1 RETURNING id`;
      const result = await query(sql, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: `Task with id '${id}' not found` });
      }

      return res.status(200).json({ success: true, message: `Task '${id}' deleted successfully` });
    }

    const index = inMemoryTasks.findIndex((t) => t.id.toString() === id.toString());
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
// @route   GET /tasks/stats/summary
// @access  Public
const getTaskStats = async (req, res, next) => {
  try {
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const totalRes = await query(`SELECT COUNT(*) AS total FROM tasks`);
      const highRes = await query(`SELECT COUNT(*) AS count FROM tasks WHERE priority = 'high'`);
      const statusRes = await query(`SELECT status, COUNT(*) AS count FROM tasks GROUP BY status`);

      const breakdown = {
        todo: 0,
        'in-progress': 0,
        completed: 0,
      };

      statusRes.rows.forEach((r) => {
        if (breakdown[r.status] !== undefined) {
          breakdown[r.status] = parseInt(r.count, 10);
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          total: parseInt(totalRes.rows[0].total, 10),
          highPriority: parseInt(highRes.rows[0].count, 10),
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
