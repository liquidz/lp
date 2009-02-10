/* ================================================

	Lazy Presentation

	Copyright (C) 2009 Masashi Iizuka
	Dual licensed under the MIT and GPL licenses

	Last update: 2009-02-10

   ================================================ */

if(typeof window.lp != 'undefined') delete window.lp;

var lp = {};
lp.slide = [];
lp.current_slide = 0;
lp.options = {};
lp.mode_kind = {
	slide: 0,
	view_all: 1
};
lp.mode = lp.mode_kind.slide;  // プレゼンの表示モード(slide, all_view)
lp.is_toggling = false;        // スライドを切り替え中かどうかを扱うフラグ

lp.common = {
	elem: function(tag, op){
		var e = jQuery(document.createElement(tag));
		if(op){
			for(var key in arguments[1]){
				if(key == "class") e.addClass(arguments[1][key]);
				else if(key == "text") e.text(arguments[1][key]);
				else if(key == "html") e.html(arguments[1][key]);
				else e.attr(key, arguments[1][key]);
			}
		}
		return e;
	},

	p: function(text){
		return this.elem("p", {text: text});
	},

	clearer: function(){
		var clearer = lp.common.elem("div");
		clearer.css("clear", "both");
		clearer.css("height", "0");
		clearer.css("font-size", "0");
		return clearer;
	}
};

lp.effect_speed = 250;
lp.key = { up: 38, down: 40, right: 39, left: 37, home: 36 };

lp.class = {
	slide: ["slide", "main"],
	pager: "pager",
	sublist: "sublist"
};
lp.id = { slide: "#slide" };

lp.style = {
	slide: {
		slide_mode : {
			width: "94%",
			height: "94%",
			margin: "1% auto 0 auto",
			float: "none"
		},
		view_all_mode: {
			float: "left",
			margin: "1%"
		}
	}

};

/* ----------- customable functions ----------- */

/* =show, =hide
    default show/hide function
 ---------------------------------------------- */
lp.show = function(obj, callback){
	if(callback) obj.fadeIn(lp.get_effect_speed(), callback);
	else obj.fadeIn(lp.get_effect_speed());
};
lp.hide = function(obj, callback){
	if(callback) obj.fadeOut(lp.get_effect_speed(), callback);
	else obj.fadeOut(lp.get_effect_speed());
};

/* =slide_title
    default making title function
 ---------------------------------------------- */
lp.slide_title = function(title){
	var fc = title.substr(0, 1);
	var rest = title.substr(1);
	var h2 = lp.common.elem("h2");
	h2.append(lp.common.elem("span", {text: fc}).css("font-size", "150%"));
	h2.append(lp.common.elem("span", {text: rest}));
	return h2;
};

/* =slide_page
    default making page function
 ---------------------------------------------- */
lp.slide_page = function(page){
	return lp.common.p(page);
};

/* =Slide Class
 ---------------------------------------------- */
lp.Slide = function(title, page){
	this.title = title;
	this.page = page;
	this.body = new Array();
	this.subsection = false;
};
lp.Slide.prototype = {
	add: function(obj){
		this.body.push(obj);
		return this;
	},

	set_subsection: function(bool){
		this.subsection = bool;
	},
	
	to_s: function(){
		var box = lp.common.elem("div", {
			id: lp.id.slide.substr(1) + this.page,
			class: lp.class.slide[0]
		});
		var main = lp.common.elem("div", {class: lp.class.slide[1]});
		main.append(lp.slide_title(this.title));

		jQuery.each(this.body, function(){
			main.append(this);
		});

		box.append(main);
		var link = lp.common.elem("p");
		link.append(lp.common.elem("a", {
			href: "http://github.com/liquidz/lp/tree/master",
			text: "powered by lp"
		}));
		link.css("float", "left");

		var pager = lp.slide_page(this.page).addClass(lp.class.pager).css("float", "right");

		box.append(link);
		box.append(pager);
		box.append(lp.common.clearer());

		return box;
	}
};

