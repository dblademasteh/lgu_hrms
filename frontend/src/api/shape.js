/**
 * Response-shape helpers.
 *
 * The API mixes two list conventions:
 *   - paged endpoints  -> `{ items, total, page, limit }`   (e.g. /employees)
 *   - unpaged endpoints -> a bare JSON array                (e.g. /users, /departments)
 *
 * Reading `.items` off a bare array silently yields `undefined`, which `?? []`
 * then turns into an empty list — an empty table that looks like "no data"
 * rather than a bug. These helpers normalise either shape to an array so callers
 * never have to know which convention the endpoint used.
 */

/** Coerce a paged or bare list payload to an array. */
export function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/** Resolve an axios response (or a raw payload) to a list array. */
export function listData(response) {
  return toArray(response?.data ?? response);
}
