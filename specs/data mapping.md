# Data mappings

- 'data mapping.md' defines the field mappings between db documents and typescript objects, if they don't match.
- Fields on typescript objects are on the left, fields on db documents are on the right.
- Do the mapping in the API handlers.

## Series

id -> seriesId
name -> seriesName
cover -> coverUrl
genreId -> typesDetail.typeId
genre -> typesDetail.typeName