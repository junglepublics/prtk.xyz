# prtk.xyz

prateek shankar — portfolio of work.

A static copy of the Cargo site at prtk.xyz, taken on 15 October 2026 and served by GitHub Pages. Every page, image, video and font lives in this repository. Nothing loads from Cargo.

**It is locked with a password** (15 October 2026). Each page is encrypted with `tools/lock.mjs`, and the browser decrypts it once the password is typed. The images, video and fonts are not encrypted. The unlocked pages are not kept in this repository.

- Each page has two files: `index.html` for wider screens and `m.html` for screens 768px wide or less, matching Cargo's own phone layout. A short script in each file opens the right one.
- `media/` holds the images and the video. Images wider than 2400px were scaled down to 2400px, the most Cargo itself would serve to a reader.
- `fonts/` holds the Poppins files and Cargo's social icon font. `css/site.css` is the site's own stylesheet.
- The Google appointment button, Google Fonts and Font Awesome still load from their usual places.

To serve it at prtk.xyz, add a `CNAME` file containing `prtk.xyz` and point the domain's DNS at GitHub Pages.
