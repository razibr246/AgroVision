-- Field boundaries in PostGIS, for when the app gets a database (today they live in the browser's demo state).
-- Mirrors the boundary object in src/engine/landgeom.js. Geometry is stored as WGS84 (EPSG:4326) and measured as
-- geography, so ST_Area / ST_Perimeter are geodesic on the ellipsoid, like the app's own numbers.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS parcel_boundary (
  id            bigserial PRIMARY KEY,
  parcel_id     text        NOT NULL,                       -- registry number, e.g. DHM-CH-0142
  geom          geometry(MultiPolygon, 4326) NOT NULL,      -- every corner and curve as given; Polygons stored as one-part MultiPolygons
  source        text        NOT NULL CHECK (source IN ('survey', 'gps', 'file', 'drawn')),
  taken_on      date,
  taken_by      text,                                       -- 'farmer', or the surveyor's name
  position_error_m numeric CHECK (position_error_m IS NULL OR position_error_m >= 0),
  note          text,                                       -- mouza / JL / dag number
  file_name     text,
  checked_on    date,                                       -- office check; NULL = not checked
  checked_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  current       boolean     NOT NULL DEFAULT true,          -- older versions are kept with current = false
  CONSTRAINT boundary_valid CHECK (ST_IsValid(geom))
);

CREATE UNIQUE INDEX IF NOT EXISTS parcel_boundary_current ON parcel_boundary (parcel_id) WHERE current;
CREATE INDEX IF NOT EXISTS parcel_boundary_geom ON parcel_boundary USING gist (geom);

-- "Verified" means surveyed AND checked by the office, the same rule as boundaryStatus() in the app.
CREATE OR REPLACE VIEW parcel_boundary_measured AS
SELECT
  parcel_id, source, taken_on, taken_by, position_error_m, note, checked_on,
  CASE WHEN source = 'survey' AND checked_on IS NOT NULL THEN 'verified'
       WHEN checked_on IS NOT NULL THEN 'checked'
       ELSE 'unverified' END                                   AS status,
  ST_Area(geom::geography)                                     AS area_m2,
  ST_Area(geom::geography) / 40.468564224                      AS area_decimal,   -- 1 decimal (shotok) = 435.6 sq ft
  ST_Area(geom::geography) / 66.8901888                        AS area_katha,     -- 720 sq ft
  ST_Area(geom::geography) / 1337.803776                       AS area_bigha,     -- 14,400 sq ft (standard bigha)
  ST_Area(geom::geography) / 4046.8564224                      AS area_acre,
  ST_Perimeter(geom::geography)                                AS perimeter_m,
  ST_NPoints(geom)                                             AS points,
  geom
FROM parcel_boundary
WHERE current;

-- Saving a boundary from the app's GeoJSON (Polygon or MultiPolygon):
--   UPDATE parcel_boundary SET current = false WHERE parcel_id = $1 AND current;
--   INSERT INTO parcel_boundary (parcel_id, geom, source, taken_on, taken_by, position_error_m, note, file_name)
--   VALUES ($1, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)), $3, $4, $5, $6, $7, $8);
-- Boundaries that overlap a neighbour (worth a look by the office):
--   SELECT a.parcel_id, b.parcel_id, ST_Area(ST_Intersection(a.geom, b.geom)::geography) AS overlap_m2
--   FROM parcel_boundary a JOIN parcel_boundary b ON a.parcel_id < b.parcel_id AND a.current AND b.current
--   WHERE ST_Intersects(a.geom, b.geom) AND ST_Area(ST_Intersection(a.geom, b.geom)::geography) > 1;
