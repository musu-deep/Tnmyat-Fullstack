-- Development hub: curated event calendar, moderated projects, attributed news.
CREATE TABLE development_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL CHECK(category IN ('international_day','conference','local_event','program')),
 event_date TEXT NOT NULL, end_date TEXT, recurring INTEGER NOT NULL DEFAULT 0 CHECK(recurring IN (0,1)),
 country TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL DEFAULT '',
 created_by INTEGER REFERENCES users(id), status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('pending','published','rejected')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_events_date ON development_events(event_date,status);
CREATE TABLE development_projects (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id),
 title TEXT NOT NULL, summary TEXT NOT NULL, category TEXT NOT NULL,
 entity_name TEXT NOT NULL DEFAULT '', country TEXT NOT NULL, city TEXT NOT NULL DEFAULT '',
 latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 beneficiaries INTEGER NOT NULL DEFAULT 0 CHECK(beneficiaries >= 0),
 budget REAL NOT NULL DEFAULT 0 CHECK(budget >= 0),
 stage TEXT NOT NULL DEFAULT 'planned' CHECK(stage IN ('planned','active','completed')),
 source_url TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected')),
 reviewed_by INTEGER REFERENCES users(id), reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_projects_status ON development_projects(status,category,country);
CREATE TABLE development_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id INTEGER NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, target_type TEXT NOT NULL, target_id INTEGER NOT NULL, reason TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_audit_time ON development_audit(id DESC);
CREATE TABLE development_news (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 headline TEXT NOT NULL, source_name TEXT NOT NULL, source_url TEXT NOT NULL,
 lane INTEGER NOT NULL DEFAULT 1 CHECK(lane IN (1,2)),
 category TEXT NOT NULL DEFAULT 'تنمية',
 published_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('pending','published','rejected')),
 created_by INTEGER REFERENCES users(id)
);
CREATE INDEX development_news_order ON development_news(status,published_at DESC);

-- Annual UN observances, curated from https://www.un.org/en/observances/list-days-weeks
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للتعليم','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-01-24',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للطاقة النظيفة','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-01-26',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للأراضي الرطبة','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-02-02',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للعدالة الاجتماعية','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-02-20',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للأحياء البرية','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-03-03',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للمرأة','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-03-08',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للغابات','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-03-21',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للمياه','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-03-22',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي لصفر نفايات','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-03-30',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي لأمنا الأرض','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-04-22',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للأسر','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-05-15',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للتنوع البيولوجي','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-05-22',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للبيئة','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-06-05',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للمحيطات','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-06-08',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي لمكافحة التصحر والجفاف','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-06-17',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للسكان','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-07-11',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي لنقاوة الهواء من أجل سماء زرقاء','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-09-07',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للسلام','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-09-21',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للمعلمين','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-10-05',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('يوم الأغذية العالمي','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-10-16',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للقضاء على الفقر','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-10-17',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للمدن','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-10-31',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم العالمي للعلم من أجل السلام والتنمية','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-11-10',1,'https://www.un.org/en/observances/list-days-weeks','published');
INSERT INTO development_events(title,description,category,event_date,recurring,source_url,status) VALUES('اليوم الدولي للأشخاص ذوي الإعاقة','مناسبة دولية رسمية ضمن تقويم الأمم المتحدة.','international_day','2026-12-03',1,'https://www.un.org/en/observances/list-days-weeks','published');

-- Initial verified editorial items (as of 2026-11-15); not a live news feed.
INSERT INTO development_news(headline,source_name,source_url,lane,category,published_at,status) VALUES('تقرير أممي يبرز تكامل التكيّف المناخي مع أهداف التنمية المستدامة','الأمم المتحدة — DESA','https://www.un.org/en/articles-by-property-w-date/81254',1,'المناخ والتنمية','2026-11-13','published');
INSERT INTO development_news(headline,source_name,source_url,lane,category,published_at,status) VALUES('أولويات عالمية جديدة لحماية مصداقية المعلومات المناخية في عصر الذكاء الاصطناعي','الأمم المتحدة','https://www.un.org/en/climatechange/press-materials',1,'المناخ والتقنية','2026-11-13','published');
INSERT INTO development_news(headline,source_name,source_url,lane,category,published_at,status) VALUES('دعوة أممية لاستمرار الاستثمار في أنظمة الإنذار المبكر بعد 2027','الأمم المتحدة','https://www.un.org/en/climatechange/press-materials',2,'الاستدامة','2026-11-11','published');
INSERT INTO development_news(headline,source_name,source_url,lane,category,published_at,status) VALUES('مؤتمر المناخ COP31 يناقش تمويل التكيف والعمل المناخي القابل للقياس','الجمعية العامة للأمم المتحدة','https://www.un.org/pga/81/documents/speeches/cop31-opening-11-november-2026/',2,'المؤتمرات','2026-11-11','published');
