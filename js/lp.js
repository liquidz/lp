// ================================================
//
//	Lazy Presentation
//
//	Copyright (C) 2009 Masashi Iizuka
//	Dual licensed under the MIT and GPL licenses
//
//	Last update: 2009-06-18
//
// ================================================

if(typeof window.LP !== 'undefined') delete window.LP;

LP = {};
LP.VERSION = "0.02";
LP.slide = [];
LP.currentSlide = 0;
LP.options = {};
LP.optag = { fg: "fg", bg: "bg", effectSpeed: "effectSpeed" };
LP.modeKind = {
	slide: 0,
	viewAll: 1
};
LP.mode = LP.modeKind.slide;  // プレゼンの表示モード(slide, allView)
LP.isToggling = false;        // スライドを切り替え中かどうかを扱うフラグ

LP.effectSpeed = 250;
LP.key = { up: 38, down: 40, right: 39, left: 37, home: 36 };

LP.class = {
	slide: ["slide", "main"],
	pager: "pager",
	sublist: "sublist"
};
LP.id = { slide: "#slide" };

LP.style = {
	slide: {
		slideMode : {
			width: "94%",
			height: "94%",
			margin: "1% auto 0 auto",
			float: "none"
		},
		viewAllMode: {
			float: "left",
			margin: "1%"
		}
	}
};

// =common {{{
LP.common = {
	elem: function(tag, op){
		var e = jQuery(document.createElement(tag));
		if(op){
			for(var key in arguments[1]){
				if(key === "class") e.addClass(arguments[1][key]);
				else if(key === "text") e.text(arguments[1][key]);
				else if(key === "html") e.html(arguments[1][key]);
				else e.attr(key, arguments[1][key]);
			}
		}
		return e;
	},

	p: function(text){
		return this.elem("p", {text: text});
	},

	getOptionValue: function(tag){
		return (LP.options[tag]) ? LP.options[tag] : null;
	},

	setBg: function(fn){
		var bg = LP.common.getOptionValue(LP.optag.bg);
		if(bg) fn(bg);
	},
	setFg: function(fn){
		var fg = LP.common.getOptionValue(LP.optag.fg);
		if(fg) fn(fg);
	},

	updateEffectSpeed: function(){
		var es = LP.common.getOptionValue(LP.optag.effectSpeed);
		if(es) LP.effectSpeed = parseInt(es);
	}
}; // }}}

// ----------- customable functions -----------

// =show, =hide
//    default show/hide function
// ----------------------------------------------
LP.show = function(obj, callback){
	if(callback) obj.fadeIn(LP.getEffectSpeed(), callback);
	else obj.fadeIn(LP.getEffectSpeed());
};
LP.hide = function(obj, callback){
	if(callback) obj.fadeOut(LP.getEffectSpeed(), callback);
	else obj.fadeOut(LP.getEffectSpeed());
};

// =slideTitle
//    default making title function
// ----------------------------------------------
LP.slideTitle = function(title){
	var elem = LP.common.elem;
	var fc = title.substr(0, 1);
	var rest = title.substr(1);
	var h2 = elem("h2");
	h2.append(elem("span", {text: fc}).css("font-size", "150%"));
	h2.append(elem("span", {text: rest}));
	return h2;
};

LP.slideTakahashi = function(title){
	var h4 = LP.common.elem("h4", {text: title, class: "takahashi"});
	return h4;
};

// =slidePageNum
//    default making page function
// ----------------------------------------------
LP.slidePageNum = function(page){
	return LP.common.p(page);
};