/* =List Class
 ---------------------------------------------- */
lp.List = function(){
	this.active = false;
	this.body = null;
	this.is_sub_list = false;
};
lp.List.prototype = {
	sub_list: function(bool){
		this.is_sub_list = bool;
	},
	finish: function(){
		if(this.active){
			this.active = false;

			var tmp = this.body;
			this.body = null;
			return (this.is_sub_list) ? tmp.addClass(lp.class.sublist) : tmp;
		}
		return null;
	},
	add: function(obj){
		if(!this.active){
			this.body = lp.common.elem("ul");
			this.active = true;
		}
		this.body.append(obj);
	}
};

/* =Table Class
 ---------------------------------------------- */
lp.Table = function(){
	this.active = false;
	this.body = null;
};
lp.Table.prototype = {
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
		var tr = lp.common.elem("tr");
		var th = false;

		if(!this.active){
			this.body = lp.common.elem("table");
			this.active = true;
			th = true;
		}
		for(var i = 0; i < objs.length; ++i){
			tr.append(lp.common.elem((th ? "th" : "td"), {text: objs[i]}));
		}
		this.body.append(tr);
	}
};

/* =parse_contents
 ---------------------------------------------- */
lp.parse_contents = function(cont){
	var list = new lp.List();
	var page = null;
	var result = new Array();
	var page_count = 1;

	var lists = {};
	var last_level = 0;
	lists[0] = new lp.List();

	var table = new lp.Table();

	var close_lists = function(){
		for(var i = last_level; i > 0; --i){
			lists[i-1].add(lists[i].finish());
			lists[i] = null;
		}
		page.add(lists[0].finish());
		last_level = 0;
	};

	var str = cont;
	while(str != ""){
		if(str.match(/^(\=+)\s*(.+?)(\n|$)/)){
			// header

			// リストを作成中だったら閉じる
			if(lists[last_level].active) close_lists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());


			if(page != null) result.push(page);

			var level = RegExp.$1.length;
			var title = RegExp.$2;
			var rest = RegExp.rightContext
			page = new lp.Slide(title, page_count++);
			if(level > 1) page.set_subsection(true);
			str = jQuery.trim(rest);
		} else if(str.match(/^(\*+)\s*(.+?)(\n|$)/)){
			// list
			var level = RegExp.$1.length - 1;
			var text = RegExp.$2;
			var rest = RegExp.rightContext;

			if(level > last_level){
				lists[level] = new lp.List();
				if(level > 0) lists[level].sub_list(true);
			} else if(level < last_level){
				for(var i = last_level; i > level; --i){
					lists[i - 1].add(lists[i].finish());
					lists[i] = null;
				}
			}
			lists[level].add(lp.common.elem("li", {text: text}));
			last_level = level;
			str = jQuery.trim(rest);

			// $
			if(str == ""){
				for(var i = last_level; i > 0; --i){
					lists[i-1].add(lists[i].finish());
					lists[i] = null;
				}
				page.add(lists[0].finish());
			}
		} else if(str.match(/^\|(.+?)\|(\n|$)/)){
			// table

			// リストを作成中だったら閉じる
			if(lists[last_level].active) close_lists();

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			table.add(text.split("|"));

			str = jQuery.trim(rest);

			// $
			if(str == "") page.add(table.finish());
		} else if(str.match(/^\[\[([\s\S]+?)\]\](\n|$)/)){
			// code

			// リストを作成中だったら閉じる
			if(lists[last_level].active) close_lists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			var tt = text.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");

			page.add(lp.common.elem("div", {class: "code"}).append(lp.common.elem("code", {class: "prettyprint", html: jQuery.trim(tt)})));
			str = jQuery.trim(rest);
		} else if(str.match(/^#ref\((.+?)\)/)){
			// image

			// リストを作成中だったら閉じる
			if(lists[last_level].active) close_lists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			page.add(lp.common.elem("img", {src: text}));

			str = jQuery.trim(rest);
		} else if(str.match(/^\%(.+?)(\n|$)/)){
			// option
			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			var val = text.split("=");
			if(val.length == 2) lp.options[jQuery.trim(val[0])] = jQuery.trim(val[1]);
			str = jQuery.trim(rest);
		} else {
			// p

			// リストを作成中だったら閉じる
			if(lists[last_level].active) close_lists();
			// 表を作成中だったら閉じる
			if(table.active) page.add(table.finish());

			if(str.match(/(.+?)\n/)){
				var text = RegExp.$1;
				var rest = RegExp.rightContext;
				page.add(lp.common.p(text));
				str = jQuery.trim(rest);
			} else {
				page.add(lp.common.p(str));
				str = "";
			}
		}
	}
	result.push(page);

	return result;
};

