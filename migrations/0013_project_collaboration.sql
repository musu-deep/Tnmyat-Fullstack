-- Collaboration requests and scoped tasks for published member projects.
CREATE TABLE project_collaborators(
 project_id INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(project_id,user_id)
);
CREATE INDEX project_collaborators_member ON project_collaborators(user_id,status);
CREATE TABLE project_work_items(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 project_id INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 due_date TEXT,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
 assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
 created_by INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX project_work_items_project ON project_work_items(project_id,status);
