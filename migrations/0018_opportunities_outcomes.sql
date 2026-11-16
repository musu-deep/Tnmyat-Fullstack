-- Opportunities, accountable organizations, project/group connections and measured outcomes.
CREATE TABLE development_organizations(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id),
 name TEXT NOT NULL,
 country TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '',
 website TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','verified','rejected')),
 reviewed_by INTEGER REFERENCES users(id),
 reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_organizations_owner ON development_organizations(owner_id,status);
CREATE TABLE project_organization_links(
 project_id INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
 organization_id INTEGER NOT NULL REFERENCES development_organizations(id) ON DELETE CASCADE,
 created_by INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(project_id,organization_id)
);
CREATE TABLE project_group_links(
 project_id INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
 group_id INTEGER NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
 requested_by INTEGER NOT NULL REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 decided_by INTEGER REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 decided_at TEXT,
 PRIMARY KEY(project_id,group_id)
);
CREATE TABLE development_opportunities(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id),
 project_id INTEGER REFERENCES development_projects(id) ON DELETE SET NULL,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 category TEXT NOT NULL,
 country TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL DEFAULT '',
 mode TEXT NOT NULL CHECK(mode IN ('remote','onsite','hybrid')),
 arrangement TEXT NOT NULL CHECK(arrangement IN ('volunteer','paid')),
 requirements TEXT NOT NULL DEFAULT '',
 hours_estimate INTEGER NOT NULL DEFAULT 0 CHECK(hours_estimate BETWEEN 0 AND 10000),
 capacity INTEGER NOT NULL DEFAULT 1 CHECK(capacity BETWEEN 1 AND 100000),
 deadline TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','closed')),
 reviewed_by INTEGER REFERENCES users(id),
 reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_opportunities_listing ON development_opportunities(status,category,deadline);
CREATE TABLE opportunity_applications(
 opportunity_id INTEGER NOT NULL REFERENCES development_opportunities(id) ON DELETE CASCADE,
 applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 note TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','withdrawn','completed')),
 applicant_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(applicant_confirmed IN (0,1)),
 owner_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(owner_confirmed IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(opportunity_id,applicant_id)
);
CREATE INDEX opportunity_applications_applicant ON opportunity_applications(applicant_id,status);
CREATE TABLE project_outcomes(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 project_id INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
 created_by INTEGER NOT NULL REFERENCES users(id),
 metric TEXT NOT NULL,
 unit TEXT NOT NULL,
 baseline REAL NOT NULL,
 observed REAL NOT NULL,
 measured_on TEXT NOT NULL,
 context TEXT NOT NULL DEFAULT '',
 evidence_url TEXT NOT NULL DEFAULT '',
 verification TEXT NOT NULL DEFAULT 'self_reported' CHECK(verification IN ('self_reported','reviewed')),
 reviewed_by INTEGER REFERENCES users(id),
 reviewed_at TEXT,
 review_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX project_outcomes_project ON project_outcomes(project_id,measured_on DESC);
CREATE TABLE development_work_audit(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_id INTEGER NOT NULL REFERENCES users(id),
 action TEXT NOT NULL,
 item_type TEXT NOT NULL,
 item_id INTEGER NOT NULL,
 detail TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_work_audit_recent ON development_work_audit(id DESC);