/* =get_effect_speed
 ---------------------------------------------- */
lp.get_effect_speed = function(){
	return (lp.options["nowait"]) ? 0 : lp.effect_speed;
};

/* =toggle_slide
 ---------------------------------------------- */
lp.toggle_slide = function(from, to){
	// start
	if(lp.is_toggling) return;

	lp.is_toggling = true;
	lp.hide(from, function(){
		lp.show(to, function(){
			// end
			lp.is_toggling = false;
		});
	});
};

/* =next
 ---------------------------------------------- */
lp.next = function(){
	if(lp.mode == lp.mode_kind.slide && !lp.is_toggling){
		var last = lp.current_slide;
		if(lp.current_slide < lp.slide.length - 1) ++lp.current_slide;
		else lp.current_slide = 0;
		lp.toggle_slide($(lp.id.slide + last), $(lp.id.slide + lp.current_slide));
	}
};
/* =prev
 ---------------------------------------------- */
lp.prev = function(){
	if(lp.mode == lp.mode_kind.slide && !lp.is_toggling){
		var last = lp.current_slide;
		if(lp.current_slide > 0) --lp.current_slide;
		else lp.current_slide = lp.slide.length - 1;
		lp.toggle_slide($(lp.id.slide + last), $(lp.id.slide + lp.current_slide));
	}
};

/* =update_size
 ---------------------------------------------- */
lp.update_size = function(){
	if(lp.mode == lp.mode_kind.view_all){
		var w = $("body").width();
		var s = $("div." + lp.class.slide[0]);
		s.width(w * 14 / 64);
		s.height(s.width() * 2 / 3);
	}

	// スライド一覧からTOCを選ぶと何故かフォントサイズがちゃんと変更されないので
	// TOCを表示する場合には違うスライドを選ぶ
	var ss = $(lp.id.slide + ((lp.current_slide == 0) ? "1" : "0"));
	var title = $(lp.id.slide + "0 div." + lp.class.slide[1] + " h2")
	var font_size = (ss.width() * 3 / 5) / ((title.text().length > 10) ? title.text().length / 2 : title.text().length);
	font_size = (font_size > ss.height() / 12) ? ss.height() / 12 : font_size;
	$("h2").css("font-size", font_size + "px");
	$("body").css("font-size", font_size * 2 / 5 + "px");
	$("table tr th, table tr td").css("font-size", font_size * 2 / 5 + "px");
	$("code").css("font-size", font_size / 3 + "px");
	$("p." + lp.class.pager).css("font-size", font_size / 3 + "px");
};

/* =table_of_contents
 ---------------------------------------------- */
lp.table_of_contents = function(title){
	var toc = new lp.Slide(title, 0);
	var list = new lp.List();

	// date
	var date = "";
	if(lp.options["date"]) date = lp.options["date"];
	// author
	var author = "";
	if(lp.options["author"]) author = lp.options["author"];
	var tmp = jQuery.trim(date + " " + author);
	if(tmp != "") toc.add(lp.common.p(tmp).addClass("center"));

	// sections
	toc.add(lp.common.elem("h3", {text: "Table of Contents"}));
	jQuery.each(lp.slide, function(){
		if(!this.subsection)
			list.add(lp.common.elem("li", {text: this.title}));
	});
	toc.add(list.finish());

	return toc;
};