// =Slide Class {{{
// ----------------------------------------------
LP.Slide = function(title, page, options){
	this.title = title;
	this.page = page;
	this.body = new Array();
	this.subsection = false;

	// methods
	this.takahashi = false;

	if(options){
		if(options.takahashi) this.takahashi = options.takahashi;
	}
};
LP.Slide.prototype = {
	add: function(obj){
		this.body.push(obj);
		return this;
	},

	setSubsection: function(bool){
		this.subsection = bool;
	},
	
	toString: function(){
		var elem = LP.common.elem;
		var box = elem("div", {
			id: LP.id.slide.substr(1) + this.page,
			class: "slide softbox"
		});

		var head = null, body = null, foot = null;
		var link = elem("div", { class: "cell left" });
		var page = elem("div", { class: "cell last" });

		if(this.takahashi){
			box.addClass("col-3");
			head = elem("div", { class: "cell"});
			body = elem("div", { class: "cell main center"});
			foot = elem("div", { class: "cell span-2"});

			body.append(elem("h4", { text: this.title, class: "takahashi" }));
		} else {
			box.addClass("col-10");
			head = elem("div", { class: "cell-2 center" });
			body = elem("div", { class: "cell-7 main" });
			foot = elem("div", { class: "cell-1 span-2" });

			head.append(LP.slideTitle(this.title));
			jQuery.each(this.body, function(){
				body.append(this);
			});

		}

		link.append(elem("p", { class: "bottom" }).append(elem("a", {
			href: "http://github.com/liquidz/lp/tree/master",
			text: "powered by lp " + LP.VERSION
		})));
		page.append(LP.slidePageNum(this.page).addClass(LP.class.pager + " bottom right"));

		foot.append(link).append(page);
		box.append(head).append(body).append(foot);

		return box;
	}
}; // }}}

// =List Class {{{
// ----------------------------------------------
LP.List = function(){
	this.active = false;
	this.body = null;
	this.isSubList = false;
};
LP.List.prototype = {
	subList: function(bool){
		this.isSubList = bool;
	},
	finish: function(){
		if(this.active){
			this.active = false;

			var tmp = this.body;
			this.body = null;
			return (this.isSubList) ? tmp.addClass(LP.class.sublist) : tmp;
		}
		return null;
	},
	add: function(obj){
		if(!this.active){
			this.body = LP.common.elem("ul");
			this.active = true;
		}
		this.body.append(obj);
	}
}; // }}}

// =Table Class {{{
// ----------------------------------------------
LP.Table = function(){
	this.active = false;
	this.body = null;
};
LP.Table.prototype = {
	finish: function(){
		if(this.active){
			this.active = false;
			var tmp = this.body;
			this.body = null;
			return tmp;
		}
		return null;
	},
	add: function(objs){
		var elem = LP.common.elem;
		var tr = elem("tr");
		var th = false;

		if(!this.active){
			this.body = elem("table");
			this.active = true;
			th = true;
		}
		for(var i = 0, l = objs.length; i < l; ++i){
			tr.append(elem((th ? "th" : "td"), {text: objs[i]}));
		}
		this.body.append(tr);
	}
}; // }}}

// =parseContents {{{
// ----------------------------------------------
LP.parseContents = function(cont){
	var list = new LP.List();
	var page = null;
	var result = new Array();
	var pageCount = 1;

	var lists = {};
	var lastLevel = 0;
	lists[0] = new LP.List();

	var table = new LP.Table();

	var closeLists = function(){
		for(var i = lastLevel; i > 0; --i){
			lists[i-1].add(lists[i].finish());
			lists[i] = null;
		}
		page.add(lists[0].finish());
		lastLevel = 0;
	};

	var str = cont;
	while(str !== ""){
		if(str.match(/^(\=+)\s*(.+?)(\n|$)/)){
			// header

			// リストを作成中だったら閉じる
			if(lists[lastLevel].active) closeLists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());


			if(page !== null) result.push(page);

			var level = RegExp.$1.length;
			var title = RegExp.$2;
			var rest = RegExp.rightContext;
			page = new LP.Slide(title, pageCount++);
			if(level > 1) page.setSubsection(true);
			str = jQuery.trim(rest);
		} else if(str.match(/^\!\=\s*(.+?)(\n|$)/)){
			// header only

			// リストを作成中だったら閉じる
			if(lists[lastLevel].active) closeLists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			if(page !== null) result.push(page);
			var title = RegExp.$1;
			var rest = RegExp.rightContext;
			page = new LP.Slide(title, pageCount++, {takahashi: true});
			page.setSubsection(true);
			str = jQuery.trim(rest);

		} else if(str.match(/^(\*+)\s*(.+?)(\n|$)/)){
			// list
			var level = RegExp.$1.length - 1;
			var text = RegExp.$2;
			var rest = RegExp.rightContext;

			if(level > lastLevel){
				lists[level] = new LP.List();
				if(level > 0) lists[level].subList(true);
			} else if(level < lastLevel){
				for(var i = lastLevel; i > level; --i){
					lists[i - 1].add(lists[i].finish());
					lists[i] = null;
				}
			}
			lists[level].add(LP.common.elem("li", {text: text}));
			lastLevel = level;
			str = jQuery.trim(rest);

			// $
			if(str === ""){
				for(var i = lastLevel; i > 0; --i){
					lists[i-1].add(lists[i].finish());
					lists[i] = null;
				}
				page.add(lists[0].finish());
			}
		} else if(str.match(/^\|(.+?)\|(\n|$)/)){
			// table

			// リストを作成中だったら閉じる
			if(lists[lastLevel].active) closeLists();

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			table.add(text.split("|"));

			str = jQuery.trim(rest);

			// $
			if(str === "") page.add(table.finish());
		} else if(str.match(/^\{\{\{([\s\S]+?)\}\}\}(\n|$)/)){
			// code

			// リストを作成中だったら閉じる
			if(lists[lastLevel].active) closeLists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			var tt = text.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");

			page.add(LP.common.elem("div", {class: "code"}).append(LP.common.elem("code", {class: "prettyprint", html: jQuery.trim(tt)})));
			str = jQuery.trim(rest);
		} else if(str.match(/^#ref\((.+?)\)/)){
			// image

			// リストを作成中だったら閉じる
			if(lists[lastLevel].active) closeLists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			page.add(LP.common.elem("img", {src: text}));

			str = jQuery.trim(rest);
		} else if(str.match(/^\%(.+?)(\n|$)/)){
			// option
			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			var val = text.split("=");
			if(val.length === 2) LP.options[jQuery.trim(val[0])] = jQuery.trim(val[1]);
			str = jQuery.trim(rest);
		} else {
			// p

			// リストを作成中だったら閉じる
			if(lists[lastLevel].active) closeLists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			if(str.match(/(.+?)\n/)){
				var text = RegExp.$1;
				var rest = RegExp.rightContext;
				page.add(LP.common.p(text));
				str = jQuery.trim(rest);
			} else {
				page.add(LP.common.p(str));
				str = "";
			}
		}
	}
	if(page !== null) result.push(page);

	return result;
}; // }}}

