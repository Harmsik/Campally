/**
 * Campally - Photo picker for the Post page
 * Lets a seller add up to 5 photos, pick the cover, and remove photos.
 * The first photo is the cover (shown on Home). Photos are shrunk before upload.
 * Use: <div id="photo-picker"></div>, then CampallyPhotos.getFiles() when posting.
 */
(function () {
  "use strict";

  var MAX = 5;
  var files = [];     // shrunk photos, first = cover
  var previews = [];  // preview addresses, same order as files
  var host = null;
  var input = null;

  var css =
    ".pp-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;margin-bottom:6px;}" +
    ".pp-tile{position:relative;width:96px;height:96px;border-radius:14px;overflow:hidden;background:#F0EDE6;border:1px solid #E5E0D8;}" +
    ".pp-tile img{width:100%;height:100%;object-fit:cover;display:block;}" +
    ".pp-cover{position:absolute;left:0;right:0;bottom:0;background:rgba(232,85,61,.92);color:#fff;font-size:10px;font-weight:800;text-align:center;padding:3px 0;letter-spacing:.3px;}" +
    ".pp-star{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;text-align:center;padding:3px 0;border:none;cursor:pointer;width:100%;}" +
    ".pp-x{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}" +
    ".pp-add{width:96px;height:96px;border-radius:14px;border:2px dashed #E8553D;background:#FFF5F3;color:#E8553D;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:12px;font-weight:700;cursor:pointer;}" +
    ".pp-add i{font-size:20px;}" +
    ".pp-hint{font-size:12px;color:#777;margin:2px 0 8px 0;line-height:1.5;}";

  function notify(msg, type) {
    if (window.showToast) window.showToast(msg, type || "error");
    else alert(msg);
  }

  // Shrink a photo so uploads are fast on mobile data
  function compress(file) {
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, 1000 / img.width);
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : null);
        }, "image/jpeg", 0.75);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function render() {
    host.innerHTML = "";

    var grid = document.createElement("div");
    grid.className = "pp-grid";

    files.forEach(function (_, i) {
      var tile = document.createElement("div");
      tile.className = "pp-tile";

      var im = document.createElement("img");
      im.src = previews[i];
      im.alt = "Photo " + (i + 1);
      tile.appendChild(im);

      var x = document.createElement("button");
      x.type = "button";
      x.className = "pp-x";
      x.setAttribute("aria-label", "Remove photo " + (i + 1));
      x.textContent = "\u00d7";
      x.addEventListener("click", function () {
        URL.revokeObjectURL(previews[i]);
        files.splice(i, 1);
        previews.splice(i, 1);
        render();
      });
      tile.appendChild(x);

      if (i === 0) {
        var cover = document.createElement("div");
        cover.className = "pp-cover";
        cover.textContent = "COVER";
        tile.appendChild(cover);
      } else {
        var star = document.createElement("button");
        star.type = "button";
        star.className = "pp-star";
        star.textContent = "Make cover";
        star.addEventListener("click", function () {
          files.unshift(files.splice(i, 1)[0]);
          previews.unshift(previews.splice(i, 1)[0]);
          render();
        });
        tile.appendChild(star);
      }
      grid.appendChild(tile);
    });

    if (files.length < MAX) {
      var add = document.createElement("button");
      add.type = "button";
      add.className = "pp-add";
      add.innerHTML = '<i class="fa-solid fa-camera"></i><span>' + (files.length ? "Add more" : "Add photos") + "</span>";
      add.addEventListener("click", function () { input.click(); });
      grid.appendChild(add);
    }

    var hint = document.createElement("div");
    hint.className = "pp-hint";
    hint.textContent = files.length
      ? files.length + " of " + MAX + " photos. The first photo is the cover people see on Home."
      : "Add up to " + MAX + " photos. Listings with several clear photos sell faster.";

    host.appendChild(grid);
    host.appendChild(hint);
    host.appendChild(input);
  }

  async function onPick() {
    var picked = Array.prototype.slice.call(input.files || []);
    input.value = ""; // lets the same photo be picked again later
    if (!picked.length) return;

    var room = MAX - files.length;
    if (picked.length > room) {
      notify("You can add up to " + MAX + " photos. Extra photos were skipped.", "info");
      picked = picked.slice(0, room);
    }

    var skipped = 0;
    for (var i = 0; i < picked.length; i++) {
      var small = await compress(picked[i]);
      if (small) {
        files.push(small);
        previews.push(URL.createObjectURL(small));
      } else {
        skipped++;
      }
    }
    if (skipped) notify(skipped + " photo(s) could not be read. Please use JPG or PNG pictures.", "error");
    render();
  }

  function init() {
    host = document.getElementById("photo-picker");
    if (!host) return;
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    input.addEventListener("change", onPick);
    render();
  }

  window.CampallyPhotos = {
    getFiles: function () { return files.slice(); },
    count: function () { return files.length; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
