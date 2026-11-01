/**
 * Campally Bookstore - "Book details" panel on the Post page
 * Appears when the category is Academic (or when opened with ?book=1).
 * Collects: book type, level, condition, author, plus a "physical copies only" promise.
 * Post page calls CampallyBook.validate() and CampallyBook.fields().
 */
(function () {
  "use strict";

  var BANNED = /(\bpdf\b|\be-?books?\b|soft[ -]?copy|\bdownload|torrent|pirat|\bcracked\b|\bphotocopy|\bphotocopied|\bxerox)/i;

  var css =
    "#book-panel{background:linear-gradient(145deg,#EEF2FF,#F5F3FF);border:1.5px solid #C7D2FE;border-radius:16px;padding:14px;margin:6px 0 14px 0;}" +
    "#book-panel h4{margin:0 0 4px 0;font-size:14px;color:#1E1B4B;display:flex;align-items:center;gap:8px;}" +
    "#book-panel .bp-note{font-size:12px;color:#4B5563;line-height:1.5;margin:0 0 10px 0;}" +
    ".bp-types{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;}" +
    ".bp-type{background:#fff;border:1.5px solid #E0E7FF;border-radius:12px;padding:10px 4px;text-align:center;font-size:12px;font-weight:700;color:#312E81;cursor:pointer;font-family:inherit;}" +
    ".bp-type i{display:block;font-size:18px;margin-bottom:4px;color:#6366F1;}" +
    ".bp-type.on{background:#312E81;border-color:#312E81;color:#fff;box-shadow:0 6px 14px rgba(49,46,129,.28);}.bp-type.on i{color:#FCD34D;}" +
    "#book-panel label{font-size:12px;font-weight:700;color:#374151;display:block;margin:8px 0 4px 0;}" +
    "#book-panel select,#book-panel input[type=text]{width:100%;padding:11px 12px;border:1px solid #D6DAF5;border-radius:10px;font-size:14px;background:#fff;box-sizing:border-box;font-family:inherit;}" +
    ".bp-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}" +
    ".bp-promise{display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid #E0E7FF;border-radius:12px;padding:10px;margin-top:12px;font-size:12px;line-height:1.5;color:#374151;}" +
    ".bp-promise input{margin-top:3px;flex-shrink:0;}" +
    ".bp-nudge{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:linear-gradient(135deg,#1E1B4B,#312E81);color:#fff;border:none;border-radius:14px;padding:12px 14px;margin-bottom:14px;cursor:pointer;font-family:inherit;}" +
    ".bp-nudge b{display:block;font-size:13.5px;}.bp-nudge span{font-size:11.5px;color:#C7D2FE;}.bp-nudge i{font-size:20px;color:#FCD34D;}";

  var TYPES = [
    { v: "textbook", label: "Textbook", icon: "fa-book" },
    { v: "manual", label: "Manual / Handout", icon: "fa-book-open" },
    { v: "past_questions", label: "Past questions", icon: "fa-file-pen" }
  ];
  var chosenType = "";
  var panel, cat;

  function isAcademic() {
    if (!cat) return false;
    var o = cat.options[cat.selectedIndex];
    return !!(o && /academic/i.test(o.text));
  }

  function sync() {
    if (!panel) return;
    panel.style.display = isAcademic() ? "block" : "none";
  }

  function build() {
    cat = document.getElementById("category");
    var anchor = document.getElementById("course-code-container");
    if (!cat || !anchor) return;

    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    // A friendly shortcut at the top of the form
    var form = document.getElementById("listing-form");
    var nudge = document.createElement("button");
    nudge.type = "button";
    nudge.className = "bp-nudge";
    nudge.innerHTML = '<i class="fa-solid fa-book"></i><div><b>Selling a book or past questions?</b><span>Tap here to use the Bookstore form</span></div>';
    nudge.addEventListener("click", function () { selectAcademic(); panel.scrollIntoView({ behavior: "smooth", block: "center" }); });
    form.insertBefore(nudge, form.firstChild);

    panel = document.createElement("div");
    panel.id = "book-panel";
    panel.style.display = "none";
    panel.innerHTML =
      '<h4><i class="fa-solid fa-book" style="color:#6366F1;"></i> Bookstore details</h4>' +
      '<p class="bp-note">Campally Bookstore is for <strong>physical books and your own notes</strong>. No PDFs, soft copies or photocopies of textbooks.</p>' +
      '<div class="bp-types" id="bp-types"></div>' +
      '<div class="bp-row"><div><label for="bp-level">Level</label><select id="bp-level"><option value="">Choose</option><option>100L</option><option>200L</option><option>300L</option><option>400L</option><option>500L</option><option>Postgraduate</option><option>General</option></select></div>' +
      '<div><label for="bp-cond">Condition</label><select id="bp-cond"><option value="">Choose</option><option value="new">New</option><option value="like_new">Like new</option><option value="good">Good</option><option value="fair">Fair (some wear)</option></select></div></div>' +
      '<label for="bp-author">Author or edition (optional)</label><input type="text" id="bp-author" maxlength="80" placeholder="e.g. Stroud, 7th edition">' +
      '<label class="bp-promise"><input type="checkbox" id="bp-promise"><span>I promise this is a <strong>physical copy</strong> I own, or my own notes. It is not a pirated file or an illegal photocopy.</span></label>';
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);

    var holder = panel.querySelector("#bp-types");
    TYPES.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bp-type";
      b.setAttribute("data-v", t.v);
      b.innerHTML = '<i class="fa-solid ' + t.icon + '"></i>' + t.label;
      b.addEventListener("click", function () { setType(t.v); });
      holder.appendChild(b);
    });

    cat.addEventListener("change", sync);
    sync();

    // Opened from the Bookstore: ?book=1&type=textbook
    var q = new URLSearchParams(location.search);
    if (q.get("book")) {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (selectAcademic() || tries > 40) {
          clearInterval(t);
          var want = q.get("type");
          if (want) setType(want);
        }
      }, 150);
    }
  }

  function selectAcademic() {
    if (!cat) return false;
    for (var i = 0; i < cat.options.length; i++) {
      if (/academic/i.test(cat.options[i].text)) {
        cat.selectedIndex = i;
        cat.dispatchEvent(new Event("change"));
        sync();
        return true;
      }
    }
    return false;
  }

  function setType(v) {
    chosenType = v;
    Array.prototype.forEach.call(panel.querySelectorAll(".bp-type"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-v") === v);
    });
  }

  function active() { return panel && panel.style.display !== "none"; }

  window.CampallyBook = {
    isActive: active,
    fields: function () {
      if (!active()) return {};
      return {
        book_type: chosenType || null,
        book_level: document.getElementById("bp-level").value || null,
        book_condition: document.getElementById("bp-cond").value || null,
        book_author: (document.getElementById("bp-author").value || "").trim() || null
      };
    },
    // Returns a plain-language problem, or "" when everything is fine
    validate: function () {
      if (!active()) return "";
      if (!chosenType) return "Please choose what you are selling: Textbook, Manual or Past questions.";
      if (!document.getElementById("bp-level").value) return "Please choose the level (for example 100L).";
      if (!document.getElementById("bp-cond").value) return "Please choose the condition of the item.";
      var text = (document.getElementById("title").value || "") + " " + (document.getElementById("description").value || "");
      if (BANNED.test(text)) return "Campally Bookstore is for physical books and your own notes only. Please remove words like PDF, soft copy, download or photocopy.";
      if (!document.getElementById("bp-promise").checked) return "Please tick the box to confirm this is a physical copy or your own notes.";
      return "";
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