/* =change_to_slide_mode
 ---------------------------------------------- */
lp.change_to_slide_mode = function(){
	var slides = $("div." + lp.class.slide[0]);
	for(var key in lp.style.slide.slide_mode){
		slides.css(key, lp.style.slide.slide_mode[key]);
	}
	slides.hide();
	lp.show($(lp.id.slide + lp.current_slide));
	$("img").show();

	slides.unbind("click", lp.select_slide);

	lp.mode = lp.mode_kind.slide;
	lp.update_size();
};

/* =change_to_view_all_mode
 ---------------------------------------------- */
lp.change_to_view_all_mode = function(){
	var slides = $("div." + lp.class.slide[0]);
	for(var key in lp.style.slide.view_all_mode){
		slides.css(key, lp.style.slide.view_all_mode[key]);
	}

	slides.show();
	// スライド一覧モードでは画像を表示しない
	$("img").hide();

	slides.bind("click", lp.select_slide);

	lp.mode = lp.mode_kind.view_all;
	lp.update_size();
};

/* =select_slide
 ---------------------------------------------- */
lp.select_slide = function(e){
	lp.current_slide = parseInt(e.currentTarget.id.substr(lp.id.slide.length - 1));
	lp.change_to_slide_mode();
};

/* =key_control
 ---------------------------------------------- */
lp.key_control = function(e){
	switch(e.keyCode){
	case lp.key.right:
	case lp.key.down:
		lp.next();
		break;

	case lp.key.left:
	case lp.key.up:
		lp.prev();
		break;

	case lp.key.home:
		if(lp.mode == lp.mode_kind.slide){
			lp.change_to_view_all_mode();
		} else {
			lp.change_to_slide_mode();
		}
		break;

	default:
		break;
	}
};

/* =wheel_control
 ---------------------------------------------- */
lp.wheel_control = function(event, delta){
	if(lp.mode == lp.mode_kind.slide && !lp.wheel_flag){

		event.stopPropagation();
						event.preventDefault();

		if(delta > 0) lp.next();
		else lp.prev();
		
		return false;
	}
};

/* =initialize
 ---------------------------------------------- */
lp.initialize = function(){
	// change font size
	lp.update_size();

	// add events
	var w = $(window);
	w.bind("resize", lp.update_size);
	w.bind("keypress", lp.key_control);
	//$("div." + lp.class.slide[0]).mousewheel(lp.wheel_control);
	$("body").mousewheel(lp.wheel_control);

	// set options
	var body = $("body");
	if(lp.options["bg"]) body.css("background", lp.options["bg"]);
	if(lp.options["fg"]){
		body.css("color", lp.options["fg"]);
		$("table tr th, table tr td").css("border", "1px solid " + lp.options["fg"]);
	}
	if(lp.options["effect_speed"]) lp.effect_speed = parseInt(lp.options["effect_speed"]);
};

/* =main
 ---------------------------------------------- */
$(function(){
	var title = $("head title").text();
	var body = $("body");
	var contents = jQuery.trim($("body pre").html());

	/* clear body */
	body.text("");

	/* parse body text */
	lp.slide = lp.parse_contents(contents);

	lp.slide.unshift(lp.table_of_contents(title));

	/* add table of contents(page = 0) */
	//body.append(lp.table_of_contents(title));

	/* add each slides(page = 1 - lp.slide.length)*/
	jQuery.each(lp.slide, function(){
		body.append(this.to_s());
		if(this.page != 0)
			$(lp.id.slide + this.page).hide();
	});

	/* initialize */
	lp.initialize();
	
	prettyPrint();
});

