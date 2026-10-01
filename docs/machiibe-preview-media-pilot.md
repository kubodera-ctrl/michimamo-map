# Preview rights-reviewed venue/place photo pilot

Purpose:
- prove that the Web list becomes useful when event artwork is unavailable but a rights-reviewed venue/place photo exists.
- do not treat venue/place photos as event artwork.

Pilot:
- Tokyo Joypolis entrance — CC BY 2.5
- Tokyo Skytree & Soramachi — CC BY-SA 4.0
- Sogo Yokohama — CC BY-SA 4.0

Operational rules:
- label venue photo as 会場イメージ.
- label place photo as 場所イメージ.
- detail view exposes attribution + license.
- current pilot binds media to explicit Preview event seed slugs.
- venue-name fuzzy matching is forbidden.
- unknown rights => skip to category_visual.
- display permission does not imply R2/SNS permission.
- although these licenses allow reuse, actual R2 caching and SNS publishing remain separate gates.
- no Production write from this file.

URL handling:
- display media uses the stable upload.wikimedia.org file URL.
- attribution/source continues to link to the Wikimedia Commons file-description page.
- license URL is stored separately.
