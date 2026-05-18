export function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function findBestMatch(db, descriptor, threshold) {
  const people = db.prepare("SELECT name, descriptor_json FROM people").all();
  let best = null;
  let bestDist = Infinity;

  for (const p of people) {
    const ref = JSON.parse(p.descriptor_json);
    const d = euclideanDistance(descriptor, ref);
    if (d < bestDist) {
      bestDist = d;
      best = p.name;
    }
  }

  if (!best || bestDist > threshold) {
    return { match: false, distance: bestDist, threshold };
  }

  return { match: true, name: best, distance: bestDist, threshold };
}
