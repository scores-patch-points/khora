-- AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
CREATE TABLE shapes (id INTEGER PRIMARY KEY, name TEXT NOT NULL, r REAL);
CREATE VIEW big_shapes AS SELECT id, name FROM shapes WHERE r > 10;
CREATE INDEX idx_shapes_name ON shapes (name);
CREATE FUNCTION area(r REAL) RETURNS REAL AS $$ SELECT 3.14159 * r * r $$ LANGUAGE sql;
INSERT INTO shapes (name, r) VALUES ('c', 2.0);
SELECT s.name, area(s.r) FROM shapes s JOIN big_shapes b ON b.id = s.id;
