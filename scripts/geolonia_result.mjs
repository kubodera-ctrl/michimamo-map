/** Keep text parsing accuracy separate from coordinate accuracy. */
export function geoloniaResult(address, result) {
  return {
    input: address,
    pref: result.pref ?? '',
    city: result.city ?? '',
    town: result.town ?? '',
    addr: result.addr ?? '',
    level: result.point?.level ?? null,
    normalization_level: result.level ?? null,
    lat: result.point?.lat ?? null,
    lon: result.point?.lng ?? null,
  };
}