// =getEffectSpeed
// ----------------------------------------------
LP.getEffectSpeed = function(){
	return (LP.options["nowait"]) ? 0 : LP.effectSpeed;
};

// =toggleSlide
// ----------------------------------------------
LP.toggleSlide = function(from, to){
	// start
	if(LP.isToggling) return;

	LP.isToggling = true;
	LP.hide(from, function(){
		LP.show(to, function(){
			// end
			LP.isToggling = false;
		});
	});
};

// =next
// ----------------------------------------------
LP.next = function(){
	if(LP.mode === LP.modeKind.slide && !LP.isToggling){
		var last = LP.currentSlide;
		if(LP.currentSlide < LP.slide.length - 1){
			++LP.currentSlide;
			LP.toggleSlide($(LP.id.slide + last), $(LP.id.slide + LP.currentSlide));
		} else {
			// 一覧に戻る
			LP.changeToViewAllMode();
		}
	}
};
// =prev
// ----------------------------------------------
LP.prev = function(){
	if(LP.mode === LP.modeKind.slide && !LP.isToggling){
		var last = LP.currentSlide;
		if(LP.currentSlide > 0){
			--LP.currentSlide;
			LP.toggleSlide($(LP.id.slide + last), $(LP.id.slide + LP.currentSlide));
		}
	}
};

// =updateSize
// ----------------------------------------------
LP.updateSize = function(){
	if(LP.mode === LP.modeKind.viewAll){
		var w = $("body").width();
		var s = $("div." + LP.class.slide[0]);
		s.width(w * 14 / 64);
		s.height(s.width() * 2 / 3);
	}

	// スライド一覧からTOCを選ぶと何故かフォントサイズがちゃんと変更されないので
	// TOCを表示する場合には違うスライドを選ぶ
	var ss = $(LP.id.slide + ((LP.currentSlide === 0) ? "1" : "0"));
	var title = $(LP.id.slide + "0 div." + LP.class.slide[1] + " h2")
	var fontSize = (ss.width() * 3 / 5) / ((title.text().length > 10) ? title.text().length / 2 : title.text().length);
	fontSize = (fontSize > ss.height() / 12) ? ss.height() / 12 : fontSize;
	$("h2").css("font-size", fontSize + "px");
	$("body").css("font-size", fontSize * 2 / 5 + "px");
	$("table tr th, table tr td").css("font-size", fontSize * 2 / 5 + "px");
	$("code").css("font-size", fontSize / 3 + "px");
	$("p." + LP.class.pager).css("font-size", fontSize / 3 + "px");
};

