import { g as getDefaultExportFromCjs, c as commonjsGlobal } from "./index-9YgEsp3W.js";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var dist = { exports: {} };
(function(module, exports$1) {
  !function(t, e) {
    module.exports = e();
  }("undefined" != typeof self ? self : commonjsGlobal, () => (() => {
    var t = { 0: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.mathRules = e2.createCleanMathEl = void 0;
      const o2 = r2(282);
      e2.createCleanMathEl = (t3, e3, r3, o3) => {
        const n = t3.createElement("math");
        if (n.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML"), n.setAttribute("display", o3 ? "block" : "inline"), n.setAttribute("data-latex", r3 || ""), null == e3 ? void 0 : e3.mathml) {
          const r4 = t3.createElement("div");
          r4.innerHTML = e3.mathml;
          const o4 = r4.querySelector("math");
          o4 && (n.innerHTML = o4.innerHTML);
        } else r3 && (n.textContent = r3);
        return n;
      }, e2.mathRules = [{ selector: o2.mathSelectors, element: "math", transform: (t3, r3) => {
        if (!function(t4) {
          return "classList" in t4 && "getAttribute" in t4 && "querySelector" in t4;
        }(t3)) return t3;
        const n = (0, o2.getMathMLFromElement)(t3), i = (0, o2.getBasicLatexFromElement)(t3), a = (0, o2.isBlockDisplay)(t3), s = (0, e2.createCleanMathEl)(r3, n, i, a);
        if (t3.parentElement) {
          t3.parentElement.querySelectorAll('\n					/* MathJax scripts and previews */\n					script[type^="math/"],\n					.MathJax_Preview,\n\n					/* External math library scripts */\n					script[type="text/javascript"][src*="mathjax"],\n					script[type="text/javascript"][src*="katex"]\n				').forEach((t4) => t4.remove());
        }
        return s;
      } }];
    }, 20: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.GrokExtractor = void 0;
      const o2 = r2(181);
      class n extends o2.ConversationExtractor {
        constructor(t3, e3) {
          super(t3, e3), this.messageContainerSelector = ".relative.group.flex.flex-col.justify-center.w-full", this.messageBubbles = t3.querySelectorAll(this.messageContainerSelector), this.footnotes = [], this.footnoteCounter = 0;
        }
        canExtract() {
          return !!this.messageBubbles && this.messageBubbles.length > 0;
        }
        extractMessages() {
          const t3 = [];
          return this.footnotes = [], this.footnoteCounter = 0, this.messageBubbles && 0 !== this.messageBubbles.length ? (this.messageBubbles.forEach((e3) => {
            var r3;
            const o3 = e3.classList.contains("items-end"), n2 = e3.classList.contains("items-start");
            if (!o3 && !n2) return;
            const i = e3.querySelector(".message-bubble");
            if (!i) return;
            let a = "", s = "", l = "";
            if (o3) a = i.textContent || "", s = "user", l = "You";
            else if (n2) {
              s = "assistant", l = "Grok";
              const t4 = i.cloneNode(true);
              null === (r3 = t4.querySelector(".relative.border.border-border-l1.bg-surface-base")) || void 0 === r3 || r3.remove(), a = t4.innerHTML, a = this.processFootnotes(a);
            }
            a.trim() && t3.push({ author: l, content: a.trim(), metadata: { role: s } });
          }), t3) : t3;
        }
        getFootnotes() {
          return this.footnotes;
        }
        getMetadata() {
          var t3;
          const e3 = this.getTitle(), r3 = (null === (t3 = this.messageBubbles) || void 0 === t3 ? void 0 : t3.length) || 0;
          return { title: e3, site: "Grok", url: this.url, messageCount: r3, description: `Grok conversation with ${r3} messages` };
        }
        getTitle() {
          var t3, e3;
          const r3 = null === (t3 = this.document.title) || void 0 === t3 ? void 0 : t3.trim();
          if (r3 && "Grok" !== r3 && !r3.startsWith("Grok by ")) return r3.replace(/\s-\s*Grok$/, "").trim();
          const o3 = this.document.querySelector(`${this.messageContainerSelector}.items-end`);
          if (o3) {
            const t4 = o3.querySelector(".message-bubble");
            if (t4) {
              const r4 = (null === (e3 = t4.textContent) || void 0 === e3 ? void 0 : e3.trim()) || "";
              return r4.length > 50 ? r4.slice(0, 50) + "..." : r4;
            }
          }
          return "Grok Conversation";
        }
        processFootnotes(t3) {
          return t3.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (t4, e3, r3) => {
            if (!e3 || e3.startsWith("#") || !e3.match(/^https?:\/\//i)) return t4;
            let o3;
            if (this.footnotes.find((t5) => t5.url === e3)) o3 = this.footnotes.findIndex((t5) => t5.url === e3) + 1;
            else {
              this.footnoteCounter++, o3 = this.footnoteCounter;
              let t5 = e3;
              try {
                const r4 = new URL(e3).hostname.replace(/^www\./, "");
                t5 = `<a href="${e3}" target="_blank" rel="noopener noreferrer">${r4}</a>`;
              } catch (r4) {
                t5 = `<a href="${e3}" target="_blank" rel="noopener noreferrer">${e3}</a>`, console.warn(`GrokExtractor: Could not parse URL for footnote: ${e3}`);
              }
              this.footnotes.push({ url: e3, text: t5 });
            }
            return `${r3}<sup id="fnref:${o3}" class="footnote-ref"><a href="#fn:${o3}" class="footnote-link">${o3}</a></sup>`;
          });
        }
      }
      e2.GrokExtractor = n;
    }, 181: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.ConversationExtractor = void 0;
      const o2 = r2(279), n = r2(628);
      class i extends o2.BaseExtractor {
        getFootnotes() {
          return [];
        }
        extract() {
          var t3;
          const e3 = this.extractMessages(), r3 = this.getMetadata(), o3 = this.getFootnotes(), i2 = this.createContentHtml(e3, o3), a = document.implementation.createHTMLDocument(), s = a.createElement("article");
          s.innerHTML = i2, a.body.appendChild(s);
          const l = new n.Defuddle(a).parse(), c = l.content;
          return { content: c, contentHtml: c, extractedContent: { messageCount: e3.length.toString() }, variables: { title: r3.title || "Conversation", site: r3.site, description: r3.description || `${r3.site} conversation with ${e3.length} messages`, wordCount: (null === (t3 = l.wordCount) || void 0 === t3 ? void 0 : t3.toString()) || "" } };
        }
        createContentHtml(t3, e3) {
          return `${t3.map((e4, r3) => {
            const o3 = e4.timestamp ? `<div class="message-timestamp">${e4.timestamp}</div>` : "", n2 = /<p[^>]*>[\s\S]*?<\/p>/i.test(e4.content) ? e4.content : `<p>${e4.content}</p>`, i2 = e4.metadata ? Object.entries(e4.metadata).map(([t4, e5]) => `data-${t4}="${e5}"`).join(" ") : "";
            return `
			<div class="message message-${e4.author.toLowerCase()}" ${i2}>
				<div class="message-header">
					<p class="message-author"><strong>${e4.author}</strong></p>
					${o3}
				</div>
				<div class="message-content">
					${n2}
				</div>
			</div>${r3 < t3.length - 1 ? "\n<hr>" : ""}`;
          }).join("\n").trim()}
${e3.length > 0 ? `
			<div id="footnotes">
				<ol>
					${e3.map((t4, e4) => `
						<li class="footnote" id="fn:${e4 + 1}">
							<p>
								<a href="${t4.url}" target="_blank">${t4.text}</a>&nbsp;<a href="#fnref:${e4 + 1}" class="footnote-backref">↩</a>
							</p>
						</li>
					`).join("")}
				</ol>
			</div>` : ""}`.trim();
        }
      }
      e2.ConversationExtractor = i;
    }, 248: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.TwitterExtractor = void 0;
      const o2 = r2(279);
      class n extends o2.BaseExtractor {
        constructor(t3, e3) {
          var r3;
          super(t3, e3), this.mainTweet = null, this.threadTweets = [];
          const o3 = t3.querySelector('[aria-label="Timeline: Conversation"]');
          if (!o3) {
            const e4 = t3.querySelector('article[data-testid="tweet"]');
            return void (e4 && (this.mainTweet = e4));
          }
          const n2 = Array.from(o3.querySelectorAll('article[data-testid="tweet"]')), i = null === (r3 = o3.querySelector("section, h2")) || void 0 === r3 ? void 0 : r3.parentElement;
          i && n2.forEach((t4, e4) => {
            if (i.compareDocumentPosition(t4) & Node.DOCUMENT_POSITION_FOLLOWING) return n2.splice(e4), false;
          }), this.mainTweet = n2[0] || null, this.threadTweets = n2.slice(1);
        }
        canExtract() {
          return !!this.mainTweet;
        }
        extract() {
          const t3 = this.extractTweet(this.mainTweet), e3 = this.threadTweets.map((t4) => this.extractTweet(t4)).join("\n<hr>\n"), r3 = `
			<div class="tweet-thread">
				<div class="main-tweet">
					${t3}
				</div>
				${e3 ? `
					<hr>
					<div class="thread-tweets">
						${e3}
					</div>
				` : ""}
			</div>
		`.trim(), o3 = this.getTweetId(), n2 = this.getTweetAuthor();
          return { content: r3, contentHtml: r3, extractedContent: { tweetId: o3, tweetAuthor: n2 }, variables: { title: `Thread by ${n2}`, author: n2, site: "X (Twitter)", description: this.createDescription(this.mainTweet) } };
        }
        formatTweetText(t3) {
          if (!t3) return "";
          const e3 = this.document.createElement("div");
          e3.innerHTML = t3, e3.querySelectorAll("a").forEach((t4) => {
            var e4;
            const r3 = (null === (e4 = t4.textContent) || void 0 === e4 ? void 0 : e4.trim()) || "";
            t4.replaceWith(r3);
          }), e3.querySelectorAll("span, div").forEach((t4) => {
            t4.replaceWith(...Array.from(t4.childNodes));
          });
          return e3.innerHTML.split("\n").map((t4) => t4.trim()).filter((t4) => t4).map((t4) => `<p>${t4}</p>`).join("\n");
        }
        extractTweet(t3) {
          var e3, r3, o3;
          if (!t3) return "";
          const n2 = t3.cloneNode(true);
          n2.querySelectorAll('img[src*="/emoji/"]').forEach((t4) => {
            if ("img" === t4.tagName.toLowerCase() && t4.getAttribute("alt")) {
              const e4 = t4.getAttribute("alt");
              e4 && t4.replaceWith(e4);
            }
          });
          const i = (null === (e3 = n2.querySelector('[data-testid="tweetText"]')) || void 0 === e3 ? void 0 : e3.innerHTML) || "", a = this.formatTweetText(i), s = this.extractImages(t3), l = this.extractUserInfo(t3), c = null === (o3 = null === (r3 = t3.querySelector('[aria-labelledby*="id__"]')) || void 0 === r3 ? void 0 : r3.querySelector('[data-testid="User-Name"]')) || void 0 === o3 ? void 0 : o3.closest('[aria-labelledby*="id__"]'), u = c ? this.extractTweet(c) : "";
          return `
			<div class="tweet">
				<div class="tweet-header">
					<span class="tweet-author"><strong>${l.fullName}</strong> <span class="tweet-handle">${l.handle}</span></span>
					${l.date ? `<a href="${l.permalink}" class="tweet-date">${l.date}</a>` : ""}
				</div>
				${a ? `<div class="tweet-text">${a}</div>` : ""}
				${s.length ? `
					<div class="tweet-media">
						${s.join("\n")}
					</div>
				` : ""}
				${u ? `
					<blockquote class="quoted-tweet">
						${u}
					</blockquote>
				` : ""}
			</div>
		`.trim();
        }
        extractUserInfo(t3) {
          var e3, r3, o3, n2, i, a, s, l, c;
          const u = t3.querySelector('[data-testid="User-Name"]');
          if (!u) return { fullName: "", handle: "", date: "", permalink: "" };
          const d = u.querySelectorAll("a");
          let m = (null === (r3 = null === (e3 = null == d ? void 0 : d[0]) || void 0 === e3 ? void 0 : e3.textContent) || void 0 === r3 ? void 0 : r3.trim()) || "", h = (null === (n2 = null === (o3 = null == d ? void 0 : d[1]) || void 0 === o3 ? void 0 : o3.textContent) || void 0 === n2 ? void 0 : n2.trim()) || "";
          m && h || (m = (null === (a = null === (i = u.querySelector('span[style*="color: rgb(15, 20, 25)"] span')) || void 0 === i ? void 0 : i.textContent) || void 0 === a ? void 0 : a.trim()) || "", h = (null === (l = null === (s = u.querySelector('span[style*="color: rgb(83, 100, 113)"]')) || void 0 === s ? void 0 : s.textContent) || void 0 === l ? void 0 : l.trim()) || "");
          const p = t3.querySelector("time"), g = (null == p ? void 0 : p.getAttribute("datetime")) || "";
          return { fullName: m, handle: h, date: g ? new Date(g).toISOString().split("T")[0] : "", permalink: (null === (c = null == p ? void 0 : p.closest("a")) || void 0 === c ? void 0 : c.href) || "" };
        }
        extractImages(t3) {
          var e3, r3;
          const o3 = ['[data-testid="tweetPhoto"]', '[data-testid="tweet-image"]', 'img[src*="media"]'], n2 = [], i = null === (r3 = null === (e3 = t3.querySelector('[aria-labelledby*="id__"]')) || void 0 === e3 ? void 0 : e3.querySelector('[data-testid="User-Name"]')) || void 0 === r3 ? void 0 : r3.closest('[aria-labelledby*="id__"]');
          for (const e4 of o3) {
            t3.querySelectorAll(e4).forEach((t4) => {
              var e5, r4;
              if (!(null == i ? void 0 : i.contains(t4)) && "img" === t4.tagName.toLowerCase() && t4.getAttribute("alt")) {
                const o4 = (null === (e5 = t4.getAttribute("src")) || void 0 === e5 ? void 0 : e5.replace(/&name=\w+$/, "&name=large")) || "", i2 = (null === (r4 = t4.getAttribute("alt")) || void 0 === r4 ? void 0 : r4.replace(/\s+/g, " ").trim()) || "";
                n2.push(`<img src="${o4}" alt="${i2}" />`);
              }
            });
          }
          return n2;
        }
        getTweetId() {
          const t3 = this.url.match(/status\/(\d+)/);
          return (null == t3 ? void 0 : t3[1]) || "";
        }
        getTweetAuthor() {
          var t3, e3, r3;
          const o3 = null === (t3 = this.mainTweet) || void 0 === t3 ? void 0 : t3.querySelector('[data-testid="User-Name"]'), n2 = null == o3 ? void 0 : o3.querySelectorAll("a"), i = (null === (r3 = null === (e3 = null == n2 ? void 0 : n2[1]) || void 0 === e3 ? void 0 : e3.textContent) || void 0 === r3 ? void 0 : r3.trim()) || "";
          return i.startsWith("@") ? i : `@${i}`;
        }
        createDescription(t3) {
          var e3;
          if (!t3) return "";
          return ((null === (e3 = t3.querySelector('[data-testid="tweetText"]')) || void 0 === e3 ? void 0 : e3.textContent) || "").trim().slice(0, 140).replace(/\s+/g, " ");
        }
      }
      e2.TwitterExtractor = n;
    }, 258: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.YoutubeExtractor = void 0;
      const o2 = r2(279);
      class n extends o2.BaseExtractor {
        constructor(t3, e3, r3) {
          super(t3, e3, r3), this.videoElement = t3.querySelector("video"), this.schemaOrgData = r3;
        }
        canExtract() {
          return true;
        }
        extract() {
          const t3 = this.getVideoData(), e3 = t3.description || "", r3 = this.formatDescription(e3), o3 = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${this.getVideoId()}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><br>${r3}`;
          return { content: o3, contentHtml: o3, extractedContent: { videoId: this.getVideoId(), author: t3.author || "" }, variables: { title: t3.name || "", author: t3.author || "", site: "YouTube", image: Array.isArray(t3.thumbnailUrl) && t3.thumbnailUrl[0] || "", published: t3.uploadDate, description: e3.slice(0, 200).trim() } };
        }
        formatDescription(t3) {
          return `<p>${t3.replace(/\n/g, "<br>")}</p>`;
        }
        getVideoData() {
          if (!this.schemaOrgData) return {};
          return (Array.isArray(this.schemaOrgData) ? this.schemaOrgData.find((t3) => "VideoObject" === t3["@type"]) : "VideoObject" === this.schemaOrgData["@type"] ? this.schemaOrgData : null) || {};
        }
        getVideoId() {
          const t3 = new URL(this.url);
          return "youtu.be" === t3.hostname ? t3.pathname.slice(1) : new URLSearchParams(t3.search).get("v") || "";
        }
      }
      e2.YoutubeExtractor = n;
    }, 279: (t2, e2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.BaseExtractor = void 0;
      e2.BaseExtractor = class {
        constructor(t3, e3, r2) {
          this.document = t3, this.url = e3, this.schemaOrgData = r2;
        }
      };
    }, 282: (t2, e2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.mathSelectors = e2.isBlockDisplay = e2.getBasicLatexFromElement = e2.getMathMLFromElement = void 0;
      e2.getMathMLFromElement = (t3) => {
        if ("math" === t3.tagName.toLowerCase()) {
          const e4 = "block" === t3.getAttribute("display");
          return { mathml: t3.outerHTML, latex: t3.getAttribute("alttext") || null, isBlock: e4 };
        }
        const e3 = t3.getAttribute("data-mathml");
        if (e3) {
          const t4 = document.createElement("div");
          t4.innerHTML = e3;
          const r3 = t4.querySelector("math");
          if (r3) {
            const t5 = "block" === r3.getAttribute("display");
            return { mathml: r3.outerHTML, latex: r3.getAttribute("alttext") || null, isBlock: t5 };
          }
        }
        const r2 = t3.querySelector(".MJX_Assistive_MathML, mjx-assistive-mml");
        if (r2) {
          const t4 = r2.querySelector("math");
          if (t4) {
            const e4 = t4.getAttribute("display"), o3 = r2.getAttribute("display"), n = "block" === e4 || "block" === o3;
            return { mathml: t4.outerHTML, latex: t4.getAttribute("alttext") || null, isBlock: n };
          }
        }
        const o2 = t3.querySelector(".katex-mathml math");
        return o2 ? { mathml: o2.outerHTML, latex: null, isBlock: false } : null;
      };
      e2.getBasicLatexFromElement = (t3) => {
        var e3, r2, o2;
        const n = t3.getAttribute("data-latex");
        if (n) return n;
        if ("img" === t3.tagName.toLowerCase() && t3.classList.contains("latex")) {
          const e4 = t3.getAttribute("alt");
          if (e4) return e4;
          const r3 = t3.getAttribute("src");
          if (r3) {
            const t4 = r3.match(/latex\.php\?latex=([^&]+)/);
            if (t4) return decodeURIComponent(t4[1]).replace(/\+/g, " ").replace(/%5C/g, "\\");
          }
        }
        const i = t3.querySelector('annotation[encoding="application/x-tex"]');
        if (null == i ? void 0 : i.textContent) return i.textContent.trim();
        if (t3.matches(".katex")) {
          const e4 = t3.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
          if (null == e4 ? void 0 : e4.textContent) return e4.textContent.trim();
        }
        if (t3.matches('script[type="math/tex"]') || t3.matches('script[type="math/tex; mode=display"]')) return (null === (e3 = t3.textContent) || void 0 === e3 ? void 0 : e3.trim()) || null;
        if (t3.parentElement) {
          const e4 = t3.parentElement.querySelector('script[type="math/tex"], script[type="math/tex; mode=display"]');
          if (e4) return (null === (r2 = e4.textContent) || void 0 === r2 ? void 0 : r2.trim()) || null;
        }
        return t3.getAttribute("alt") || (null === (o2 = t3.textContent) || void 0 === o2 ? void 0 : o2.trim()) || null;
      };
      e2.isBlockDisplay = (t3) => {
        if ("block" === t3.getAttribute("display")) return true;
        const e3 = t3.className.toLowerCase();
        if (e3.includes("display") || e3.includes("block")) return true;
        if (t3.closest('.katex-display, .MathJax_Display, [data-display="block"]')) return true;
        const r2 = t3.previousElementSibling;
        if ("p" === (null == r2 ? void 0 : r2.tagName.toLowerCase())) return true;
        if (t3.matches(".mwe-math-fallback-image-display")) return true;
        if (t3.matches(".katex")) return null !== t3.closest(".katex-display");
        if (t3.hasAttribute("display")) return "true" === t3.getAttribute("display");
        if (t3.matches('script[type="math/tex; mode=display"]')) return true;
        if (t3.hasAttribute("display")) return "true" === t3.getAttribute("display");
        const o2 = t3.closest("[display]");
        return !!o2 && "true" === o2.getAttribute("display");
      }, e2.mathSelectors = ['img.latex[src*="latex.php"]', "span.MathJax", "mjx-container", 'script[type="math/tex"]', 'script[type="math/tex; mode=display"]', '.MathJax_Preview + script[type="math/tex"]', ".MathJax_Display", ".MathJax_SVG", ".MathJax_MathML", ".mwe-math-element", ".mwe-math-fallback-image-inline", ".mwe-math-fallback-image-display", ".mwe-math-mathml-inline", ".mwe-math-mathml-display", ".katex", ".katex-display", ".katex-mathml", ".katex-html", "[data-katex]", 'script[type="math/katex"]', "math", "[data-math]", "[data-latex]", "[data-tex]", 'script[type^="math/"]', 'annotation[encoding="application/x-tex"]'].join(",");
    }, 397: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.ClaudeExtractor = void 0;
      const o2 = r2(181);
      class n extends o2.ConversationExtractor {
        constructor(t3, e3) {
          super(t3, e3), this.articles = t3.querySelectorAll('div[data-testid="user-message"], div[data-testid="assistant-message"], div.font-claude-message');
        }
        canExtract() {
          return !!this.articles && this.articles.length > 0;
        }
        extractMessages() {
          const t3 = [];
          return this.articles ? (this.articles.forEach((e3) => {
            let r3, o3;
            if (e3.hasAttribute("data-testid")) {
              if ("user-message" !== e3.getAttribute("data-testid")) return;
              r3 = "you", o3 = e3.innerHTML;
            } else {
              if (!e3.classList.contains("font-claude-message")) return;
              r3 = "assistant", o3 = e3.innerHTML;
            }
            o3 && t3.push({ author: "you" === r3 ? "You" : "Claude", content: o3.trim(), metadata: { role: r3 } });
          }), t3) : t3;
        }
        getMetadata() {
          const t3 = this.getTitle(), e3 = this.extractMessages();
          return { title: t3, site: "Claude", url: this.url, messageCount: e3.length, description: `Claude conversation with ${e3.length} messages` };
        }
        getTitle() {
          var t3, e3, r3, o3, n2;
          const i = null === (t3 = this.document.title) || void 0 === t3 ? void 0 : t3.trim();
          if (i && "Claude" !== i) return i.replace(/ - Claude$/, "");
          const a = null === (r3 = null === (e3 = this.document.querySelector("header .font-tiempos")) || void 0 === e3 ? void 0 : e3.textContent) || void 0 === r3 ? void 0 : r3.trim();
          if (a) return a;
          const s = null === (n2 = null === (o3 = this.articles) || void 0 === o3 ? void 0 : o3.item(0)) || void 0 === n2 ? void 0 : n2.querySelector('[data-testid="user-message"]');
          if (s) {
            const t4 = s.textContent || "";
            return t4.length > 50 ? t4.slice(0, 50) + "..." : t4;
          }
          return "Claude Conversation";
        }
      }
      e2.ClaudeExtractor = n;
    }, 458: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.HackerNewsExtractor = void 0;
      const o2 = r2(279);
      class n extends o2.BaseExtractor {
        constructor(t3, e3) {
          super(t3, e3), this.mainPost = t3.querySelector(".fatitem"), this.isCommentPage = this.detectCommentPage(), this.mainComment = this.isCommentPage ? this.findMainComment() : null;
        }
        detectCommentPage() {
          var t3;
          return !!(null === (t3 = this.mainPost) || void 0 === t3 ? void 0 : t3.querySelector('.navs a[href*="parent"]'));
        }
        findMainComment() {
          var t3;
          return (null === (t3 = this.mainPost) || void 0 === t3 ? void 0 : t3.querySelector(".comment")) || null;
        }
        canExtract() {
          return !!this.mainPost;
        }
        extract() {
          const t3 = this.getPostContent(), e3 = this.extractComments(), r3 = this.createContentHtml(t3, e3), o3 = this.getPostTitle(), n2 = this.getPostAuthor(), i = this.createDescription(), a = this.getPostDate();
          return { content: r3, contentHtml: r3, extractedContent: { postId: this.getPostId(), postAuthor: n2 }, variables: { title: o3, author: n2, site: "Hacker News", description: i, published: a } };
        }
        createContentHtml(t3, e3) {
          return `
			<div class="hackernews-post">
				<div class="post-content">
					${t3}
				</div>
				${e3 ? `
					<hr>
					<h2>Comments</h2>
					<div class="hackernews-comments">
						${e3}
					</div>
				` : ""}
			</div>
		`.trim();
        }
        getPostContent() {
          var t3, e3, r3, o3, n2, i;
          if (!this.mainPost) return "";
          if (this.isCommentPage && this.mainComment) {
            const i2 = (null === (t3 = this.mainComment.querySelector(".hnuser")) || void 0 === t3 ? void 0 : t3.textContent) || "[deleted]", a2 = (null === (e3 = this.mainComment.querySelector(".commtext")) || void 0 === e3 ? void 0 : e3.innerHTML) || "", s2 = this.mainComment.querySelector(".age"), l2 = ((null == s2 ? void 0 : s2.getAttribute("title")) || "").split("T")[0] || "", c2 = (null === (o3 = null === (r3 = this.mainComment.querySelector(".score")) || void 0 === r3 ? void 0 : r3.textContent) || void 0 === o3 ? void 0 : o3.trim()) || "", u = (null === (n2 = this.mainPost.querySelector('.navs a[href*="parent"]')) || void 0 === n2 ? void 0 : n2.getAttribute("href")) || "";
            return `
				<div class="comment main-comment">
					<div class="comment-metadata">
						<span class="comment-author"><strong>${i2}</strong></span> •
						<span class="comment-date">${l2}</span>
						${c2 ? ` • <span class="comment-points">${c2}</span>` : ""}
						${u ? ` • <a href="https://news.ycombinator.com/${u}" class="parent-link">parent</a>` : ""}
					</div>
					<div class="comment-content">${a2}</div>
				</div>
			`.trim();
          }
          const a = this.mainPost.querySelector("tr.athing"), s = (null == a || a.nextElementSibling, (null === (i = null == a ? void 0 : a.querySelector(".titleline a")) || void 0 === i ? void 0 : i.getAttribute("href")) || "");
          let l = "";
          s && (l += `<p><a href="${s}" target="_blank">${s}</a></p>`);
          const c = this.mainPost.querySelector(".toptext");
          return c && (l += `<div class="post-text">${c.innerHTML}</div>`), l;
        }
        extractComments() {
          const t3 = Array.from(this.document.querySelectorAll("tr.comtr"));
          return this.processComments(t3);
        }
        processComments(t3) {
          var e3, r3, o3, n2;
          let i = "";
          const a = /* @__PURE__ */ new Set();
          let s = -1, l = [];
          for (const c of t3) {
            const t4 = c.getAttribute("id");
            if (!t4 || a.has(t4)) continue;
            a.add(t4);
            const u = (null === (e3 = c.querySelector(".ind img")) || void 0 === e3 ? void 0 : e3.getAttribute("width")) || "0", d = parseInt(u) / 40, m = c.querySelector(".commtext"), h = (null === (r3 = c.querySelector(".hnuser")) || void 0 === r3 ? void 0 : r3.textContent) || "[deleted]", p = c.querySelector(".age"), g = (null === (n2 = null === (o3 = c.querySelector(".score")) || void 0 === o3 ? void 0 : o3.textContent) || void 0 === n2 ? void 0 : n2.trim()) || "";
            if (!m) continue;
            const f = `https://news.ycombinator.com/item?id=${t4}`, v = ((null == p ? void 0 : p.getAttribute("title")) || "").split("T")[0] || "";
            if (0 === d) {
              for (; l.length > 0; ) i += "</blockquote>", l.pop();
              i += "<blockquote>", l = [0], s = 0;
            } else if (d < s) for (; l.length > 0 && l[l.length - 1] >= d; ) i += "</blockquote>", l.pop();
            else d > s && (i += "<blockquote>", l.push(d));
            i += `<div class="comment">
	<div class="comment-metadata">
		<span class="comment-author"><strong>${h}</strong></span> •
		<a href="${f}" class="comment-link">${v}</a>
		${g ? ` • <span class="comment-points">${g}</span>` : ""}
	</div>
	<div class="comment-content">${m.innerHTML}</div>
</div>`, s = d;
          }
          for (; l.length > 0; ) i += "</blockquote>", l.pop();
          return i;
        }
        getPostId() {
          const t3 = this.url.match(/id=(\d+)/);
          return (null == t3 ? void 0 : t3[1]) || "";
        }
        getPostTitle() {
          var t3, e3, r3, o3, n2;
          if (this.isCommentPage && this.mainComment) {
            const r4 = (null === (t3 = this.mainComment.querySelector(".hnuser")) || void 0 === t3 ? void 0 : t3.textContent) || "[deleted]", o4 = (null === (e3 = this.mainComment.querySelector(".commtext")) || void 0 === e3 ? void 0 : e3.textContent) || "";
            return `Comment by ${r4}: ${o4.trim().slice(0, 50) + (o4.length > 50 ? "..." : "")}`;
          }
          return (null === (n2 = null === (o3 = null === (r3 = this.mainPost) || void 0 === r3 ? void 0 : r3.querySelector(".titleline")) || void 0 === o3 ? void 0 : o3.textContent) || void 0 === n2 ? void 0 : n2.trim()) || "";
        }
        getPostAuthor() {
          var t3, e3, r3;
          return (null === (r3 = null === (e3 = null === (t3 = this.mainPost) || void 0 === t3 ? void 0 : t3.querySelector(".hnuser")) || void 0 === e3 ? void 0 : e3.textContent) || void 0 === r3 ? void 0 : r3.trim()) || "";
        }
        createDescription() {
          const t3 = this.getPostTitle(), e3 = this.getPostAuthor();
          return this.isCommentPage ? `Comment by ${e3} on Hacker News` : `${t3} - by ${e3} on Hacker News`;
        }
        getPostDate() {
          if (!this.mainPost) return "";
          const t3 = this.mainPost.querySelector(".age");
          return ((null == t3 ? void 0 : t3.getAttribute("title")) || "").split("T")[0] || "";
        }
      }
      e2.HackerNewsExtractor = n;
    }, 552: (t2, e2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.isElement = function(t3) {
        return t3.nodeType === r2.ELEMENT_NODE;
      }, e2.isTextNode = function(t3) {
        return t3.nodeType === r2.TEXT_NODE;
      }, e2.isCommentNode = function(t3) {
        return t3.nodeType === r2.COMMENT_NODE;
      }, e2.getComputedStyle = function(t3) {
        const e3 = o2(t3.ownerDocument);
        return e3 ? e3.getComputedStyle(t3) : null;
      }, e2.getWindow = o2, e2.logDebug = function(t3, ...e3) {
        "undefined" != typeof window && window.defuddleDebug && console.log("Defuddle:", t3, ...e3);
      };
      const r2 = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 };
      function o2(t3) {
        return t3.defaultView ? t3.defaultView : t3.ownerWindow ? t3.ownerWindow : t3.window ? t3.window : null;
      }
    }, 588: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.GitHubExtractor = void 0;
      const o2 = r2(279);
      class n extends o2.BaseExtractor {
        canExtract() {
          return ['meta[name="expected-hostname"][content="github.com"]', 'meta[name="octolytics-url"]', 'meta[name="github-keyboard-shortcuts"]', ".js-header-wrapper", "#js-repo-pjax-container"].some((t3) => null !== this.document.querySelector(t3)) && Object.values({ issue: ['[data-testid="issue-metadata-sticky"]', '[data-testid="issue-title"]'] }).some((t3) => t3.some((t4) => null !== this.document.querySelector(t4)));
        }
        extract() {
          return this.extractIssue();
        }
        extractIssue() {
          const t3 = this.extractRepoInfo(), e3 = this.extractIssueNumber();
          let r3 = "";
          const o3 = this.document.querySelector('[data-testid="issue-viewer-issue-container"]');
          if (o3) {
            const t4 = this.extractAuthor(o3, ['a[data-testid="issue-body-header-author"]', ".IssueBodyHeaderAuthor-module__authorLoginLink--_S7aT", ".ActivityHeader-module__AuthorLink--iofTU", 'a[href*="/users/"][data-hovercard-url*="/users/"]', 'a[aria-label*="profile"]']), e4 = o3.querySelector("relative-time"), n3 = (null == e4 ? void 0 : e4.getAttribute("datetime")) || "", i2 = o3.querySelector('[data-testid="issue-body-viewer"] .markdown-body');
            if (i2) {
              const e5 = this.cleanBodyContent(i2);
              if (r3 += `<div class="issue-author"><strong>${t4}</strong>`, n3) {
                const t5 = new Date(n3);
                r3 += ` opened this issue on ${t5.toLocaleDateString()}`;
              }
              r3 += "</div>\n\n", r3 += `<div class="issue-body">${e5}</div>

`;
            }
          }
          const n2 = Array.from(this.document.querySelectorAll("[data-wrapper-timeline-id]")), i = /* @__PURE__ */ new Set();
          return n2.forEach((t4) => {
            const e4 = t4.querySelector(".react-issue-comment");
            if (!e4) return;
            const o4 = t4.getAttribute("data-wrapper-timeline-id");
            if (!o4 || i.has(o4)) return;
            i.add(o4);
            const n3 = this.extractAuthor(e4, [".ActivityHeader-module__AuthorLink--iofTU", 'a[data-testid="avatar-link"]', 'a[href^="/"][data-hovercard-url*="/users/"]']), a = e4.querySelector("relative-time"), s = (null == a ? void 0 : a.getAttribute("datetime")) || "", l = e4.querySelector(".markdown-body");
            if (l) {
              const t5 = this.cleanBodyContent(l);
              if (t5) {
                if (r3 += '<div class="comment">\n', r3 += `<div class="comment-header"><strong>${n3}</strong>`, s) {
                  const t6 = new Date(s);
                  r3 += ` commented on ${t6.toLocaleDateString()}`;
                }
                r3 += "</div>\n", r3 += `<div class="comment-body">${t5}</div>
`, r3 += "</div>\n\n";
              }
            }
          }), { content: r3, contentHtml: r3, extractedContent: { type: "issue", issueNumber: e3, repository: t3.repo, owner: t3.owner }, variables: { title: this.document.title, author: "", site: `GitHub - ${t3.owner}/${t3.repo}`, description: this.createDescription(r3) } };
        }
        extractAuthor(t3, e3) {
          for (const r3 of e3) {
            const e4 = t3.querySelector(r3);
            if (e4) {
              const t4 = e4.getAttribute("href");
              if (t4) {
                if (t4.startsWith("/")) return t4.substring(1);
                if (t4.includes("github.com/")) {
                  const e5 = t4.match(/github\.com\/([^\/\?#]+)/);
                  if (e5 && e5[1]) return e5[1];
                }
              }
            }
          }
          return "Unknown";
        }
        cleanBodyContent(t3) {
          const e3 = t3.cloneNode(true);
          return e3.querySelectorAll('button, [data-testid*="button"], [data-testid*="menu"]').forEach((t4) => t4.remove()), e3.querySelectorAll(".js-clipboard-copy, .zeroclipboard-container").forEach((t4) => t4.remove()), e3.innerHTML.trim();
        }
        extractIssueNumber() {
          var t3;
          const e3 = this.url.match(/\/(issues|pull)\/(\d+)/);
          if (e3) return e3[2];
          const r3 = this.document.querySelector("h1"), o3 = null === (t3 = null == r3 ? void 0 : r3.textContent) || void 0 === t3 ? void 0 : t3.match(/#(\d+)/);
          return o3 ? o3[1] : "";
        }
        extractRepoInfo() {
          const t3 = this.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (t3) return { owner: t3[1], repo: t3[2] };
          const e3 = this.document.title.match(/([^\/\s]+)\/([^\/\s]+)/);
          return e3 ? { owner: e3[1], repo: e3[2] } : { owner: "", repo: "" };
        }
        createDescription(t3) {
          var e3;
          if (!t3) return "";
          const r3 = this.document.createElement("div");
          return r3.innerHTML = t3, (null === (e3 = r3.textContent) || void 0 === e3 ? void 0 : e3.trim().slice(0, 140).replace(/\s+/g, " ")) || "";
        }
      }
      e2.GitHubExtractor = n;
    }, 608: (t2, e2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.MetadataExtractor = void 0;
      e2.MetadataExtractor = class {
        static extract(t3, e3, r2) {
          var o2, n;
          let i = "", a = "";
          try {
            if (a = (null === (o2 = t3.location) || void 0 === o2 ? void 0 : o2.href) || "", a || (a = this.getMetaContent(r2, "property", "og:url") || this.getMetaContent(r2, "property", "twitter:url") || this.getSchemaProperty(e3, "url") || this.getSchemaProperty(e3, "mainEntityOfPage.url") || this.getSchemaProperty(e3, "mainEntity.url") || this.getSchemaProperty(e3, "WebSite.url") || (null === (n = t3.querySelector('link[rel="canonical"]')) || void 0 === n ? void 0 : n.getAttribute("href")) || ""), a) try {
              i = new URL(a).hostname.replace(/^www\./, "");
            } catch (t4) {
              console.warn("Failed to parse URL:", t4);
            }
          } catch (e4) {
            const r3 = t3.querySelector("base[href]");
            if (r3) try {
              a = r3.getAttribute("href") || "", i = new URL(a).hostname.replace(/^www\./, "");
            } catch (t4) {
              console.warn("Failed to parse base URL:", t4);
            }
          }
          return { title: this.getTitle(t3, e3, r2), description: this.getDescription(t3, e3, r2), domain: i, favicon: this.getFavicon(t3, a, r2), image: this.getImage(t3, e3, r2), published: this.getPublished(t3, e3, r2), author: this.getAuthor(t3, e3, r2), site: this.getSite(t3, e3, r2), schemaOrgData: e3, wordCount: 0, parseTime: 0 };
        }
        static getAuthor(t3, e3, r2) {
          let o2;
          if (o2 = this.getMetaContent(r2, "name", "sailthru.author") || this.getMetaContent(r2, "property", "author") || this.getMetaContent(r2, "name", "author") || this.getMetaContent(r2, "name", "byl") || this.getMetaContent(r2, "name", "authorList"), o2) return o2;
          let n = this.getSchemaProperty(e3, "author.name") || this.getSchemaProperty(e3, "author.[].name");
          if (n) {
            const t4 = n.split(",").map((t5) => t5.trim().replace(/,$/, "").trim()).filter(Boolean);
            if (t4.length > 0) {
              let e4 = [...new Set(t4)];
              return e4.length > 10 && (e4 = e4.slice(0, 10)), e4.join(", ");
            }
          }
          const i = [];
          if (['[itemprop="author"]', ".author", '[href*="author"]', ".authors a"].forEach((e4) => {
            t3.querySelectorAll(e4).forEach((t4) => {
              var e5;
              (e5 = t4.textContent) && e5.split(",").forEach((t5) => {
                const e6 = t5.trim().replace(/,$/, "").trim(), r3 = e6.toLowerCase();
                e6 && "author" !== r3 && "authors" !== r3 && i.push(e6);
              });
            });
          }), i.length > 0) {
            let t4 = [...new Set(i.map((t5) => t5.trim()).filter(Boolean))];
            if (t4.length > 0) return t4.length > 10 && (t4 = t4.slice(0, 10)), t4.join(", ");
          }
          return o2 = this.getMetaContent(r2, "name", "copyright") || this.getSchemaProperty(e3, "copyrightHolder.name") || this.getMetaContent(r2, "property", "og:site_name") || this.getSchemaProperty(e3, "publisher.name") || this.getSchemaProperty(e3, "sourceOrganization.name") || this.getSchemaProperty(e3, "isPartOf.name") || this.getMetaContent(r2, "name", "twitter:creator") || this.getMetaContent(r2, "name", "application-name"), o2 || "";
        }
        static getSite(t3, e3, r2) {
          return this.getSchemaProperty(e3, "publisher.name") || this.getMetaContent(r2, "property", "og:site_name") || this.getSchemaProperty(e3, "WebSite.name") || this.getSchemaProperty(e3, "sourceOrganization.name") || this.getMetaContent(r2, "name", "copyright") || this.getSchemaProperty(e3, "copyrightHolder.name") || this.getSchemaProperty(e3, "isPartOf.name") || this.getMetaContent(r2, "name", "application-name") || this.getAuthor(t3, e3, r2) || "";
        }
        static getTitle(t3, e3, r2) {
          var o2, n;
          const i = this.getMetaContent(r2, "property", "og:title") || this.getMetaContent(r2, "name", "twitter:title") || this.getSchemaProperty(e3, "headline") || this.getMetaContent(r2, "name", "title") || this.getMetaContent(r2, "name", "sailthru.title") || (null === (n = null === (o2 = t3.querySelector("title")) || void 0 === o2 ? void 0 : o2.textContent) || void 0 === n ? void 0 : n.trim()) || "";
          return this.cleanTitle(i, this.getSite(t3, e3, r2));
        }
        static cleanTitle(t3, e3) {
          if (!t3 || !e3) return t3;
          const r2 = e3.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), o2 = [`\\s*[\\|\\-–—]\\s*${r2}\\s*$`, `^\\s*${r2}\\s*[\\|\\-–—]\\s*`];
          for (const e4 of o2) {
            const r3 = new RegExp(e4, "i");
            if (r3.test(t3)) {
              t3 = t3.replace(r3, "");
              break;
            }
          }
          return t3.trim();
        }
        static getDescription(t3, e3, r2) {
          return this.getMetaContent(r2, "name", "description") || this.getMetaContent(r2, "property", "description") || this.getMetaContent(r2, "property", "og:description") || this.getSchemaProperty(e3, "description") || this.getMetaContent(r2, "name", "twitter:description") || this.getMetaContent(r2, "name", "sailthru.description") || "";
        }
        static getImage(t3, e3, r2) {
          return this.getMetaContent(r2, "property", "og:image") || this.getMetaContent(r2, "name", "twitter:image") || this.getSchemaProperty(e3, "image.url") || this.getMetaContent(r2, "name", "sailthru.image.full") || "";
        }
        static getFavicon(t3, e3, r2) {
          var o2, n;
          const i = this.getMetaContent(r2, "property", "og:image:favicon");
          if (i) return i;
          const a = null === (o2 = t3.querySelector("link[rel='icon']")) || void 0 === o2 ? void 0 : o2.getAttribute("href");
          if (a) return a;
          const s = null === (n = t3.querySelector("link[rel='shortcut icon']")) || void 0 === n ? void 0 : n.getAttribute("href");
          if (s) return s;
          if (e3) try {
            return new URL("/favicon.ico", e3).href;
          } catch (t4) {
            console.warn("Failed to construct favicon URL:", t4);
          }
          return "";
        }
        static getPublished(t3, e3, r2) {
          var o2, n;
          return this.getSchemaProperty(e3, "datePublished") || this.getMetaContent(r2, "name", "publishDate") || this.getMetaContent(r2, "property", "article:published_time") || (null === (n = null === (o2 = t3.querySelector('abbr[itemprop="datePublished"]')) || void 0 === o2 ? void 0 : o2.title) || void 0 === n ? void 0 : n.trim()) || this.getTimeElement(t3) || this.getMetaContent(r2, "name", "sailthru.date") || "";
        }
        static getMetaContent(t3, e3, r2) {
          var o2, n;
          const i = t3.find((t4) => {
            const o3 = "name" === e3 ? t4.name : t4.property;
            return (null == o3 ? void 0 : o3.toLowerCase()) === r2.toLowerCase();
          });
          return i && null !== (n = null === (o2 = i.content) || void 0 === o2 ? void 0 : o2.trim()) && void 0 !== n ? n : "";
        }
        static getTimeElement(t3) {
          var e3, r2, o2, n;
          const i = Array.from(t3.querySelectorAll("time"))[0];
          return i && null !== (n = null !== (r2 = null === (e3 = i.getAttribute("datetime")) || void 0 === e3 ? void 0 : e3.trim()) && void 0 !== r2 ? r2 : null === (o2 = i.textContent) || void 0 === o2 ? void 0 : o2.trim()) && void 0 !== n ? n : "";
        }
        static getSchemaProperty(t3, e3, r2 = "") {
          if (!t3) return r2;
          const o2 = (t4, e4, r3, n = true) => {
            if ("string" == typeof t4) return 0 === e4.length ? [t4] : [];
            if (!t4 || "object" != typeof t4) return [];
            if (Array.isArray(t4)) {
              const i2 = e4[0];
              if (/^\\[\\d+\\]$/.test(i2)) {
                const a2 = parseInt(i2.slice(1, -1));
                return t4[a2] ? o2(t4[a2], e4.slice(1), r3, n) : [];
              }
              return 0 === e4.length && t4.every((t5) => "string" == typeof t5 || "number" == typeof t5) ? t4.map(String) : t4.flatMap((t5) => o2(t5, e4, r3, n));
            }
            const [i, ...a] = e4;
            if (!i) return "string" == typeof t4 ? [t4] : "object" == typeof t4 && t4.name ? [t4.name] : [];
            if (t4.hasOwnProperty(i)) return o2(t4[i], a, r3 ? `${r3}.${i}` : i, true);
            if (!n) {
              const n2 = [];
              for (const i2 in t4) if ("object" == typeof t4[i2]) {
                const a2 = o2(t4[i2], e4, r3 ? `${r3}.${i2}` : i2, false);
                n2.push(...a2);
              }
              if (n2.length > 0) return n2;
            }
            return [];
          };
          try {
            let n = o2(t3, e3.split("."), "", true);
            0 === n.length && (n = o2(t3, e3.split("."), "", false));
            return n.length > 0 ? n.filter(Boolean).join(", ") : r2;
          } catch (t4) {
            return console.error(`Error in getSchemaProperty for ${e3}:`, t4), r2;
          }
        }
      };
    }, 610: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.standardizeFootnotes = function(t3) {
        const e3 = t3.ownerDocument;
        if (!e3) return void console.warn("standardizeFootnotes: No document available");
        new n(e3).standardizeFootnotes(t3);
      };
      const o2 = r2(640);
      class n {
        constructor(t3) {
          this.doc = t3;
        }
        createFootnoteItem(t3, e3, r3) {
          const o3 = "string" == typeof e3 ? this.doc : e3.ownerDocument, n2 = o3.createElement("li");
          if (n2.className = "footnote", n2.id = `fn:${t3}`, "string" == typeof e3) {
            const t4 = o3.createElement("p");
            t4.innerHTML = e3, n2.appendChild(t4);
          } else {
            const t4 = Array.from(e3.querySelectorAll("p"));
            if (0 === t4.length) {
              const t5 = o3.createElement("p");
              t5.innerHTML = e3.innerHTML, n2.appendChild(t5);
            } else t4.forEach((t5) => {
              const e4 = o3.createElement("p");
              e4.innerHTML = t5.innerHTML, n2.appendChild(e4);
            });
          }
          const i = n2.querySelector("p:last-of-type") || n2;
          return r3.forEach((t4, e4) => {
            const n3 = o3.createElement("a");
            n3.href = `#${t4}`, n3.title = "return to article", n3.className = "footnote-backref", n3.innerHTML = "↩", e4 < r3.length - 1 && (n3.innerHTML += " "), i.appendChild(n3);
          }), n2;
        }
        collectFootnotes(t3) {
          const e3 = {};
          let r3 = 1;
          const n2 = /* @__PURE__ */ new Set();
          return t3.querySelectorAll(o2.FOOTNOTE_LIST_SELECTORS).forEach((t4) => {
            if (t4.matches('div.footnote[data-component-name="FootnoteToDOM"]')) {
              const o3 = t4.querySelector("a.footnote-number"), i = t4.querySelector(".footnote-content");
              if (o3 && i) {
                const t5 = o3.id.replace("footnote-", "").toLowerCase();
                t5 && !n2.has(t5) && (e3[r3] = { content: i, originalId: t5, refs: [] }, n2.add(t5), r3++);
              }
              return;
            }
            t4.querySelectorAll('li, div[role="listitem"]').forEach((t5) => {
              var o3, i, a, s;
              let l = "", c = null;
              const u = t5.querySelector(".citations");
              if (null === (o3 = null == u ? void 0 : u.id) || void 0 === o3 ? void 0 : o3.toLowerCase().startsWith("r")) {
                l = u.id.toLowerCase();
                const t6 = u.querySelector(".citation-content");
                t6 && (c = t6);
              } else {
                if (t5.id.toLowerCase().startsWith("bib.bib")) l = t5.id.replace("bib.bib", "").toLowerCase();
                else if (t5.id.toLowerCase().startsWith("fn:")) l = t5.id.replace("fn:", "").toLowerCase();
                else if (t5.id.toLowerCase().startsWith("fn")) l = t5.id.replace("fn", "").toLowerCase();
                else if (t5.hasAttribute("data-counter")) l = (null === (a = null === (i = t5.getAttribute("data-counter")) || void 0 === i ? void 0 : i.replace(/\.$/, "")) || void 0 === a ? void 0 : a.toLowerCase()) || "";
                else {
                  const e4 = null === (s = t5.id.split("/").pop()) || void 0 === s ? void 0 : s.match(/cite_note-(.+)/);
                  l = e4 ? e4[1].toLowerCase() : t5.id.toLowerCase();
                }
                c = t5;
              }
              l && !n2.has(l) && (e3[r3] = { content: c || t5, originalId: l, refs: [] }, n2.add(l), r3++);
            });
          }), e3;
        }
        findOuterFootnoteContainer(t3) {
          let e3 = t3, r3 = t3.parentElement;
          for (; r3 && ("span" === r3.tagName.toLowerCase() || "sup" === r3.tagName.toLowerCase()); ) e3 = r3, r3 = r3.parentElement;
          return e3;
        }
        createFootnoteReference(t3, e3) {
          const r3 = this.doc.createElement("sup");
          r3.id = e3;
          const o3 = this.doc.createElement("a");
          return o3.href = `#fn:${t3}`, o3.textContent = t3, r3.appendChild(o3), r3;
        }
        standardizeFootnotes(t3) {
          const e3 = this.collectFootnotes(t3), r3 = t3.querySelectorAll(o2.FOOTNOTE_INLINE_REFERENCES), n2 = /* @__PURE__ */ new Map();
          r3.forEach((t4) => {
            var r4, o3, i2, a2;
            if (!t4) return;
            let s = "";
            if (t4.matches('a[id^="ref-link"]')) s = (null === (r4 = t4.textContent) || void 0 === r4 ? void 0 : r4.trim()) || "";
            else if (t4.matches('a[role="doc-biblioref"]')) {
              const e4 = t4.getAttribute("data-xml-rid");
              if (e4) s = e4;
              else {
                const e5 = t4.getAttribute("href");
                (null == e5 ? void 0 : e5.startsWith("#core-R")) && (s = e5.replace("#core-", ""));
              }
            } else if (t4.matches("a.footnote-anchor, span.footnote-hovercard-target a")) {
              const e4 = (null === (o3 = t4.id) || void 0 === o3 ? void 0 : o3.replace("footnote-anchor-", "")) || "";
              e4 && (s = e4.toLowerCase());
            } else if (t4.matches("cite.ltx_cite")) {
              const e4 = t4.querySelector("a");
              if (e4) {
                const t5 = e4.getAttribute("href");
                if (t5) {
                  const e5 = null === (i2 = t5.split("/").pop()) || void 0 === i2 ? void 0 : i2.match(/bib\.bib(\d+)/);
                  e5 && (s = e5[1].toLowerCase());
                }
              }
            } else if (t4.matches("sup.reference")) {
              const e4 = t4.querySelectorAll("a");
              Array.from(e4).forEach((t5) => {
                var e5;
                const r5 = t5.getAttribute("href");
                if (r5) {
                  const t6 = null === (e5 = r5.split("/").pop()) || void 0 === e5 ? void 0 : e5.match(/(?:cite_note|cite_ref)-(.+)/);
                  t6 && (s = t6[1].toLowerCase());
                }
              });
            } else if (t4.matches('sup[id^="fnref:"]')) s = t4.id.replace("fnref:", "").toLowerCase();
            else if (t4.matches('sup[id^="fnr"]')) s = t4.id.replace("fnr", "").toLowerCase();
            else if (t4.matches("span.footnote-reference")) s = t4.getAttribute("data-footnote-id") || "";
            else if (t4.matches("span.footnote-link")) s = t4.getAttribute("data-footnote-id") || "", t4.getAttribute("data-footnote-content") || "";
            else if (t4.matches("a.citation")) s = (null === (a2 = t4.textContent) || void 0 === a2 ? void 0 : a2.trim()) || "", t4.getAttribute("href") || "";
            else if (t4.matches('a[id^="fnref"]')) s = t4.id.replace("fnref", "").toLowerCase();
            else {
              const e4 = t4.getAttribute("href");
              if (e4) {
                const t5 = e4.replace(/^[#]/, "");
                s = t5.toLowerCase();
              }
            }
            if (s) {
              const r5 = Object.entries(e3).find(([t5, e4]) => e4.originalId === s.toLowerCase());
              if (r5) {
                const [e4, o4] = r5, i3 = o4.refs.length > 0 ? `fnref:${e4}-${o4.refs.length + 1}` : `fnref:${e4}`;
                o4.refs.push(i3);
                const a3 = this.findOuterFootnoteContainer(t4);
                if ("sup" === a3.tagName.toLowerCase()) {
                  n2.has(a3) || n2.set(a3, []);
                  n2.get(a3).push(this.createFootnoteReference(e4, i3));
                } else a3.replaceWith(this.createFootnoteReference(e4, i3));
              }
            }
          }), n2.forEach((t4, e4) => {
            if (t4.length > 0) {
              const r4 = this.doc.createDocumentFragment();
              t4.forEach((t5) => {
                const e5 = t5.querySelector("a");
                if (e5) {
                  const o3 = this.doc.createElement("sup");
                  o3.id = t5.id, o3.appendChild(e5.cloneNode(true)), r4.appendChild(o3);
                }
              }), e4.replaceWith(r4);
            }
          });
          const i = this.doc.createElement("div");
          i.id = "footnotes";
          const a = this.doc.createElement("ol");
          Object.entries(e3).forEach(([t4, e4]) => {
            const r4 = this.createFootnoteItem(parseInt(t4), e4.content, e4.refs);
            a.appendChild(r4);
          });
          t3.querySelectorAll(o2.FOOTNOTE_LIST_SELECTORS).forEach((t4) => t4.remove()), a.children.length > 0 && (i.appendChild(a), t3.appendChild(i));
        }
      }
    }, 628: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.Defuddle = void 0;
      const o2 = r2(608), n = r2(917), i = r2(640), a = r2(840), s = r2(968), l = r2(552);
      e2.Defuddle = class {
        constructor(t3, e3 = {}) {
          this.doc = t3, this.options = e3, this.debug = e3.debug || false;
        }
        parse() {
          const t3 = this.parseInternal();
          if (t3.wordCount < 200) {
            console.log("Initial parse returned very little content, trying again");
            const e3 = this.parseInternal({ removePartialSelectors: false });
            if (e3.wordCount > t3.wordCount) return this._log("Retry produced more content"), e3;
          }
          return t3;
        }
        parseInternal(t3 = {}) {
          var e3, r3, i2;
          const l2 = Date.now(), c = Object.assign(Object.assign({ removeExactSelectors: true, removePartialSelectors: true }, this.options), t3), u = this._extractSchemaOrgData(this.doc), d = [];
          this.doc.querySelectorAll("meta").forEach((t4) => {
            const e4 = t4.getAttribute("name"), r4 = t4.getAttribute("property");
            let o3 = t4.getAttribute("content");
            o3 && d.push({ name: e4, property: r4, content: this._decodeHTMLEntities(o3) });
          });
          const m = o2.MetadataExtractor.extract(this.doc, u, d);
          c.removeImages && this.removeImages(this.doc);
          try {
            const t4 = c.url || this.doc.URL, o3 = n.ExtractorRegistry.findExtractor(this.doc, t4, u);
            if (o3 && o3.canExtract()) {
              const t5 = o3.extract(), n2 = Date.now();
              return { content: t5.contentHtml, title: (null === (e3 = t5.variables) || void 0 === e3 ? void 0 : e3.title) || m.title, description: m.description, domain: m.domain, favicon: m.favicon, image: m.image, published: (null === (r3 = t5.variables) || void 0 === r3 ? void 0 : r3.published) || m.published, author: (null === (i2 = t5.variables) || void 0 === i2 ? void 0 : i2.author) || m.author, site: m.site, schemaOrgData: m.schemaOrgData, wordCount: this.countWords(t5.contentHtml), parseTime: Math.round(n2 - l2), extractorType: o3.constructor.name.replace("Extractor", "").toLowerCase(), metaTags: d };
            }
            const h = this._evaluateMediaQueries(this.doc), p = this.findSmallImages(this.doc), g = this.doc.cloneNode(true);
            this.applyMobileStyles(g, h);
            const f = this.findMainContent(g);
            if (!f) {
              const t5 = Date.now();
              return Object.assign(Object.assign({ content: this.doc.body.innerHTML }, m), { wordCount: this.countWords(this.doc.body.innerHTML), parseTime: Math.round(t5 - l2), metaTags: d });
            }
            this.removeSmallImages(g, p), this.removeHiddenElements(g), s.ContentScorer.scoreAndRemove(g, this.debug), (c.removeExactSelectors || c.removePartialSelectors) && this.removeBySelector(g, c.removeExactSelectors, c.removePartialSelectors), (0, a.standardizeContent)(f, m, this.doc, this.debug);
            const v = f.outerHTML, b = Date.now();
            return Object.assign(Object.assign({ content: v }, m), { wordCount: this.countWords(v), parseTime: Math.round(b - l2), metaTags: d });
          } catch (t4) {
            console.error("Defuddle", "Error processing document:", t4);
            const e4 = Date.now();
            return Object.assign(Object.assign({ content: this.doc.body.innerHTML }, m), { wordCount: this.countWords(this.doc.body.innerHTML), parseTime: Math.round(e4 - l2), metaTags: d });
          }
        }
        countWords(t3) {
          const e3 = this.doc.createElement("div");
          e3.innerHTML = t3;
          return (e3.textContent || "").trim().replace(/\s+/g, " ").split(" ").filter((t4) => t4.length > 0).length;
        }
        _log(...t3) {
          this.debug && console.log("Defuddle:", ...t3);
        }
        _evaluateMediaQueries(t3) {
          const e3 = [], r3 = /max-width[^:]*:\s*(\d+)/;
          try {
            const o3 = Array.from(t3.styleSheets).filter((t4) => {
              try {
                return t4.cssRules, true;
              } catch (t5) {
                return t5 instanceof DOMException && t5.name, false;
              }
            });
            o3.flatMap((t4) => {
              try {
                return "undefined" == typeof CSSMediaRule ? [] : Array.from(t4.cssRules).filter((t5) => t5 instanceof CSSMediaRule && t5.conditionText.includes("max-width"));
              } catch (t5) {
                return this.debug && console.warn("Defuddle: Failed to process stylesheet:", t5), [];
              }
            }).forEach((t4) => {
              const o4 = t4.conditionText.match(r3);
              if (o4) {
                const r4 = parseInt(o4[1]);
                if (i.MOBILE_WIDTH <= r4) {
                  Array.from(t4.cssRules).filter((t5) => t5 instanceof CSSStyleRule).forEach((t5) => {
                    try {
                      e3.push({ selector: t5.selectorText, styles: t5.style.cssText });
                    } catch (t6) {
                      this.debug && console.warn("Defuddle: Failed to process CSS rule:", t6);
                    }
                  });
                }
              }
            });
          } catch (t4) {
            console.error("Defuddle: Error evaluating media queries:", t4);
          }
          return e3;
        }
        applyMobileStyles(t3, e3) {
          e3.forEach(({ selector: e4, styles: r3 }) => {
            try {
              t3.querySelectorAll(e4).forEach((t4) => {
                t4.setAttribute("style", (t4.getAttribute("style") || "") + r3);
              });
            } catch (t4) {
              console.error("Defuddle", "Error applying styles for selector:", e4, t4);
            }
          });
        }
        removeImages(t3) {
          const e3 = t3.getElementsByTagName("img");
          Array.from(e3).forEach((t4) => {
            t4.remove();
          });
        }
        removeHiddenElements(t3) {
          let e3 = 0;
          const r3 = /* @__PURE__ */ new Set(), o3 = Array.from(t3.getElementsByTagName("*"));
          for (let n2 = 0; n2 < o3.length; n2 += 100) {
            const i2 = o3.slice(n2, n2 + 100), a2 = i2.map((e4) => {
              var r4, o4;
              try {
                return null === (r4 = e4.ownerDocument.defaultView) || void 0 === r4 ? void 0 : r4.getComputedStyle(e4);
              } catch (r5) {
                const n3 = e4.getAttribute("style");
                if (!n3) return null;
                const i3 = t3.createElement("style");
                i3.textContent = `* { ${n3} }`, t3.head.appendChild(i3);
                const a3 = null === (o4 = e4.ownerDocument.defaultView) || void 0 === o4 ? void 0 : o4.getComputedStyle(e4);
                return t3.head.removeChild(i3), a3;
              }
            });
            i2.forEach((t4, o4) => {
              const n3 = a2[o4];
              !n3 || "none" !== n3.display && "hidden" !== n3.visibility && "0" !== n3.opacity || (r3.add(t4), e3++);
            });
          }
          this._log("Removed hidden elements:", e3);
        }
        removeBySelector(t3, e3 = true, r3 = true) {
          const o3 = Date.now();
          let n2 = 0, a2 = 0;
          const s2 = /* @__PURE__ */ new Set();
          if (e3) {
            t3.querySelectorAll(i.EXACT_SELECTORS.join(",")).forEach((t4) => {
              (null == t4 ? void 0 : t4.parentNode) && (s2.add(t4), n2++);
            });
          }
          if (r3) {
            const e4 = i.PARTIAL_SELECTORS.join("|"), r4 = new RegExp(e4, "i"), o4 = i.TEST_ATTRIBUTES.map((t4) => `[${t4}]`).join(",");
            t3.querySelectorAll(o4).forEach((t4) => {
              if (s2.has(t4)) return;
              const e5 = i.TEST_ATTRIBUTES.map((e6) => "class" === e6 ? t4.className && "string" == typeof t4.className ? t4.className : "" : "id" === e6 ? t4.id || "" : t4.getAttribute(e6) || "").join(" ").toLowerCase();
              e5.trim() && r4.test(e5) && (s2.add(t4), a2++);
            });
          }
          s2.forEach((t4) => t4.remove());
          const l2 = Date.now();
          this._log("Removed clutter elements:", { exactSelectors: n2, partialSelectors: a2, total: s2.size, processingTime: `${(l2 - o3).toFixed(2)}ms` });
        }
        findSmallImages(t3) {
          const e3 = /* @__PURE__ */ new Set(), r3 = /scale\(([\d.]+)\)/, o3 = Date.now();
          let n2 = 0;
          const i2 = [...Array.from(t3.getElementsByTagName("img")), ...Array.from(t3.getElementsByTagName("svg"))];
          if (0 === i2.length) return e3;
          const a2 = i2.map((t4) => ({ element: t4, naturalWidth: "img" === t4.tagName.toLowerCase() && parseInt(t4.getAttribute("width") || "0") || 0, naturalHeight: "img" === t4.tagName.toLowerCase() && parseInt(t4.getAttribute("height") || "0") || 0, attrWidth: parseInt(t4.getAttribute("width") || "0"), attrHeight: parseInt(t4.getAttribute("height") || "0") }));
          for (let t4 = 0; t4 < a2.length; t4 += 50) {
            const o4 = a2.slice(t4, t4 + 50);
            try {
              const t5 = o4.map(({ element: t6 }) => {
                var e4;
                try {
                  return null === (e4 = t6.ownerDocument.defaultView) || void 0 === e4 ? void 0 : e4.getComputedStyle(t6);
                } catch (t7) {
                  return null;
                }
              }), i3 = o4.map(({ element: t6 }) => {
                try {
                  return t6.getBoundingClientRect();
                } catch (t7) {
                  return null;
                }
              });
              o4.forEach((o5, a3) => {
                var s3;
                try {
                  const l2 = t5[a3], c = i3[a3];
                  if (!l2) return;
                  const u = l2.transform, d = u ? parseFloat((null === (s3 = u.match(r3)) || void 0 === s3 ? void 0 : s3[1]) || "1") : 1, m = [o5.naturalWidth, o5.attrWidth, parseInt(l2.width) || 0, c ? c.width * d : 0].filter((t6) => "number" == typeof t6 && t6 > 0), h = [o5.naturalHeight, o5.attrHeight, parseInt(l2.height) || 0, c ? c.height * d : 0].filter((t6) => "number" == typeof t6 && t6 > 0);
                  if (m.length > 0 && h.length > 0) {
                    const t6 = Math.min(...m), r4 = Math.min(...h);
                    if (t6 < 33 || r4 < 33) {
                      const t7 = this.getElementIdentifier(o5.element);
                      t7 && (e3.add(t7), n2++);
                    }
                  }
                } catch (t6) {
                  this.debug && console.warn("Defuddle: Failed to process element dimensions:", t6);
                }
              });
            } catch (t5) {
              this.debug && console.warn("Defuddle: Failed to process batch:", t5);
            }
          }
          const s2 = Date.now();
          return this._log("Found small elements:", { count: n2, processingTime: `${(s2 - o3).toFixed(2)}ms` }), e3;
        }
        removeSmallImages(t3, e3) {
          let r3 = 0;
          ["img", "svg"].forEach((o3) => {
            const n2 = t3.getElementsByTagName(o3);
            Array.from(n2).forEach((t4) => {
              const o4 = this.getElementIdentifier(t4);
              o4 && e3.has(o4) && (t4.remove(), r3++);
            });
          }), this._log("Removed small elements:", r3);
        }
        getElementIdentifier(t3) {
          if ("img" === t3.tagName.toLowerCase()) {
            const e4 = t3.getAttribute("data-src");
            if (e4) return `src:${e4}`;
            const r4 = t3.getAttribute("src") || "", o4 = t3.getAttribute("srcset") || "", n2 = t3.getAttribute("data-srcset");
            if (r4) return `src:${r4}`;
            if (o4) return `srcset:${o4}`;
            if (n2) return `srcset:${n2}`;
          }
          const e3 = t3.id || "", r3 = t3.className || "", o3 = "svg" === t3.tagName.toLowerCase() && t3.getAttribute("viewBox") || "";
          return e3 ? `id:${e3}` : o3 ? `viewBox:${o3}` : r3 ? `class:${r3}` : null;
        }
        findMainContent(t3) {
          const e3 = [];
          if (i.ENTRY_POINT_ELEMENTS.forEach((r3, o3) => {
            t3.querySelectorAll(r3).forEach((t4) => {
              let r4 = 40 * (i.ENTRY_POINT_ELEMENTS.length - o3);
              r4 += s.ContentScorer.scoreElement(t4), e3.push({ element: t4, score: r4 });
            });
          }), 0 === e3.length) return this.findContentByScoring(t3);
          if (e3.sort((t4, e4) => e4.score - t4.score), this.debug && this._log("Content candidates:", e3.map((t4) => ({ element: t4.element.tagName, selector: this.getElementSelector(t4.element), score: t4.score }))), 1 === e3.length && "body" === e3[0].element.tagName.toLowerCase()) {
            const e4 = this.findTableBasedContent(t3);
            if (e4) return e4;
          }
          return e3[0].element;
        }
        findTableBasedContent(t3) {
          if (!Array.from(t3.getElementsByTagName("table")).some((t4) => {
            const e4 = parseInt(t4.getAttribute("width") || "0"), r3 = this.getComputedStyle(t4);
            return e4 > 400 || (null == r3 ? void 0 : r3.width.includes("px")) && parseInt(r3.width) > 400 || "center" === t4.getAttribute("align") || t4.className.toLowerCase().includes("content") || t4.className.toLowerCase().includes("article");
          })) return null;
          const e3 = Array.from(t3.getElementsByTagName("td"));
          return s.ContentScorer.findBestElement(e3);
        }
        findContentByScoring(t3) {
          const e3 = [];
          return i.BLOCK_ELEMENTS.forEach((r3) => {
            Array.from(t3.getElementsByTagName(r3)).forEach((t4) => {
              const r4 = s.ContentScorer.scoreElement(t4);
              r4 > 0 && e3.push({ score: r4, element: t4 });
            });
          }), e3.length > 0 ? e3.sort((t4, e4) => e4.score - t4.score)[0].element : null;
        }
        getElementSelector(t3) {
          const e3 = [];
          let r3 = t3;
          for (; r3 && r3 !== this.doc.documentElement; ) {
            let t4 = r3.tagName.toLowerCase();
            r3.id ? t4 += "#" + r3.id : r3.className && "string" == typeof r3.className && (t4 += "." + r3.className.trim().split(/\s+/).join(".")), e3.unshift(t4), r3 = r3.parentElement;
          }
          return e3.join(" > ");
        }
        getComputedStyle(t3) {
          return (0, l.getComputedStyle)(t3);
        }
        _extractSchemaOrgData(t3) {
          const e3 = t3.querySelectorAll('script[type="application/ld+json"]'), r3 = [];
          e3.forEach((t4) => {
            let e4 = t4.textContent || "";
            try {
              e4 = e4.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").replace(/^\s*(\*\/|\/\*)\s*|\s*(\*\/|\/\*)\s*$/g, "").trim();
              const t5 = JSON.parse(e4);
              t5["@graph"] && Array.isArray(t5["@graph"]) ? r3.push(...t5["@graph"]) : r3.push(t5);
            } catch (t5) {
              console.error("Defuddle: Error parsing schema.org data:", t5), this.debug && console.error("Defuddle: Problematic JSON content:", e4);
            }
          });
          const o3 = (t4) => {
            if ("string" == typeof t4) return this._decodeHTMLEntities(t4);
            if (Array.isArray(t4)) return t4.map(o3);
            if ("object" == typeof t4 && null !== t4) {
              const e4 = {};
              for (const r4 in t4) Object.prototype.hasOwnProperty.call(t4, r4) && (e4[r4] = o3(t4[r4]));
              return e4;
            }
            return t4;
          };
          return r3.map(o3);
        }
        _decodeHTMLEntities(t3) {
          const e3 = this.doc.createElement("textarea");
          return e3.innerHTML = t3, e3.value;
        }
      };
    }, 632: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.ChatGPTExtractor = void 0;
      const o2 = r2(181);
      class n extends o2.ConversationExtractor {
        constructor(t3, e3) {
          super(t3, e3), this.articles = t3.querySelectorAll('article[data-testid^="conversation-turn-"]'), this.footnotes = [], this.footnoteCounter = 0;
        }
        canExtract() {
          return !!this.articles && this.articles.length > 0;
        }
        extractMessages() {
          const t3 = [];
          return this.footnotes = [], this.footnoteCounter = 0, this.articles ? (this.articles.forEach((e3) => {
            var r3, o3;
            const n2 = e3.querySelector("h5.sr-only, h6.sr-only"), i = (null === (o3 = null === (r3 = null == n2 ? void 0 : n2.textContent) || void 0 === r3 ? void 0 : r3.trim()) || void 0 === o3 ? void 0 : o3.replace(/:\s*$/, "")) || "";
            let a = "";
            const s = e3.getAttribute("data-message-author-role");
            s && (a = s);
            let l = e3.innerHTML || "";
            l = l.replace(/\u200B/g, "");
            const c = document.createElement("div");
            c.innerHTML = l, c.querySelectorAll('h5.sr-only, h6.sr-only, span[data-state="closed"]').forEach((t4) => t4.remove()), l = c.innerHTML;
            l = l.replace(/(&ZeroWidthSpace;)?(<span[^>]*?>\s*<a(?=[^>]*?href="([^"]+)")(?=[^>]*?target="_blank")(?=[^>]*?rel="noopener")[^>]*?>[\s\S]*?<\/a>\s*<\/span>)/gi, (t4, e4, r4, o4) => {
              let n3 = "", i2 = "";
              try {
                n3 = new URL(o4).hostname.replace(/^www\./, "");
                const t5 = o4.split("#:~:text=");
                if (t5.length > 1) {
                  i2 = decodeURIComponent(t5[1]), i2 = i2.replace(/%2C/g, ",");
                  const e5 = i2.split(",");
                  i2 = e5.length > 1 && e5[0].trim() ? ` — ${e5[0].trim()}...` : e5[0].trim() ? ` — ${i2.trim()}` : "";
                }
              } catch (t5) {
                console.error(`Failed to parse URL: ${o4}`, t5), n3 = o4;
              }
              let a2, s2 = this.footnotes.findIndex((t5) => t5.url === o4);
              return -1 === s2 ? (this.footnoteCounter++, a2 = this.footnoteCounter, this.footnotes.push({ url: o4, text: `<a href="${o4}">${n3}</a>${i2}` })) : a2 = s2 + 1, `<sup id="fnref:${a2}"><a href="#fn:${a2}">${a2}</a></sup>`;
            }), l = l.replace(/<p[^>]*>\s*<\/p>/g, ""), t3.push({ author: i, content: l.trim(), metadata: { role: a || "unknown" } });
          }), t3) : t3;
        }
        getFootnotes() {
          return this.footnotes;
        }
        getMetadata() {
          const t3 = this.getTitle(), e3 = this.extractMessages();
          return { title: t3, site: "ChatGPT", url: this.url, messageCount: e3.length, description: `ChatGPT conversation with ${e3.length} messages` };
        }
        getTitle() {
          var t3, e3, r3;
          const o3 = null === (t3 = this.document.title) || void 0 === t3 ? void 0 : t3.trim();
          if (o3 && "ChatGPT" !== o3) return o3;
          const n2 = null === (r3 = null === (e3 = this.articles) || void 0 === e3 ? void 0 : e3.item(0)) || void 0 === r3 ? void 0 : r3.querySelector(".text-message");
          if (n2) {
            const t4 = n2.textContent || "";
            return t4.length > 50 ? t4.slice(0, 50) + "..." : t4;
          }
          return "ChatGPT Conversation";
        }
      }
      e2.ChatGPTExtractor = n;
    }, 640: (t2, e2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.ALLOWED_ATTRIBUTES_DEBUG = e2.ALLOWED_ATTRIBUTES = e2.ALLOWED_EMPTY_ELEMENTS = e2.FOOTNOTE_LIST_SELECTORS = e2.FOOTNOTE_INLINE_REFERENCES = e2.PARTIAL_SELECTORS = e2.TEST_ATTRIBUTES = e2.EXACT_SELECTORS = e2.INLINE_ELEMENTS = e2.PRESERVE_ELEMENTS = e2.BLOCK_ELEMENTS = e2.MOBILE_WIDTH = e2.ENTRY_POINT_ELEMENTS = void 0, e2.ENTRY_POINT_ELEMENTS = ["#post", ".post-content", ".article-content", "#article-content", ".article_post", ".article-wrapper", ".entry-content", ".content-article", ".post", ".markdown-body", "article", '[role="article"]', "main", '[role="main"]', "body"], e2.MOBILE_WIDTH = 600, e2.BLOCK_ELEMENTS = ["div", "section", "article", "main", "aside", "header", "footer", "nav", "content"], e2.PRESERVE_ELEMENTS = /* @__PURE__ */ new Set(["pre", "code", "table", "thead", "tbody", "tr", "td", "th", "ul", "ol", "li", "dl", "dt", "dd", "figure", "figcaption", "picture", "details", "summary", "blockquote", "form", "fieldset"]), e2.INLINE_ELEMENTS = /* @__PURE__ */ new Set(["a", "span", "strong", "em", "i", "b", "u", "code", "br", "small", "sub", "sup", "mark", "date", "del", "ins", "q", "abbr", "cite", "relative-time", "time", "font"]), e2.EXACT_SELECTORS = ["noscript", 'script:not([type^="math/"])', "style", "meta", "link", '.ad:not([class*="gradient"])', '[class^="ad-" i]', '[class$="-ad" i]', '[id^="ad-" i]', '[id$="-ad" i]', '[role="banner" i]', '[alt*="advert" i]', ".promo", ".Promo", "#barrier-page", ".alert", '[id="comments" i]', '[id="comment" i]', "header", ".header:not(.banner)", "#header", "#Header", "#banner", "#Banner", "nav", ".navigation", "#navigation", ".hero", '[role="navigation" i]', '[role="dialog" i]', '[role*="complementary" i]', '[class*="pagination" i]', ".menu", "#menu", "#siteSub", ".previous", ".author", ".Author", '[class$="_bio"]', "#categories", ".contributor", ".date", "#date", "[data-date]", ".entry-meta", ".meta", ".tags", "#tags", ".toc", ".Toc", "#toc", ".headline", "#headline", "#title", "#Title", "#articleTag", '[href*="/category"]', '[href*="/categories"]', '[href*="/tag/"]', '[href*="/tags/"]', '[href*="/topics"]', '[href*="author"]', '[href*="#toc"]', '[href="#top"]', '[href="#Top"]', '[href="#page-header"]', '[href="#content"]', '[href="#site-content"]', '[href="#main-content"]', '[href^="#main"]', '[src*="author"]', "footer", ".aside", "aside", "button", "canvas", "date", "dialog", "fieldset", "form", 'input:not([type="checkbox"])', "label", "option", "select", "textarea", "time", "relative-time", "[hidden]", '[aria-hidden="true"]:not([class*="math"])', '[style*="display: none"]:not([class*="math"])', '[style*="display:none"]:not([class*="math"])', '[style*="visibility: hidden"]', '[style*="visibility:hidden"]', ".hidden", ".invisible", "instaread-player", 'iframe:not([src*="youtube"]):not([src*="youtu.be"]):not([src*="vimeo"]):not([src*="twitter"]):not([src*="x.com"]):not([src*="datawrapper"])', '[class="logo" i]', "#logo", "#Logo", "#newsletter", "#Newsletter", ".subscribe", ".noprint", '[data-print-layout="hide" i]', '[data-block="donotprint" i]', '[class*="clickable-icon" i]', 'li span[class*="ltx_tag" i][class*="ltx_tag_item" i]', 'a[href^="#"][class*="anchor" i]', 'a[href^="#"][class*="ref" i]', '[data-container*="most-viewed" i]', ".sidebar", ".Sidebar", "#sidebar", "#Sidebar", "#sitesub", '[data-link-name*="skip" i]', '[aria-label*="skip" i]', ".copyright", "#copyright", "#rss", "#feed", ".gutter", "#primaryaudio", "#NYT_ABOVE_MAIN_CONTENT_REGION", '[data-testid="photoviewer-children-figure"] > span', "table.infobox", ".pencraft:not(.pc-display-contents)", '[data-optimizely="related-articles-section" i]', '[data-orientation="vertical"]', ".gh-header-sticky", '[data-testid="issue-metadata-sticky"]'], e2.TEST_ATTRIBUTES = ["class", "id", "data-test", "data-testid", "data-test-id", "data-qa", "data-cy"], e2.PARTIAL_SELECTORS = ["a-statement", "access-wall", "activitypub", "actioncall", "addcomment", "advert", "adlayout", "ad-tldr", "ad-placement", "ads-container", "_ad_", "after_content", "after_main_article", "afterpost", "allterms", "-alert-", "alert-box", "appendix", "_archive", "around-the-web", "aroundpages", "article-author", "article-badges", "article-banner", "article-bottom-section", "article-bottom", "article-category", "article-card", "article-citation", "article__copy", "article_date", "article-date", "article-end ", "article_header", "article-header", "article__header", "article__hero", "article__info", "article-info", "article-meta", "article_meta", "article__meta", "articlename", "article-subject", "article_subject", "article-snippet", "article-separator", "article--share", "article--topics", "articletags", "article-tags", "article_tags", "articletitle", "article-title", "article_title", "articletopics", "article-topics", "article--lede", "articlewell", "associated-people", "audio-card", "author-bio", "author-box", "author-info", "author_info", "authorm", "author-mini-bio", "author-name", "author-publish-info", "authored-by", "avatar", "back-to-top", "backlink_container", "backlinks-section", "bio-block", "biobox", "blog-pager", "bookmark-", "-bookmark", "bottominfo", "bottomnav", "bottom-of-article", "bottom-wrapper", "brand-bar", "breadcrumb", "brdcrumb", "button-wrapper", "buttons-container", "btn-", "-btn", "byline", "captcha", "card-text", "card-media", "card-post", "carouselcontainer", "carousel-container", "cat_header", "catlinks", "_categories", "card-author", "card-content", "chapter-list", "collections", "comments", "commentbox", "comment-button", "commentcomp", "comment-content", "comment-count", "comment-form", "comment-number", "comment-respond", "comment-thread", "comment-wrap", "complementary", "consent", "contact-", "content-card", "content-topics", "contentpromo", "context-bar", "context-widget", "core-collateral", "cover-", "created-date", "creative-commons_", "c-subscribe", "_cta", "-cta", "cta-", "cta_", "current-issue", "custom-list-number", "dateline", "dateheader", "date-header", "date-pub", "disclaimer", "disclosure", "discussion", "discuss_", "disqus", "donate", "donation", "dropdown", "eletters", "emailsignup", "engagement-widget", "enhancement", "entry-author-info", "entry-categories", "entry-date", "entry-title", "entry-utility", "-error", "error-", "eyebrow", "expand-reduce", "external-anchor", "externallinkembedwrapper", "extra-services", "extra-title", "facebook", "fancy-box", "favorite", "featured-content", "feature_feed", "feedback", "feed-links", "field-site-sections", "fixheader", "floating-vid", "follower", "footer", "footnote-back", "footnoteback", "form-group", "for-you", "frontmatter", "further-reading", "fullbleedheader", "gated-", "gh-feed", "gist-meta", "goog-", "graph-view", "hamburger", "header_logo", "header-logo", "header-pattern", "hero-list", "hide-for-print", "hide-print", "hide-when-no-script", "hidden-print", "hidden-sidenote", "hidden-accessibility", "infoline", "instacartIntegration", "interlude", "interaction", "itemendrow", "invisible", "jumplink", "jump-to-", "js-skip-to-content", "keepreading", "keep-reading", "keep_reading", "keyword_wrap", "kicker", "labstab", "-labels", "language-name", "lastupdated", "latest-content", "-ledes-", "-license", "license-", "lightbox-popup", "like-button", "link-box", "links-grid", "links-title", "listing-dynamic-terms", "list-tags", "listinks", "loading", "loa-info", "logo_container", "ltx_role_refnum", "ltx_tag_bibitem", "ltx_error", "masthead", "marketing", "media-inquiry", "-menu", "menu-", "metadata", "might-like", "minibio", "more-about", "_modal", "-modal", "more-", "morenews", "morestories", "more_wrapper", "most-read", "move-helper", "mw-editsection", "mw-cite-backlink", "mw-indicators", "mw-jump-link", "nav-", "nav_", "navigation-post", "next-", "newsgallery", "news-story-title", "newsletter_", "newsletterbanner", "newslettercontainer", "newsletter-form", "newsletter-signup", "newslettersignup", "newsletterwidget", "newsletterwrapper", "not-found", "notessection", "nomobile", "noprint", "open-slideshow", "originally-published", "other-blogs", "outline-view", "pagehead", "page-header", "page-title", "paywall_message", "-partners", "permission-", "plea", "popular", "popup_links", "pop_stories", "pop-up", "post-author", "post-bottom", "post__category", "postcomment", "postdate", "post-date", "post_date", "post-details", "post-feeds", "postinfo", "post-info", "post_info", "post-inline-date", "post-links", "postlist", "post_list", "post_meta", "post-meta", "postmeta", "post_more", "postnavi", "post-navigation", "postpath", "post-preview", "postsnippet", "post_snippet", "post-snippet", "post-subject", "posttax", "post-tax", "post_tax", "posttag", "post_tag", "post-tag", "post_time", "posttitle", "post-title", "post_title", "post__title", "post-ufi-button", "prev-post", "prevnext", "prev_next", "prev-next", "previousnext", "press-inquiries", "print-none", "print-header", "print:hidden", "privacy-notice", "privacy-settings", "profile", "promo_article", "promo-bar", "promo-box", "pubdate", "pub_date", "pub-date", "publish_date", "publish-date", "publication-date", "publicationName", "qr-code", "qr_code", "quick_up", "_rail", "ratingssection", "read_also", "readmore", "read-next", "read_next", "read_time", "read-time", "reading_time", "reading-time", "reading-list", "recent-", "recent-articles", "recentpost", "recent_post", "recent-post", "recommend", "redirectedfrom", "recirc", "register", "related", "relevant", "reversefootnote", "_rss", "rss-link", "screen-reader-text", "scroll_to", "scroll-to", "_search", "-search", "section-nav", "series-banner", "share-box", "sharedaddy", "share-icons", "sharelinks", "share-post", "share-print", "share-section", "show-for-print", "sidebartitle", "sidebar-content", "sidebar-wrapper", "sideitems", "sidebar-author", "sidebar-item", "side-box", "side-logo", "sign-in-gate", "similar-", "similar_", "similars-", "site-index", "site-header", "siteheader", "site-logo", "site-name", "site-wordpress", "skip-content", "skip-to-content", "skip-link", "c-skip-link", "_skip-link", "-slider", "slug-wrap", "social-author", "social-shar", "social-date", "speechify-ignore", "speedbump", "sponsor", "springercitation", "sr-only", "_stats", "story-date", "story-navigation", "storyreadtime", "storysmall", "storypublishdate", "subject-label", "subhead", "submenu", "-subscribe-", "subscriber-drive", "subscription-", "_tags", "tags__item", "tag_list", "taxonomy", "table-of-contents", "tabs-", "terminaltout", "time-rubric", "timestamp", "time-read", "time-to-read", "tip_off", "tiptout", "-tout-", "toc-container", "toggle-caption", "tooltip", "topbar", "topic-list", "topic-subnav", "top-wrapper", "tree-item", "trending", "trust-feat", "trust-badge", "trust-project", "twitter", "u-hide", "upsell", "viewbottom", "visually-hidden", "welcomebox", "widget_pages"], e2.FOOTNOTE_INLINE_REFERENCES = ["sup.reference", "cite.ltx_cite", 'sup[id^="fnr"]', 'span[id^="fnr"]', 'span[class*="footnote_ref"]', "span.footnote-link", "a.citation", 'a[id^="ref-link"]', 'a[href^="#fn"]', 'a[href^="#cite"]', 'a[href^="#reference"]', 'a[href^="#footnote"]', 'a[href^="#r"]', 'a[href^="#b"]', 'a[href*="cite_note"]', 'a[href*="cite_ref"]', "a.footnote-anchor", "span.footnote-hovercard-target a", 'a[role="doc-biblioref"]', 'a[id^="fnref"]', 'a[id^="ref-link"]'].join(","), e2.FOOTNOTE_LIST_SELECTORS = ["div.footnote ol", "div.footnotes ol", 'div[role="doc-endnotes"]', 'div[role="doc-footnotes"]', "ol.footnotes-list", "ol.footnotes", "ol.references", 'ol[class*="article-references"]', "section.footnotes ol", 'section[role="doc-endnotes"]', 'section[role="doc-footnotes"]', 'section[role="doc-bibliography"]', "ul.footnotes-list", "ul.ltx_biblist", 'div.footnote[data-component-name="FootnoteToDOM"]'].join(","), e2.ALLOWED_EMPTY_ELEMENTS = /* @__PURE__ */ new Set(["area", "audio", "base", "br", "circle", "col", "defs", "ellipse", "embed", "figure", "g", "hr", "iframe", "img", "input", "line", "link", "mask", "meta", "object", "param", "path", "pattern", "picture", "polygon", "polyline", "rect", "source", "stop", "svg", "td", "th", "track", "use", "video", "wbr"]), e2.ALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set(["alt", "allow", "allowfullscreen", "aria-label", "checked", "colspan", "controls", "data-latex", "data-src", "data-srcset", "data-lang", "dir", "display", "frameborder", "headers", "height", "href", "lang", "role", "rowspan", "src", "srcset", "title", "type", "width", "accent", "accentunder", "align", "columnalign", "columnlines", "columnspacing", "columnspan", "data-mjx-texclass", "depth", "displaystyle", "fence", "frame", "framespacing", "linethickness", "lspace", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "scriptlevel", "separator", "stretchy", "symmetric", "voffset", "xmlns"]), e2.ALLOWED_ATTRIBUTES_DEBUG = /* @__PURE__ */ new Set(["class", "id"]);
    }, 649: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.imageRules = void 0;
      const o2 = r2(552), n = /^data:image\/([^;]+);base64,/, i = /\.(jpg|jpeg|png|webp)\s+\d/, a = /^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/, s = /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i, l = /\s(\d+)w/, c = /dpr=(\d+(?:\.\d+)?)/, u = /^([^\s]+)/, d = /^[\w\-\.\/\\]+\.(jpg|jpeg|png|gif|webp|svg)$/i, m = /^\d{4}-\d{2}-\d{2}$/;
      function h(t3, e3, r3) {
        const n2 = r3.createElement("figure");
        n2.appendChild(t3.cloneNode(true));
        const i2 = r3.createElement("figcaption"), a2 = function(t4) {
          const e4 = [], r4 = /* @__PURE__ */ new Set(), n3 = (t5) => {
            var i4;
            if ((0, o2.isTextNode)(t5)) {
              const o3 = (null === (i4 = t5.textContent) || void 0 === i4 ? void 0 : i4.trim()) || "";
              o3 && !r4.has(o3) && (e4.push(o3), r4.add(o3));
            } else if ((0, o2.isElement)(t5)) {
              const e5 = t5.childNodes;
              for (let t6 = 0; t6 < e5.length; t6++) n3(e5[t6]);
            }
          }, i3 = t4.childNodes;
          for (let t5 = 0; t5 < i3.length; t5++) n3(i3[t5]);
          if (e4.length > 0) return e4.join(" ");
          return t4.innerHTML;
        }(e3);
        return i2.innerHTML = a2, n2.appendChild(i2), n2;
      }
      function p(t3, e3) {
        e3.setAttribute("srcset", t3);
        const r3 = A(t3);
        r3 && b(r3) && e3.setAttribute("src", r3);
      }
      function g(t3, e3, r3) {
        for (let o3 = 0; o3 < t3.attributes.length; o3++) {
          const n2 = t3.attributes[o3];
          r3.includes(n2.name) || e3.setAttribute(n2.name, n2.value);
        }
      }
      function f(t3) {
        const e3 = t3.match(n);
        if (!e3) return false;
        if ("svg+xml" === e3[1]) return false;
        const r3 = e3[0].length;
        return t3.length - r3 < 133;
      }
      function v(t3) {
        return t3.startsWith("data:image/svg+xml");
      }
      function b(t3) {
        return !t3.startsWith("data:") && (!(!t3 || "" === t3.trim()) && (s.test(t3) || t3.includes("image") || t3.includes("img") || t3.includes("photo")));
      }
      function y(t3) {
        if (E(t3)) return true;
        return t3.querySelectorAll("img, video, picture, source").length > 0;
      }
      function E(t3) {
        const e3 = t3.tagName.toLowerCase();
        return "img" === e3 || "video" === e3 || "picture" === e3 || "source" === e3;
      }
      function C(t3) {
        if (E(t3)) return t3;
        const e3 = t3.querySelectorAll("picture");
        if (e3.length > 0) return e3[0];
        const r3 = t3.querySelectorAll("img"), o3 = [];
        for (let t4 = 0; t4 < r3.length; t4++) {
          const e4 = r3[t4], n3 = e4.getAttribute("src") || "", i3 = e4.getAttribute("alt") || "";
          n3.includes("data:image/svg+xml") || (f(n3) || !i3.trim() && r3.length > 1 || o3.push(e4));
        }
        if (o3.length > 0) return o3[0];
        const n2 = t3.querySelectorAll("video");
        if (n2.length > 0) return n2[0];
        const i2 = t3.querySelectorAll("source");
        if (i2.length > 0) return i2[0];
        const a2 = t3.querySelectorAll("img, picture, source, video");
        return a2.length > 0 ? a2[0] : null;
      }
      function x(t3) {
        var e3, r3, o3, n2;
        const i2 = t3.querySelector("figcaption");
        if (i2) return i2;
        const a2 = /* @__PURE__ */ new Set(), s2 = ['[class*="caption"]', '[class*="description"]', '[class*="alt"]', '[class*="title"]', '[class*="credit"]', '[class*="text"]', '[class*="post-thumbnail-text"]', '[class*="image-caption"]', '[class*="photo-caption"]', "[aria-label]", "[title]"].join(", "), l2 = t3.querySelectorAll(s2);
        for (let t4 = 0; t4 < l2.length; t4++) {
          const r4 = l2[t4];
          if (E(r4)) continue;
          const o4 = null === (e3 = r4.textContent) || void 0 === e3 ? void 0 : e3.trim();
          if (o4 && o4.length > 0 && !a2.has(o4)) return a2.add(o4), r4;
        }
        const c2 = t3.querySelector("img");
        if (c2 && c2.hasAttribute("alt")) {
          const e4 = c2.getAttribute("alt");
          if (e4 && e4.trim().length > 0) {
            const r4 = t3.ownerDocument.createElement("div");
            return r4.textContent = e4, r4;
          }
        }
        if (t3.parentElement) {
          const e4 = t3.parentElement.children;
          for (let o4 = 0; o4 < e4.length; o4++) {
            const n3 = e4[o4];
            if (n3 === t3) continue;
            if (Array.from(n3.classList).some((t4) => t4.includes("caption") || t4.includes("credit") || t4.includes("text") || t4.includes("description"))) {
              const t4 = null === (r3 = n3.textContent) || void 0 === r3 ? void 0 : r3.trim();
              if (t4 && t4.length > 0) return n3;
            }
          }
        }
        const u2 = t3.querySelectorAll("img");
        for (let t4 = 0; t4 < u2.length; t4++) {
          const e4 = u2[t4];
          if (!e4.parentElement) continue;
          let r4 = e4.nextElementSibling;
          for (; r4; ) {
            if (["EM", "STRONG", "SPAN", "I", "B", "SMALL", "CITE"].includes(r4.tagName)) {
              const t5 = null === (o3 = r4.textContent) || void 0 === o3 ? void 0 : o3.trim();
              if (t5 && t5.length > 0) return r4;
            }
            r4 = r4.nextElementSibling;
          }
        }
        for (let t4 = 0; t4 < u2.length; t4++) {
          const e4 = u2[t4], r4 = e4.parentElement;
          if (!r4) continue;
          const o4 = r4.querySelectorAll("em, strong, span, i, b, small, cite");
          for (let t5 = 0; t5 < o4.length; t5++) {
            const r5 = o4[t5];
            if (r5 === e4) continue;
            const i3 = null === (n2 = r5.textContent) || void 0 === n2 ? void 0 : n2.trim();
            if (i3 && i3.length > 0) return r5;
          }
        }
        return null;
      }
      function w(t3) {
        var e3;
        const r3 = (null === (e3 = t3.textContent) || void 0 === e3 ? void 0 : e3.trim()) || "";
        return !(r3.length < 10 || r3.startsWith("http://") || r3.startsWith("https://")) && (!d.test(r3) && (!r3.match(/^\d+$/) && !m.test(r3)));
      }
      function S(t3, e3) {
        const r3 = t3.tagName.toLowerCase();
        if ("img" === r3) return T(t3, e3);
        if ("picture" === r3) {
          const r4 = t3.querySelector("img");
          return r4 ? T(r4, e3) : t3.cloneNode(true);
        }
        return "source" === r3 ? function(t4, e4) {
          const r4 = e4.createElement("img"), o3 = t4.getAttribute("srcset");
          o3 && p(o3, r4);
          const n2 = t4.parentElement;
          if (n2) {
            const t5 = n2.querySelectorAll("img"), e5 = [];
            for (let r5 = 0; r5 < t5.length; r5++) {
              const o4 = t5[r5], n3 = o4.getAttribute("src") || "";
              f(n3) || v(n3) || "" === n3 || e5.push(o4);
            }
            if (e5.length > 0) {
              if (g(e5[0], r4, ["src", "srcset"]), !r4.hasAttribute("src") || !b(r4.getAttribute("src") || "")) {
                const t6 = e5[0].getAttribute("src");
                t6 && b(t6) && r4.setAttribute("src", t6);
              }
            } else {
              const t6 = n2.querySelector("img[data-src]");
              if (t6 && (g(t6, r4, ["src", "srcset"]), !r4.hasAttribute("src") || !b(r4.getAttribute("src") || ""))) {
                const e6 = t6.getAttribute("data-src");
                e6 && b(e6) && r4.setAttribute("src", e6);
              }
            }
          }
          return r4;
        }(t3, e3) : t3.cloneNode(true);
      }
      function T(t3, e3) {
        const r3 = t3.getAttribute("src") || "";
        if (f(r3) || v(r3)) {
          const r4 = t3.parentElement;
          if (r4) {
            const o3 = r4.querySelectorAll("source"), n2 = [];
            for (let t4 = 0; t4 < o3.length; t4++) {
              const e4 = o3[t4];
              e4.hasAttribute("data-srcset") && "" !== e4.getAttribute("data-srcset") && n2.push(e4);
            }
            if (n2.length > 0) {
              const r5 = e3.createElement("img"), o4 = t3.getAttribute("data-src");
              return o4 && !v(o4) && r5.setAttribute("src", o4), g(t3, r5, ["src"]), r5;
            }
          }
        }
        return t3.cloneNode(true);
      }
      function A(t3) {
        const e3 = t3.split(",");
        if (0 === e3.length) return null;
        const r3 = e3[0].trim().match(u);
        if (r3 && r3[1]) {
          const t4 = r3[1];
          if (v(t4)) {
            for (let t5 = 1; t5 < e3.length; t5++) {
              const r4 = e3[t5].trim().match(u);
              if (r4 && r4[1] && !v(r4[1])) return r4[1];
            }
            return null;
          }
          return t4;
        }
        return null;
      }
      function L(t3) {
        if (0 === t3.length) return null;
        if (1 === t3.length) return t3[0];
        for (let e4 = 0; e4 < t3.length; e4++) if (!t3[e4].hasAttribute("media")) return t3[e4];
        let e3 = null, r3 = 0;
        for (let o3 = 0; o3 < t3.length; o3++) {
          const n2 = t3[o3], i2 = n2.getAttribute("srcset");
          if (!i2) continue;
          const a2 = i2.match(l), s2 = i2.match(c);
          if (a2 && a2[1]) {
            const t4 = parseInt(a2[1], 10) * (s2 ? parseFloat(s2[1]) : 1);
            t4 > r3 && (r3 = t4, e3 = n2);
          }
        }
        return e3 || t3[0];
      }
      e2.imageRules = [{ selector: "picture", element: "picture", transform: (t3, e3) => {
        const r3 = t3.querySelectorAll("source"), o3 = t3.querySelector("img");
        if (!o3) {
          console.warn("Picture element without img fallback:", t3.outerHTML);
          const o4 = L(r3);
          if (o4) {
            const r4 = o4.getAttribute("srcset");
            if (r4) {
              const o5 = e3.createElement("img");
              return p(r4, o5), t3.innerHTML = "", t3.appendChild(o5), t3;
            }
          }
          return t3;
        }
        let n2 = null, i2 = null;
        if (r3.length > 0) {
          const t4 = L(r3);
          t4 && (n2 = t4.getAttribute("srcset"), n2 && (i2 = A(n2)));
        }
        if (n2 && o3.setAttribute("srcset", n2), i2 && b(i2)) o3.setAttribute("src", i2);
        else if (!o3.hasAttribute("src") || !b(o3.getAttribute("src") || "")) {
          const t4 = A(o3.getAttribute("srcset") || n2 || "");
          t4 && b(t4) && o3.setAttribute("src", t4);
        }
        return r3.forEach((t4) => t4.remove()), t3;
      } }, { selector: "uni-image-full-width", element: "figure", transform: (t3, e3) => {
        var r3;
        const o3 = e3.createElement("figure"), n2 = e3.createElement("img"), i2 = t3.querySelector("img");
        if (!i2) return console.warn("uni-image-full-width without img:", t3.outerHTML), o3;
        let a2 = i2.getAttribute("src");
        const s2 = i2.getAttribute("data-loading");
        if (s2) try {
          const t4 = JSON.parse(s2);
          t4.desktop && b(t4.desktop) && (a2 = t4.desktop);
        } catch (t4) {
          console.warn("Failed to parse data-loading attribute:", s2, t4);
        }
        if (!a2 || !b(a2)) return console.warn("Could not find valid src for uni-image-full-width:", t3.outerHTML), o3;
        n2.setAttribute("src", a2);
        let l2 = i2.getAttribute("alt");
        l2 || (l2 = t3.getAttribute("alt-text")), l2 && n2.setAttribute("alt", l2), o3.appendChild(n2);
        const c2 = t3.querySelector("figcaption");
        if (c2) {
          const t4 = null === (r3 = c2.textContent) || void 0 === r3 ? void 0 : r3.trim();
          if (t4 && t4.length > 5) {
            const r4 = e3.createElement("figcaption"), n3 = c2.querySelector(".rich-text p");
            n3 ? r4.innerHTML = n3.innerHTML : r4.textContent = t4, o3.appendChild(r4);
          }
        }
        return o3;
      } }, { selector: 'img[data-src], img[data-srcset], img[loading="lazy"], img.lazy, img.lazyload', element: "img", transform: (t3, e3) => {
        const r3 = t3.getAttribute("src") || "", o3 = function(t4) {
          if (t4.hasAttribute("data-src") || t4.hasAttribute("data-srcset")) return true;
          for (let e4 = 0; e4 < t4.attributes.length; e4++) {
            const r4 = t4.attributes[e4];
            if ("src" !== r4.name) {
              if (r4.name.startsWith("data-") && /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(r4.value)) return true;
              if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(r4.value)) return true;
            }
          }
          return false;
        }(t3);
        f(r3) && o3 && t3.removeAttribute("src");
        const n2 = t3.getAttribute("data-src");
        n2 && !t3.getAttribute("src") && t3.setAttribute("src", n2);
        const s2 = t3.getAttribute("data-srcset");
        s2 && !t3.getAttribute("srcset") && t3.setAttribute("srcset", s2);
        for (let e4 = 0; e4 < t3.attributes.length; e4++) {
          const r4 = t3.attributes[e4];
          "src" !== r4.name && "srcset" !== r4.name && "alt" !== r4.name && (i.test(r4.value) ? t3.setAttribute("srcset", r4.value) : a.test(r4.value) && t3.setAttribute("src", r4.value));
        }
        return t3.classList.remove("lazy", "lazyload"), t3.removeAttribute("data-ll-status"), t3.removeAttribute("data-src"), t3.removeAttribute("data-srcset"), t3.removeAttribute("loading"), t3;
      } }, { selector: "span:has(img)", element: "span", transform: (t3, e3) => {
        try {
          if (!y(t3)) return t3;
          const r3 = C(t3);
          if (!r3) return t3;
          const o3 = x(t3), n2 = S(r3, e3);
          if (o3 && w(o3)) {
            const t4 = h(n2, o3, e3);
            return o3.parentNode && o3.parentNode.removeChild(o3), t4;
          }
          return n2;
        } catch (e4) {
          return console.warn("Error processing span with image:", e4), t3;
        }
      } }, { selector: 'figure, p:has([class*="caption"])', element: "figure", transform: (t3, e3) => {
        try {
          if (!y(t3)) return t3;
          const r3 = C(t3);
          if (!r3) return t3;
          const o3 = x(t3);
          if (o3 && w(o3)) {
            const n2 = C(t3);
            let i2;
            return n2 ? i2 = n2 : (console.warn("Figure rule couldn't find current image element in:", t3.outerHTML), i2 = S(r3, e3)), h(i2, o3, e3);
          }
          return t3;
        } catch (e4) {
          return console.warn("Error processing complex image element:", e4), t3;
        }
      } }];
    }, 732: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.GeminiExtractor = void 0;
      const o2 = r2(181);
      class n extends o2.ConversationExtractor {
        constructor(t3, e3) {
          super(t3, e3), this.messageCount = null, this.conversationContainers = t3.querySelectorAll("div.conversation-container"), this.footnotes = [];
        }
        canExtract() {
          return !!this.conversationContainers && this.conversationContainers.length > 0;
        }
        extractMessages() {
          this.messageCount = 0;
          const t3 = [];
          return this.conversationContainers ? (this.extractSources(), this.conversationContainers.forEach((e3) => {
            const r3 = e3.querySelector("user-query");
            if (r3) {
              const e4 = r3.querySelector(".query-text");
              if (e4) {
                const r4 = e4.innerHTML || "";
                t3.push({ author: "You", content: r4.trim(), metadata: { role: "user" } });
              }
            }
            const o3 = e3.querySelector("model-response");
            if (o3) {
              const e4 = o3.querySelector(".model-response-text .markdown"), r4 = o3.querySelector("#extended-response-markdown-content") || e4;
              if (r4) {
                let e5 = r4.innerHTML || "";
                const o4 = document.createElement("div");
                o4.innerHTML = e5, o4.querySelectorAll(".table-content").forEach((t4) => {
                  t4.classList.remove("table-content");
                }), e5 = o4.innerHTML, t3.push({ author: "Gemini", content: e5.trim(), metadata: { role: "assistant" } });
              }
            }
          }), this.messageCount = t3.length, t3) : t3;
        }
        extractSources() {
          const t3 = this.document.querySelectorAll("browse-item");
          t3 && t3.length > 0 && t3.forEach((t4) => {
            var e3, r3, o3, n2;
            const i = t4.querySelector("a");
            if (i instanceof HTMLAnchorElement) {
              const t5 = i.href, a = (null === (r3 = null === (e3 = i.querySelector(".domain")) || void 0 === e3 ? void 0 : e3.textContent) || void 0 === r3 ? void 0 : r3.trim()) || "", s = (null === (n2 = null === (o3 = i.querySelector(".title")) || void 0 === o3 ? void 0 : o3.textContent) || void 0 === n2 ? void 0 : n2.trim()) || "";
              t5 && (a || s) && this.footnotes.push({ url: t5, text: s ? `${a}: ${s}` : a });
            }
          });
        }
        getFootnotes() {
          return this.footnotes;
        }
        getMetadata() {
          var t3;
          const e3 = this.getTitle(), r3 = null !== (t3 = this.messageCount) && void 0 !== t3 ? t3 : this.extractMessages().length;
          return { title: e3, site: "Gemini", url: this.url, messageCount: r3, description: `Gemini conversation with ${r3} messages` };
        }
        getTitle() {
          var t3, e3, r3, o3, n2;
          const i = null === (t3 = this.document.title) || void 0 === t3 ? void 0 : t3.trim();
          if (i && "Gemini" !== i && !i.includes("Gemini")) return i;
          const a = null === (r3 = null === (e3 = this.document.querySelector(".title-text")) || void 0 === e3 ? void 0 : e3.textContent) || void 0 === r3 ? void 0 : r3.trim();
          if (a) return a;
          const s = null === (n2 = null === (o3 = this.conversationContainers) || void 0 === o3 ? void 0 : o3.item(0)) || void 0 === n2 ? void 0 : n2.querySelector(".query-text");
          if (s) {
            const t4 = s.textContent || "";
            return t4.length > 50 ? t4.slice(0, 50) + "..." : t4;
          }
          return "Gemini Conversation";
        }
      }
      e2.GeminiExtractor = n;
    }, 754: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.codeBlockRules = void 0;
      const o2 = r2(552), n = [/^language-(\w+)$/, /^lang-(\w+)$/, /^(\w+)-code$/, /^code-(\w+)$/, /^syntax-(\w+)$/, /^code-snippet__(\w+)$/, /^highlight-(\w+)$/, /^(\w+)-snippet$/, /(?:^|\s)(?:language|lang|brush|syntax)-(\w+)(?:\s|$)/i], i = /* @__PURE__ */ new Set(["abap", "actionscript", "ada", "adoc", "agda", "antlr4", "applescript", "arduino", "armasm", "asciidoc", "aspnet", "atom", "bash", "batch", "c", "clojure", "cmake", "cobol", "coffeescript", "cpp", "c++", "crystal", "csharp", "cs", "dart", "django", "dockerfile", "dotnet", "elixir", "elm", "erlang", "fortran", "fsharp", "gdscript", "gitignore", "glsl", "golang", "gradle", "graphql", "groovy", "haskell", "hs", "haxe", "hlsl", "html", "idris", "java", "javascript", "js", "jsx", "jsdoc", "json", "jsonp", "julia", "kotlin", "latex", "lisp", "elisp", "livescript", "lua", "makefile", "markdown", "md", "markup", "masm", "mathml", "matlab", "mongodb", "mysql", "nasm", "nginx", "nim", "nix", "objc", "ocaml", "pascal", "perl", "php", "postgresql", "powershell", "prolog", "puppet", "python", "regex", "rss", "ruby", "rb", "rust", "scala", "scheme", "shell", "sh", "solidity", "sparql", "sql", "ssml", "svg", "swift", "tcl", "terraform", "tex", "toml", "typescript", "ts", "tsx", "unrealscript", "verilog", "vhdl", "webassembly", "wasm", "xml", "yaml", "yml", "zig"]);
      e2.codeBlockRules = [{ selector: ["pre", 'div[class*="prismjs"]', ".syntaxhighlighter", ".highlight", ".highlight-source", ".wp-block-syntaxhighlighter-code", ".wp-block-code", 'div[class*="language-"]'].join(", "), element: "pre", transform: (t3, e3) => {
        if (!((t4) => "classList" in t4 && "getAttribute" in t4 && "querySelector" in t4)(t3)) return t3;
        const r3 = (t4) => {
          var e4;
          const r4 = t4.getAttribute("data-lang") || t4.getAttribute("data-language");
          if (r4) return r4.toLowerCase();
          const o3 = Array.from(t4.classList || []);
          if (null === (e4 = t4.classList) || void 0 === e4 ? void 0 : e4.contains("syntaxhighlighter")) {
            const t5 = o3.find((t6) => !["syntaxhighlighter", "nogutter"].includes(t6));
            if (t5 && i.has(t5.toLowerCase())) return t5.toLowerCase();
          }
          for (const t5 of o3) for (const e5 of n) {
            const r5 = t5.toLowerCase().match(e5);
            if (r5 && r5[1] && i.has(r5[1].toLowerCase())) return r5[1].toLowerCase();
          }
          for (const t5 of o3) if (i.has(t5.toLowerCase())) return t5.toLowerCase();
          return "";
        };
        let a = "", s = t3;
        for (; s && !a; ) {
          a = r3(s);
          const t4 = s.querySelector("code");
          !a && t4 && (a = r3(t4)), s = s.parentElement;
        }
        const l = (t4) => {
          if ((0, o2.isTextNode)(t4)) return t4.textContent || "";
          let e4 = "";
          if ((0, o2.isElement)(t4)) {
            if ("BR" === t4.tagName) return "\n";
            if (t4.matches('div[class*="line"], span[class*="line"], .ec-line, [data-line-number], [data-line]')) {
              const e5 = t4.querySelector('.code, .content, [class*="code-"], [class*="content-"]');
              if (e5) return (e5.textContent || "") + "\n";
              const r4 = t4.querySelector('.line-number, .gutter, [class*="line-number"], [class*="gutter"]');
              if (r4) {
                return Array.from(t4.childNodes).filter((t5) => !r4.contains(t5)).map((t5) => l(t5)).join("") + "\n";
              }
              return t4.textContent + "\n";
            }
            t4.childNodes.forEach((t5) => {
              e4 += l(t5);
            });
          }
          return e4;
        };
        let c = "";
        t3.matches(".syntaxhighlighter, .wp-block-syntaxhighlighter-code") && (c = ((t4) => {
          const e4 = t4.querySelector(".syntaxhighlighter table .code .container");
          if (e4) return Array.from(e4.children).map((t5) => {
            const e5 = Array.from(t5.querySelectorAll("code")).map((t6) => {
              var e6;
              let r5 = t6.textContent || "";
              return (null === (e6 = t6.classList) || void 0 === e6 ? void 0 : e6.contains("spaces")) && (r5 = " ".repeat(r5.length)), r5;
            }).join("");
            return e5 || t5.textContent || "";
          }).join("\n");
          const r4 = t4.querySelectorAll(".code .line");
          return r4.length > 0 ? Array.from(r4).map((t5) => {
            const e5 = Array.from(t5.querySelectorAll("code")).map((t6) => t6.textContent || "").join("");
            return e5 || t5.textContent || "";
          }).join("\n") : "";
        })(t3)), c || (c = l(t3)), c = c.replace(/^\s+|\s+$/g, "").replace(/\t/g, "    ").replace(/\n{3,}/g, "\n\n").replace(/\u00a0/g, " ").replace(/^\n+/, "").replace(/\n+$/, "");
        const u = e3.createElement("pre"), d = e3.createElement("code");
        return a && (d.setAttribute("data-lang", a), d.setAttribute("class", `language-${a}`)), d.textContent = c, u.appendChild(d), u;
      } }];
    }, 840: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.standardizeContent = function(t3, e3, r3, n2 = false) {
        (function(t4) {
          const e4 = (t5) => {
            if ((0, c.isElement)(t5)) {
              const e5 = t5.tagName.toLowerCase();
              if ("pre" === e5 || "code" === e5) return;
            }
            if ((0, c.isTextNode)(t5)) {
              const e5 = t5.textContent || "", r4 = e5.replace(/\xA0+/g, (e6) => {
                var r5, o3, n3, i2;
                if (1 === e6.length) {
                  const e7 = null === (o3 = null === (r5 = t5.previousSibling) || void 0 === r5 ? void 0 : r5.textContent) || void 0 === o3 ? void 0 : o3.slice(-1), a2 = null === (i2 = null === (n3 = t5.nextSibling) || void 0 === n3 ? void 0 : n3.textContent) || void 0 === i2 ? void 0 : i2.charAt(0);
                  if ((null == e7 ? void 0 : e7.match(/\w/)) && (null == a2 ? void 0 : a2.match(/\w/))) return " ";
                }
                return " ".repeat(e6.length);
              });
              r4 !== e5 && (t5.textContent = r4);
            }
            t5.hasChildNodes() && Array.from(t5.childNodes).forEach(e4);
          };
          e4(t4);
        })(t3), function(t4) {
          let e4 = 0;
          Array.from(t4.getElementsByTagName("*")).forEach((t5) => {
            Array.from(t5.childNodes).forEach((t6) => {
              (0, c.isCommentNode)(t6) && (t6.remove(), e4++);
            });
          }), (0, c.logDebug)("Removed HTML comments:", e4);
        }(t3), function(t4, e4, r4) {
          const n3 = (t5) => t5.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim().toLowerCase(), i2 = t4.getElementsByTagName("h1");
          Array.from(i2).forEach((t5) => {
            var e5;
            const n4 = r4.createElement("h2");
            n4.innerHTML = t5.innerHTML, Array.from(t5.attributes).forEach((t6) => {
              o2.ALLOWED_ATTRIBUTES.has(t6.name) && n4.setAttribute(t6.name, t6.value);
            }), null === (e5 = t5.parentNode) || void 0 === e5 || e5.replaceChild(n4, t5);
          });
          const a2 = t4.getElementsByTagName("h2");
          if (a2.length > 0) {
            const t5 = a2[0], r5 = n3(t5.textContent || ""), o3 = n3(e4);
            o3 && o3 === r5 && t5.remove();
          }
        }(t3, e3.title, r3), (0, a.standardizeFootnotes)(t3), function(t4, e4) {
          let r4 = 0;
          u.forEach((o3) => {
            t4.querySelectorAll(o3.selector).forEach((t5) => {
              if (o3.transform) {
                const n3 = o3.transform(t5, e4);
                t5.replaceWith(n3), r4++;
              }
            });
          });
          t4.querySelectorAll("lite-youtube").forEach((t5) => {
            const o3 = t5.getAttribute("videoid");
            if (!o3) return;
            const n3 = e4.createElement("iframe");
            n3.width = "560", n3.height = "315", n3.src = `https://www.youtube.com/embed/${o3}`, n3.title = t5.getAttribute("videotitle") || "YouTube video player", n3.frameBorder = "0", n3.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share", n3.setAttribute("allowfullscreen", ""), t5.replaceWith(n3), r4++;
          }), (0, c.logDebug)("Converted embedded elements:", r4);
        }(t3, r3), n2 ? (m(t3, n2), d(t3), h(t3), (0, c.logDebug)("Debug mode: Skipping div flattening to preserve structure")) : (p(t3, r3), m(t3, n2), function(t4) {
          let e4 = 0, r4 = 0, n3 = true;
          for (; n3; ) {
            r4++, n3 = false;
            const i2 = Array.from(t4.getElementsByTagName("*")).filter((t5) => {
              if (o2.ALLOWED_EMPTY_ELEMENTS.has(t5.tagName.toLowerCase())) return false;
              const e5 = t5.textContent || "", r5 = 0 === e5.trim().length, n4 = e5.includes(" "), i3 = !t5.hasChildNodes() || Array.from(t5.childNodes).every((t6) => {
                if ((0, c.isTextNode)(t6)) {
                  const e6 = t6.textContent || "";
                  return 0 === e6.trim().length && !e6.includes(" ");
                }
                return false;
              });
              if ("div" === t5.tagName.toLowerCase()) {
                const e6 = Array.from(t5.children);
                if (e6.length > 0 && e6.every((t6) => {
                  var e7;
                  if ("span" !== t6.tagName.toLowerCase()) return false;
                  const r6 = (null === (e7 = t6.textContent) || void 0 === e7 ? void 0 : e7.trim()) || "";
                  return "," === r6 || "" === r6 || " " === r6;
                })) return true;
              }
              return r5 && !n4 && i3;
            });
            i2.length > 0 && (i2.forEach((t5) => {
              t5.remove(), e4++;
            }), n3 = true);
          }
          (0, c.logDebug)("Removed empty elements:", e4, "iterations:", r4);
        }(t3), d(t3), p(t3, r3), h(t3), function(t4, e4) {
          let r4 = 0;
          const o3 = Date.now(), n3 = (t5) => {
            var e5;
            if ((0, c.isElement)(t5)) {
              const e6 = t5.tagName.toLowerCase();
              if ("pre" === e6 || "code" === e6) return;
            }
            if (Array.from(t5.childNodes).forEach(n3), (0, c.isTextNode)(t5)) {
              const o4 = t5.textContent || "";
              if (!o4 || o4.match(/^[\u200C\u200B\u200D\u200E\u200F\uFEFF\xA0\s]*$/)) null === (e5 = t5.parentNode) || void 0 === e5 || e5.removeChild(t5), r4++;
              else {
                const e6 = o4.replace(/\n{3,}/g, "\n\n").replace(/^[\n\r\t]+/, "").replace(/[\n\r\t]+$/, "").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/[ \t]{3,}/g, " ").replace(/^[ ]+$/, " ").replace(/\s+([,.!?:;])/g, "$1").replace(/[\u200C\u200B\u200D\u200E\u200F\uFEFF]+/g, "").replace(/(?:\xA0){2,}/g, " ");
                e6 !== o4 && (t5.textContent = e6, r4 += o4.length - e6.length);
              }
            }
          }, i2 = (t5) => {
            var o4;
            if (!(0, c.isElement)(t5)) return;
            const n4 = t5.tagName.toLowerCase();
            if ("pre" === n4 || "code" === n4) return;
            Array.from(t5.childNodes).filter(c.isElement).forEach(i2), t5.normalize();
            const a3 = "block" === (null === (o4 = (0, c.getComputedStyle)(t5)) || void 0 === o4 ? void 0 : o4.display), s2 = a3 ? /^[\n\r\t \u200C\u200B\u200D\u200E\u200F\uFEFF\xA0]*$/ : /^[\n\r\t\u200C\u200B\u200D\u200E\u200F\uFEFF]*$/, l2 = a3 ? /^[\n\r\t \u200C\u200B\u200D\u200E\u200F\uFEFF\xA0]*$/ : /^[\n\r\t\u200C\u200B\u200D\u200E\u200F\uFEFF]*$/;
            for (; t5.firstChild && (0, c.isTextNode)(t5.firstChild) && (t5.firstChild.textContent || "").match(s2); ) t5.removeChild(t5.firstChild), r4++;
            for (; t5.lastChild && (0, c.isTextNode)(t5.lastChild) && (t5.lastChild.textContent || "").match(l2); ) t5.removeChild(t5.lastChild), r4++;
            if (!a3) {
              const r5 = Array.from(t5.childNodes);
              for (let o5 = 0; o5 < r5.length - 1; o5++) {
                const n5 = r5[o5], i3 = r5[o5 + 1];
                if ((0, c.isElement)(n5) || (0, c.isElement)(i3)) {
                  const r6 = i3.textContent || "", o6 = n5.textContent || "", a4 = r6.match(/^[,.!?:;)\]]/), s3 = o6.match(/[,.!?:;(\[]\s*$/), l3 = (0, c.isTextNode)(n5) && (n5.textContent || "").endsWith(" ") || (0, c.isTextNode)(i3) && (i3.textContent || "").startsWith(" ");
                  if (!a4 && !s3 && !l3) {
                    const r7 = e4.createTextNode(" ");
                    t5.insertBefore(r7, i3);
                  }
                }
              }
            }
          };
          n3(t4), i2(t4);
          const a2 = Date.now();
          (0, c.logDebug)("Removed empty lines:", { charactersRemoved: r4, processingTime: `${(a2 - o3).toFixed(2)}ms` });
        }(t3, r3));
      };
      const o2 = r2(640), n = r2(0), i = r2(754), a = r2(610), s = r2(864), l = r2(649), c = r2(552), u = [...n.mathRules, ...i.codeBlockRules, ...s.headingRules, ...l.imageRules, { selector: 'div[data-testid^="paragraph"], div[role="paragraph"]', element: "p", transform: (t3, e3) => {
        const r3 = e3.createElement("p");
        return r3.innerHTML = t3.innerHTML, Array.from(t3.attributes).forEach((t4) => {
          o2.ALLOWED_ATTRIBUTES.has(t4.name) && r3.setAttribute(t4.name, t4.value);
        }), r3;
      } }, { selector: 'div[role="list"]', element: "ul", transform: (t3, e3) => {
        var r3;
        const o3 = t3.querySelector('div[role="listitem"] .label'), n2 = ((null === (r3 = null == o3 ? void 0 : o3.textContent) || void 0 === r3 ? void 0 : r3.trim()) || "").match(/^\d+\)/), i2 = e3.createElement(n2 ? "ol" : "ul");
        return t3.querySelectorAll('div[role="listitem"]').forEach((t4) => {
          const r4 = e3.createElement("li"), o4 = t4.querySelector(".content");
          if (o4) {
            o4.querySelectorAll('div[role="paragraph"]').forEach((t5) => {
              const r5 = e3.createElement("p");
              r5.innerHTML = t5.innerHTML, t5.replaceWith(r5);
            });
            o4.querySelectorAll('div[role="list"]').forEach((t5) => {
              var r5;
              const o5 = t5.querySelector('div[role="listitem"] .label'), n3 = ((null === (r5 = null == o5 ? void 0 : o5.textContent) || void 0 === r5 ? void 0 : r5.trim()) || "").match(/^\d+\)/), i3 = e3.createElement(n3 ? "ol" : "ul");
              t5.querySelectorAll('div[role="listitem"]').forEach((t6) => {
                const r6 = e3.createElement("li"), o6 = t6.querySelector(".content");
                if (o6) {
                  o6.querySelectorAll('div[role="paragraph"]').forEach((t7) => {
                    const r7 = e3.createElement("p");
                    r7.innerHTML = t7.innerHTML, t7.replaceWith(r7);
                  }), r6.innerHTML = o6.innerHTML;
                }
                i3.appendChild(r6);
              }), t5.replaceWith(i3);
            }), r4.innerHTML = o4.innerHTML;
          }
          i2.appendChild(r4);
        }), i2;
      } }, { selector: 'div[role="listitem"]', element: "li", transform: (t3, e3) => {
        const r3 = t3.querySelector(".content");
        if (!r3) return t3;
        return r3.querySelectorAll('div[role="paragraph"]').forEach((t4) => {
          const r4 = e3.createElement("p");
          r4.innerHTML = t4.innerHTML, t4.replaceWith(r4);
        }), r3;
      } }];
      function d(t3) {
        let e3 = 0;
        const r3 = (e4) => {
          let o3 = "", n2 = e4.nextSibling;
          for (; n2; ) ((0, c.isTextNode)(n2) || (0, c.isElement)(n2)) && (o3 += n2.textContent || ""), n2 = n2.nextSibling;
          if (o3.trim()) return true;
          const i2 = e4.parentElement;
          return !(!i2 || i2 === t3) && r3(i2);
        };
        Array.from(t3.querySelectorAll("h1, h2, h3, h4, h5, h6")).reverse().forEach((t4) => {
          r3(t4) || (t4.remove(), e3++);
        }), e3 > 0 && (0, c.logDebug)("Removed trailing headings:", e3);
      }
      function m(t3, e3) {
        let r3 = 0;
        const n2 = (t4) => {
          if ("svg" === t4.tagName.toLowerCase() || "http://www.w3.org/2000/svg" === t4.namespaceURI) return;
          const n3 = Array.from(t4.attributes), i2 = t4.tagName.toLowerCase();
          n3.forEach((n4) => {
            const a2 = n4.name.toLowerCase(), s2 = n4.value;
            "id" === a2 && (s2.startsWith("fnref:") || s2.startsWith("fn:") || "footnotes" === s2) || "class" === a2 && ("code" === i2 && s2.startsWith("language-") || "footnote-backref" === s2) || (e3 ? o2.ALLOWED_ATTRIBUTES.has(a2) || o2.ALLOWED_ATTRIBUTES_DEBUG.has(a2) || a2.startsWith("data-") || (t4.removeAttribute(n4.name), r3++) : o2.ALLOWED_ATTRIBUTES.has(a2) || (t4.removeAttribute(n4.name), r3++));
          });
        };
        n2(t3), t3.querySelectorAll("*").forEach(n2), (0, c.logDebug)("Stripped attributes:", r3);
      }
      function h(t3) {
        let e3 = 0;
        const r3 = Date.now(), o3 = Array.from(t3.getElementsByTagName("br"));
        let n2 = [];
        const i2 = () => {
          if (n2.length > 2) for (let t4 = 2; t4 < n2.length; t4++) n2[t4].remove(), e3++;
          n2 = [];
        };
        o3.forEach((t4) => {
          var e4;
          let r4 = false;
          if (n2.length > 0) {
            const o4 = n2[n2.length - 1];
            let i3 = t4.previousSibling;
            for (; i3 && (0, c.isTextNode)(i3) && !(null === (e4 = i3.textContent) || void 0 === e4 ? void 0 : e4.trim()); ) i3 = i3.previousSibling;
            i3 === o4 && (r4 = true);
          }
          r4 ? n2.push(t4) : (i2(), n2 = [t4]);
        }), i2();
        const a2 = Date.now();
        (0, c.logDebug)("Standardized br elements:", { removed: e3, processingTime: `${(a2 - r3).toFixed(2)}ms` });
      }
      function p(t3, e3) {
        let r3 = 0;
        const n2 = Date.now();
        let i2 = true;
        function a2(t4) {
          var e4;
          for (const r4 of t4.childNodes) {
            if ((0, c.isTextNode)(r4) && (null === (e4 = r4.textContent) || void 0 === e4 ? void 0 : e4.trim())) return true;
            if ((0, c.isElement)(r4) && o2.INLINE_ELEMENTS.has(r4.nodeName.toLowerCase())) return true;
          }
          return false;
        }
        const s2 = (t4) => {
          const e4 = t4.tagName.toLowerCase();
          if (o2.PRESERVE_ELEMENTS.has(e4)) return true;
          const r4 = t4.getAttribute("role");
          if (r4 && ["article", "main", "navigation", "banner", "contentinfo"].includes(r4)) return true;
          const n3 = t4.className;
          if ("string" == typeof n3 && n3.toLowerCase().match(/(?:article|main|content|footnote|reference|bibliography)/)) return true;
          return !!Array.from(t4.children).some((t5) => o2.PRESERVE_ELEMENTS.has(t5.tagName.toLowerCase()) || "article" === t5.getAttribute("role") || t5.className && "string" == typeof t5.className && t5.className.toLowerCase().match(/(?:article|main|content|footnote|reference|bibliography)/));
        }, l2 = (t4) => {
          var e4;
          if (a2(t4)) return false;
          if (!(null === (e4 = t4.textContent) || void 0 === e4 ? void 0 : e4.trim())) return true;
          const r4 = Array.from(t4.children);
          if (0 === r4.length) return true;
          if (r4.every((t5) => {
            const e5 = t5.tagName.toLowerCase();
            return o2.BLOCK_ELEMENTS.includes(e5) || "p" === e5 || "h1" === e5 || "h2" === e5 || "h3" === e5 || "h4" === e5 || "h5" === e5 || "h6" === e5 || "ul" === e5 || "ol" === e5 || "pre" === e5 || "blockquote" === e5 || "figure" === e5;
          })) return true;
          const n3 = t4.className.toLowerCase();
          if (/(?:wrapper|container|layout|row|col|grid|flex|outer|inner|content-area)/i.test(n3)) return true;
          const i3 = Array.from(t4.childNodes).filter((t5) => {
            var e5;
            return (0, c.isTextNode)(t5) && (null === (e5 = t5.textContent) || void 0 === e5 ? void 0 : e5.trim());
          });
          if (0 === i3.length) return true;
          return !(!(r4.length > 0) || r4.some((t5) => {
            const e5 = t5.tagName.toLowerCase();
            return o2.INLINE_ELEMENTS.has(e5);
          }));
        }, u2 = (n3) => {
          var i3, u3;
          if (!n3.isConnected || s2(n3)) return false;
          const d3 = n3.tagName.toLowerCase();
          if (!o2.ALLOWED_EMPTY_ELEMENTS.has(d3) && !n3.children.length && !(null === (i3 = n3.textContent) || void 0 === i3 ? void 0 : i3.trim())) return n3.remove(), r3++, true;
          if (n3.parentElement === t3) {
            const t4 = Array.from(n3.children);
            if (t4.length > 0 && !t4.some((t5) => {
              const e4 = t5.tagName.toLowerCase();
              return o2.INLINE_ELEMENTS.has(e4);
            })) {
              const t5 = e3.createDocumentFragment();
              for (; n3.firstChild; ) t5.appendChild(n3.firstChild);
              return n3.replaceWith(t5), r3++, true;
            }
          }
          if (l2(n3)) {
            if (!Array.from(n3.children).some((t5) => {
              const e4 = t5.tagName.toLowerCase();
              return o2.INLINE_ELEMENTS.has(e4);
            })) {
              const t5 = e3.createDocumentFragment();
              for (; n3.firstChild; ) t5.appendChild(n3.firstChild);
              return n3.replaceWith(t5), r3++, true;
            }
            const t4 = e3.createDocumentFragment();
            for (; n3.firstChild; ) t4.appendChild(n3.firstChild);
            return n3.replaceWith(t4), r3++, true;
          }
          const m3 = Array.from(n3.childNodes);
          if (m3.length > 0 && m3.every((t4) => (0, c.isTextNode)(t4) || (0, c.isElement)(t4) && o2.INLINE_ELEMENTS.has(t4.nodeName.toLowerCase())) && (null === (u3 = n3.textContent) || void 0 === u3 ? void 0 : u3.trim())) {
            const t4 = e3.createElement("p");
            for (; n3.firstChild; ) t4.appendChild(n3.firstChild);
            return n3.replaceWith(t4), r3++, true;
          }
          if (1 === n3.children.length) {
            const t4 = n3.firstElementChild, e4 = t4.tagName.toLowerCase();
            if (o2.BLOCK_ELEMENTS.includes(e4) && !s2(t4)) return n3.replaceWith(t4), r3++, true;
          }
          let h3 = 0, p3 = n3.parentElement;
          for (; p3; ) {
            const t4 = p3.tagName.toLowerCase();
            o2.BLOCK_ELEMENTS.includes(t4) && h3++, p3 = p3.parentElement;
          }
          if (h3 > 0 && !a2(n3)) {
            const t4 = e3.createDocumentFragment();
            for (; n3.firstChild; ) t4.appendChild(n3.firstChild);
            return n3.replaceWith(t4), r3++, true;
          }
          return false;
        }, d2 = () => {
          const e4 = Array.from(t3.children).filter((t4) => o2.BLOCK_ELEMENTS.includes(t4.tagName.toLowerCase()));
          let r4 = false;
          return e4.forEach((t4) => {
            u2(t4) && (r4 = true);
          }), r4;
        }, m2 = () => {
          const e4 = Array.from(t3.querySelectorAll(o2.BLOCK_ELEMENTS.join(","))).sort((t4, e5) => {
            const r5 = (t5) => {
              let e6 = 0, r6 = t5.parentElement;
              for (; r6; ) {
                const t6 = r6.tagName.toLowerCase();
                o2.BLOCK_ELEMENTS.includes(t6) && e6++, r6 = r6.parentElement;
              }
              return e6;
            };
            return r5(e5) - r5(t4);
          });
          let r4 = false;
          return e4.forEach((t4) => {
            u2(t4) && (r4 = true);
          }), r4;
        }, h2 = () => {
          const n3 = Array.from(t3.querySelectorAll(o2.BLOCK_ELEMENTS.join(",")));
          let i3 = false;
          return n3.forEach((t4) => {
            const o3 = Array.from(t4.children);
            if (o3.length > 0 && o3.every((t5) => "p" === t5.tagName.toLowerCase()) || !s2(t4) && l2(t4)) {
              const o4 = e3.createDocumentFragment();
              for (; t4.firstChild; ) o4.appendChild(t4.firstChild);
              t4.replaceWith(o4), r3++, i3 = true;
            }
          }), i3;
        };
        do {
          i2 = false, d2() && (i2 = true), m2() && (i2 = true), h2() && (i2 = true);
        } while (i2);
        const p2 = Date.now();
        (0, c.logDebug)("Flattened wrapper elements:", { count: r3, processingTime: `${(p2 - n2).toFixed(2)}ms` });
      }
    }, 864: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.headingRules = void 0;
      const o2 = r2(640);
      e2.headingRules = [{ selector: "h1, h2, h3, h4, h5, h6", element: "keep", transform: (t3) => {
        var e3;
        const r3 = t3.ownerDocument;
        if (!r3) return console.warn("No document available"), t3;
        const n = r3.createElement(t3.tagName);
        Array.from(t3.attributes).forEach((t4) => {
          o2.ALLOWED_ATTRIBUTES.has(t4.name) && n.setAttribute(t4.name, t4.value);
        });
        const i = t3.cloneNode(true), a = /* @__PURE__ */ new Map();
        Array.from(i.querySelectorAll("*")).forEach((t4) => {
          var e4, r4, o3, n2, s2, l;
          let c = false;
          if ("a" === t4.tagName.toLowerCase()) {
            const r5 = t4.getAttribute("href");
            ((null == r5 ? void 0 : r5.includes("#")) || (null == r5 ? void 0 : r5.startsWith("#"))) && (a.set(t4, (null === (e4 = t4.textContent) || void 0 === e4 ? void 0 : e4.trim()) || ""), c = true);
          }
          if (t4.classList.contains("anchor") && (a.set(t4, (null === (r4 = t4.textContent) || void 0 === r4 ? void 0 : r4.trim()) || ""), c = true), "button" === t4.tagName.toLowerCase() && (c = true), ("span" === t4.tagName.toLowerCase() || "div" === t4.tagName.toLowerCase()) && t4.querySelector('a[href^="#"]')) {
            const e5 = t4.querySelector('a[href^="#"]');
            e5 && a.set(t4, (null === (o3 = e5.textContent) || void 0 === o3 ? void 0 : o3.trim()) || ""), c = true;
          }
          if (c) {
            const e5 = t4.parentElement;
            e5 && e5 !== i && (null === (n2 = e5.textContent) || void 0 === n2 ? void 0 : n2.trim()) === (null === (s2 = t4.textContent) || void 0 === s2 ? void 0 : s2.trim()) && a.set(e5, (null === (l = t4.textContent) || void 0 === l ? void 0 : l.trim()) || "");
          }
        });
        Array.from(i.querySelectorAll("*")).filter((t4) => {
          if ("a" === t4.tagName.toLowerCase()) {
            const e4 = t4.getAttribute("href");
            return (null == e4 ? void 0 : e4.includes("#")) || (null == e4 ? void 0 : e4.startsWith("#"));
          }
          return !!t4.classList.contains("anchor") || ("button" === t4.tagName.toLowerCase() || !("span" !== t4.tagName.toLowerCase() && "div" !== t4.tagName.toLowerCase() || !t4.querySelector('a[href^="#"]')));
        }).forEach((t4) => t4.remove());
        let s = (null === (e3 = i.textContent) || void 0 === e3 ? void 0 : e3.trim()) || "";
        return !s && a.size > 0 && (s = Array.from(a.values())[0]), n.textContent = s, n;
      } }];
    }, 917: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.ExtractorRegistry = void 0;
      const o2 = r2(959), n = r2(248), i = r2(258), a = r2(458), s = r2(632), l = r2(397), c = r2(20), u = r2(732), d = r2(588);
      class m {
        static initialize() {
          this.register({ patterns: ["twitter.com", /\/x\.com\/.*/], extractor: n.TwitterExtractor }), this.register({ patterns: ["reddit.com", "old.reddit.com", "new.reddit.com", /^https:\/\/[^\/]+\.reddit\.com/], extractor: o2.RedditExtractor }), this.register({ patterns: ["youtube.com", "youtu.be", /youtube\.com\/watch\?v=.*/, /youtu\.be\/.*/], extractor: i.YoutubeExtractor }), this.register({ patterns: [/news\.ycombinator\.com\/item\?id=.*/], extractor: a.HackerNewsExtractor }), this.register({ patterns: [/^https?:\/\/chatgpt\.com\/(c|share)\/.*/], extractor: s.ChatGPTExtractor }), this.register({ patterns: [/^https?:\/\/claude\.ai\/(chat|share)\/.*/], extractor: l.ClaudeExtractor }), this.register({ patterns: [/^https?:\/\/grok\.com\/(chat|share)(\/.*)?$/], extractor: c.GrokExtractor }), this.register({ patterns: [/^https?:\/\/gemini\.google\.com\/app\/.*/], extractor: u.GeminiExtractor }), this.register({ patterns: ["github.com", /^https?:\/\/github\.com\/.*/], extractor: d.GitHubExtractor });
        }
        static register(t3) {
          this.mappings.push(t3);
        }
        static findExtractor(t3, e3, r3) {
          try {
            const o3 = new URL(e3).hostname;
            if (this.domainCache.has(o3)) {
              const n2 = this.domainCache.get(o3);
              return n2 ? new n2(t3, e3, r3) : null;
            }
            for (const { patterns: n2, extractor: i2 } of this.mappings) {
              if (n2.some((t4) => t4 instanceof RegExp ? t4.test(e3) : o3.includes(t4))) return this.domainCache.set(o3, i2), new i2(t3, e3, r3);
            }
            return this.domainCache.set(o3, null), null;
          } catch (t4) {
            return console.error("Error in findExtractor:", t4), null;
          }
        }
        static clearCache() {
          this.domainCache.clear();
        }
      }
      e2.ExtractorRegistry = m, m.mappings = [], m.domainCache = /* @__PURE__ */ new Map(), m.initialize();
    }, 959: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.RedditExtractor = void 0;
      const o2 = r2(279);
      class n extends o2.BaseExtractor {
        constructor(t3, e3) {
          super(t3, e3), this.shredditPost = t3.querySelector("shreddit-post");
        }
        canExtract() {
          return !!this.shredditPost;
        }
        extract() {
          var t3, e3;
          const r3 = this.getPostContent(), o3 = this.extractComments(), n2 = this.createContentHtml(r3, o3), i = (null === (e3 = null === (t3 = this.document.querySelector("h1")) || void 0 === t3 ? void 0 : t3.textContent) || void 0 === e3 ? void 0 : e3.trim()) || "", a = this.getSubreddit(), s = this.getPostAuthor(), l = this.createDescription(r3);
          return { content: n2, contentHtml: n2, extractedContent: { postId: this.getPostId(), subreddit: a, postAuthor: s }, variables: { title: i, author: s, site: `r/${a}`, description: l } };
        }
        getPostContent() {
          var t3, e3, r3, o3;
          return ((null === (e3 = null === (t3 = this.shredditPost) || void 0 === t3 ? void 0 : t3.querySelector('[slot="text-body"]')) || void 0 === e3 ? void 0 : e3.innerHTML) || "") + ((null === (o3 = null === (r3 = this.shredditPost) || void 0 === r3 ? void 0 : r3.querySelector("#post-image")) || void 0 === o3 ? void 0 : o3.outerHTML) || "");
        }
        createContentHtml(t3, e3) {
          return `
			<div class="reddit-post">
				<div class="post-content">
					${t3}
				</div>
			</div>
			${e3 ? `
				<hr>
				<h2>Comments</h2>
				<div class="reddit-comments">
					${e3}
				</div>
			` : ""}
		`.trim();
        }
        extractComments() {
          const t3 = Array.from(this.document.querySelectorAll("shreddit-comment"));
          return this.processComments(t3);
        }
        getPostId() {
          const t3 = this.url.match(/comments\/([a-zA-Z0-9]+)/);
          return (null == t3 ? void 0 : t3[1]) || "";
        }
        getSubreddit() {
          const t3 = this.url.match(/\/r\/([^/]+)/);
          return (null == t3 ? void 0 : t3[1]) || "";
        }
        getPostAuthor() {
          var t3;
          return (null === (t3 = this.shredditPost) || void 0 === t3 ? void 0 : t3.getAttribute("author")) || "";
        }
        createDescription(t3) {
          var e3;
          if (!t3) return "";
          const r3 = document.createElement("div");
          return r3.innerHTML = t3, (null === (e3 = r3.textContent) || void 0 === e3 ? void 0 : e3.trim().slice(0, 140).replace(/\s+/g, " ")) || "";
        }
        processComments(t3) {
          var e3;
          let r3 = "", o3 = -1, n2 = [];
          for (const i of t3) {
            const t4 = parseInt(i.getAttribute("depth") || "0"), a = i.getAttribute("author") || "", s = i.getAttribute("score") || "0", l = i.getAttribute("permalink") || "", c = (null === (e3 = i.querySelector('[slot="comment"]')) || void 0 === e3 ? void 0 : e3.innerHTML) || "", u = i.querySelector("faceplate-timeago"), d = (null == u ? void 0 : u.getAttribute("ts")) || "", m = d ? new Date(d).toISOString().split("T")[0] : "";
            if (0 === t4) {
              for (; n2.length > 0; ) r3 += "</blockquote>", n2.pop();
              r3 += "<blockquote>", n2 = [0], o3 = 0;
            } else if (t4 < o3) for (; n2.length > 0 && n2[n2.length - 1] >= t4; ) r3 += "</blockquote>", n2.pop();
            else t4 > o3 && (r3 += "<blockquote>", n2.push(t4));
            r3 += `<div class="comment">
	<div class="comment-metadata">
		<span class="comment-author"><strong>${a}</strong></span> •
		<a href="https://reddit.com${l}" class="comment-link">${s} points</a> •
		<span class="comment-date">${m}</span>
	</div>
	<div class="comment-content">${c}</div>
</div>`, o3 = t4;
          }
          for (; n2.length > 0; ) r3 += "</blockquote>", n2.pop();
          return r3;
        }
      }
      e2.RedditExtractor = n;
    }, 968: (t2, e2, r2) => {
      Object.defineProperty(e2, "__esModule", { value: true }), e2.ContentScorer = void 0;
      const o2 = r2(640), n = ["admonition", "article", "content", "entry", "image", "img", "font", "figure", "figcaption", "pre", "main", "post", "story", "table"], i = ["advertisement", "all rights reserved", "banner", "cookie", "comments", "copyright", "follow me", "follow us", "footer", "header", "homepage", "login", "menu", "more articles", "more like this", "most read", "nav", "navigation", "newsletter", "newsletter", "popular", "privacy", "recommended", "register", "related", "responses", "share", "sidebar", "sign in", "sign up", "signup", "social", "sponsored", "subscribe", "subscribe", "terms", "trending"], a = ["ad", "banner", "cookie", "copyright", "footer", "header", "homepage", "menu", "nav", "newsletter", "popular", "privacy", "recommended", "related", "rights", "share", "sidebar", "social", "sponsored", "subscribe", "terms", "trending", "widget"];
      class s {
        constructor(t3, e3 = false) {
          this.doc = t3, this.debug = e3;
        }
        static scoreElement(t3) {
          let e3 = 0;
          const r3 = t3.textContent || "", n2 = r3.split(/\s+/).length;
          e3 += n2;
          e3 += 10 * t3.getElementsByTagName("p").length;
          e3 -= 5 * (t3.getElementsByTagName("a").length / (n2 || 1));
          e3 -= 3 * (t3.getElementsByTagName("img").length / (n2 || 1));
          try {
            const r4 = t3.getAttribute("style") || "", o3 = t3.getAttribute("align") || "";
            (r4.includes("float: right") || r4.includes("text-align: right") || "right" === o3) && (e3 += 5);
          } catch (t4) {
          }
          /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i.test(r3) && (e3 += 10);
          /\b(?:by|written by|author:)\s+[A-Za-z\s]+\b/i.test(r3) && (e3 += 10);
          const i2 = t3.className.toLowerCase();
          (i2.includes("content") || i2.includes("article") || i2.includes("post")) && (e3 += 15);
          t3.querySelector(o2.FOOTNOTE_INLINE_REFERENCES) && (e3 += 10);
          t3.querySelector(o2.FOOTNOTE_LIST_SELECTORS) && (e3 += 10);
          if (e3 -= 5 * t3.getElementsByTagName("table").length, "td" === t3.tagName.toLowerCase()) {
            const r4 = t3.closest("table");
            if (r4) {
              const o3 = parseInt(r4.getAttribute("width") || "0"), n3 = r4.getAttribute("align") || "", i3 = r4.className.toLowerCase();
              if (o3 > 400 || "center" === n3 || i3.includes("content") || i3.includes("article")) {
                const o4 = Array.from(r4.getElementsByTagName("td")), n4 = o4.indexOf(t3);
                n4 > 0 && n4 < o4.length - 1 && (e3 += 10);
              }
            }
          }
          return e3;
        }
        static findBestElement(t3, e3 = 50) {
          let r3 = null, o3 = 0;
          return t3.forEach((t4) => {
            const e4 = this.scoreElement(t4);
            e4 > o3 && (o3 = e4, r3 = t4);
          }), o3 > e3 ? r3 : null;
        }
        static scoreAndRemove(t3, e3 = false) {
          const r3 = Date.now();
          let n2 = 0;
          const i2 = /* @__PURE__ */ new Set();
          Array.from(t3.querySelectorAll(o2.BLOCK_ELEMENTS.join(","))).forEach((t4) => {
            if (i2.has(t4)) return;
            if (s.isLikelyContent(t4)) return;
            s.scoreNonContentBlock(t4) < 0 && (i2.add(t4), n2++);
          }), i2.forEach((t4) => t4.remove());
          const a2 = Date.now();
          e3 && console.log("Defuddle", "Removed non-content blocks:", { count: n2, processingTime: `${(a2 - r3).toFixed(2)}ms` });
        }
        static isLikelyContent(t3) {
          const e3 = t3.getAttribute("role");
          if (e3 && ["article", "main", "contentinfo"].includes(e3)) return true;
          const r3 = t3.className.toLowerCase(), o3 = t3.id.toLowerCase();
          for (const t4 of n) if (r3.includes(t4) || o3.includes(t4)) return true;
          const i2 = (t3.textContent || "").split(/\s+/).length, a2 = t3.getElementsByTagName("p").length;
          return i2 > 50 && a2 > 1 || (i2 > 100 || i2 > 30 && a2 > 0);
        }
        static scoreNonContentBlock(t3) {
          if (t3.querySelector(o2.FOOTNOTE_LIST_SELECTORS)) return 0;
          let e3 = 0;
          const r3 = t3.textContent || "", n2 = r3.split(/\s+/).length;
          if (n2 < 3) return 0;
          for (const t4 of i) r3.toLowerCase().includes(t4) && (e3 -= 10);
          const s2 = t3.getElementsByTagName("a").length;
          s2 / (n2 || 1) > 0.5 && (e3 -= 15);
          const l = t3.getElementsByTagName("ul").length + t3.getElementsByTagName("ol").length;
          l > 0 && s2 > 3 * l && (e3 -= 10);
          const c = t3.className.toLowerCase(), u = t3.id.toLowerCase();
          for (const t4 of a) (c.includes(t4) || u.includes(t4)) && (e3 -= 8);
          return e3;
        }
      }
      e2.ContentScorer = s;
    } }, e = {};
    function r(o2) {
      var n = e[o2];
      if (void 0 !== n) return n.exports;
      var i = e[o2] = { exports: {} };
      return t[o2](i, i.exports, r), i.exports;
    }
    var o = {};
    return (() => {
      var t2 = o;
      const e2 = r(628);
      t2.default = e2.Defuddle;
    })(), o = o.default;
  })());
})(dist);
var distExports = dist.exports;
const index = /* @__PURE__ */ getDefaultExportFromCjs(distExports);
const index$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [distExports]);
export {
  index$1 as i
};