// =tableOfContents
// ----------------------------------------------
LP.tableOfContents = function(title){
	var toc = new LP.Slide(title, 0);
	var list = new LP.List();

	// date
	var date = "";
	if(LP.options["date"]) date = LP.options["date"];
	// author
	var author = "";
	if(LP.options["author"]) author = LP.options["author"];
	var tmp = jQuery.trim(date + " " + author);
	if(tmp !== "") toc.add(LP.common.p(tmp).addClass("center"));

	// sections
	toc.add(LP.common.elem("h3", {text: "Table of Contents"}));
	jQuery.each(LP.slide, function(){
		if(!this.subsection)
			list.add(LP.common.elem("li", {text: this.title}));
	});
	toc.add(list.finish());

	return toc;
};

// =changeToSlideMode {{{
// ----------------------------------------------
LP.changeToSlideMode = function(){
	var slides = $("div." + LP.class.slide[0]);
	for(var key in LP.style.slide.slideMode){
		slides.css(key, LP.style.slide.slideMode[key]);
	}
	slides.hide();
	LP.show($(LP.id.slide + LP.currentSlide));
	$("img").show();

	slides.unbind("click", LP.selectSlide);

	LP.mode = LP.modeKind.slide;
	LP.updateSize();
}; // }}}

// =changeToViewAllMode {{{
// ----------------------------------------------
LP.changeToViewAllMode = function(){
	var slides = $("div." + LP.class.slide[0]);
	for(var key in LP.style.slide.viewAllMode){
		slides.css(key, LP.style.slide.viewAllMode[key]);
	}

	slides.show();
	// スライド一覧モードでは画像を表示しない
	$("img").hide();

	slides.bind("click", LP.selectSlide);

	LP.mode = LP.modeKind.viewAll;
	LP.updateSize();
}; // }}}

// =selectSlide {{{
// ----------------------------------------------
LP.selectSlide = function(e){
	LP.currentSlide = parseInt(e.currentTarget.id.substr(LP.id.slide.length - 1));
	LP.changeToSlideMode();
}; // }}}

// =keyControl {{{
// ----------------------------------------------
LP.keyControl = function(e){
	switch(e.keyCode){
	case LP.key.right:
	case LP.key.down:
		LP.next();
		break;

	case LP.key.left:
	case LP.key.up:
		LP.prev();
		break;

	case LP.key.home:
		if(LP.mode === LP.modeKind.slide){
			LP.changeToViewAllMode();
		} else {
			LP.changeToSlideMode();
		}
		break;

	default:
		break;
	}
}; // }}}

// =wheelControl {{{
// ----------------------------------------------
LP.wheelControl = function(event, delta){
	if(LP.mode === LP.modeKind.slide && !LP.wheelFlag){

		event.stopPropagation();
		event.preventDefault();

		if(delta > 0) LP.prev();
		else LP.next();

		return false;
	}
}; // }}}

// =initialize
// ----------------------------------------------
LP.initialize = function(){
	// change font size
	LP.updateSize();

	// add events
	var w = $(window);
	w.bind("resize", LP.updateSize);
	w.bind("keypress", LP.keyControl);
	//$("div." + LP.class.slide[0]).mousewheel(LP.wheelControl);
	$("body").mousewheel(LP.wheelControl);

	// set options
	var body = $("body");
	LP.common.setBg(function(bg){ body.css("background", bg) });
	LP.common.setFg(function(fg){
			body.css("color", fg);
			$("table tr th, table tr td").css("border", "1px solid " + fg);
			});

	LP.common.updateEffectSpeed();

	//if(LP.options["effectSpeed"]) LP.effectSpeed = parseInt(LP.options["effectSpeed"]);
};

// =main
// ----------------------------------------------
$(function(){
		var title = $("head title").text();
		var body = $("body");
		var contents = jQuery.trim($("body pre").html());

		// clear body
		body.text("");

		// parse body text
		LP.slide = LP.parseContents(contents);

		LP.slide.unshift(LP.tableOfContents(title));

		// add table of contents(page = 0)
		//body.append(LP.tableOfContents(title));

		// add each slides(page = 1 - LP.slide.length)
		jQuery.each(LP.slide, function(){
			body.append(this.toString());
			if(this.page !== 0)
			$(LP.id.slide + this.page).hide();
			});

		// initialize
		LP.initialize();

		prettyPrint();
});

