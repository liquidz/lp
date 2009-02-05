/* ================================================

	Lazy Presentation v0.04

	Copyright (C) 2009 Masashi Iizuka
	Dual licensed under the MIT and GPL licenses

	Last update: 2009-02-05

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
lp.mode = lp.mode_kind.slide;

lp.common = {
	elem: function(tag){
		return jQuery(document.createElement(tag));
	},

	p: function(text){
		return this.elem("p").text(text);
	}
};

lp.key = {
	up: 38,
	down: 40,
	right: 39,
	left: 37,
	home: 36
};

lp.class = {
	slide: ["slide", "main"],
	pager: "pager",
	sublist: "sublist"
};
lp.id = {
	slide: "#slide"
};

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
}

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
		var box = lp.common.elem("div");
		var main = lp.common.elem("div");
		box.attr("id", lp.id.slide.substr(1) + this.page);
		box.addClass(lp.class.slide[0]);
		main.addClass(lp.class.slide[1]);
		main.append(lp.common.elem("h2").text(this.title));

		jQuery.each(this.body, function(){
			main.append(this);
		});

		box.append(main);
		var link = lp.common.elem("p");
		link.append(lp.common.elem("a").attr("href", "http://github.com/liquidz/lp/tree/master").text("powered by lp"));
		link.css("float", "left");

		var pager = lp.common.elem("p");
		pager.addClass(lp.class.pager);
		pager.text(this.page);
		pager.css("float", "right");

		var clearer = lp.common.elem("div");
		clearer.css("clear", "both");
		clearer.css("height", "0");
		clearer.css("font-size", "0");

		box.append(link);
		box.append(pager);
		box.append(clearer);

		//box.append(lp.common.p(this.page).addClass(lp.class.pager));
		return box;
	}
};

/* =List Class
 ---------------------------------------------- */
lp.List = function(){
	this.active_flag = false;
	this.body = null;
	this.is_sub_list = false;
};
lp.List.prototype = {
	sub_list: function(bool){
		this.is_sub_list = bool;
	},
	finish: function(){
		if(this.active_flag){
			this.active_flag = false;

			var tmp = this.body;
			this.body = null;
			return (this.is_sub_list) ? tmp.addClass(lp.class.sublist) : tmp;
		}
		return null;
	},
	add: function(obj){
		if(!this.active_flag){
			this.body = lp.common.elem("ul");
			this.active_flag = true;
		}
		this.body.append(obj);
	},
	is_active: function(){
		return this.active_flag;
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

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()) close_lists();

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
			lists[level].add(lp.common.elem("li").text(text));
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
		} else if(str.match(/^\[\[([\s\S]+?)\]\](\n|$)/)){
			// code

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()) close_lists();

			var text = RegExp.$1;
			var rest = RegExp.rightContext;
			page.add(lp.common.elem("div").addClass("code").append(lp.common.elem("code").addClass("prettyprint").text(jQuery.trim(text))));
			str = jQuery.trim(rest);
		} else if(str.match(/^#ref\((.+?)\)/)){
			// image

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()) close_lists();

			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			page.add(lp.common.elem("img").attr("src", text));

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

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()) close_lists();

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
	return (lp.options["nowait"]) ? 0 : 500;
};

/* =toggle_slide
 ---------------------------------------------- */
lp.toggle_slide = function(from, to){
	$(lp.id.slide + from).hide(lp.get_effect_speed());
	$(lp.id.slide + to).show(lp.get_effect_speed());
};

/* =next
 ---------------------------------------------- */
lp.next = function(){
	if(lp.mode == lp.mode_kind.slide){
		var last = lp.current_slide;
		if(lp.current_slide < lp.slide.length - 1) ++lp.current_slide;
		else lp.current_slide = 0;
		lp.toggle_slide(last, lp.current_slide);
	}
};
/* =prev
 ---------------------------------------------- */
lp.prev = function(){
	if(lp.mode == lp.mode_kind.slide){
		var last = lp.current_slide;
		if(lp.current_slide > 0) --lp.current_slide;
		else lp.current_slide = lp.slide.length - 1;
		lp.toggle_slide(last, lp.current_slide);
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
	toc.add(lp.common.elem("h3").text("Table of Contents"));
	jQuery.each(lp.slide, function(){
		if(!this.subsection)
			list.add(lp.common.elem("li").text(this.title));
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
	$(lp.id.slide + lp.current_slide).show(lp.get_effect_speed());
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

/* =initialize
 ---------------------------------------------- */
lp.initialize = function(){
	// change font size
	lp.update_size();

	// add events
	var w = $(window);
	w.bind("resize", lp.update_size);

	w.bind("keypress", lp.key_control);

	// set options
	var body = $("body");
	if(lp.options["bg"]) body.css("background", lp.options["bg"]);
	if(lp.options["fg"]) body.css("color", lp.options["fg"]);
};

/* =main
 ---------------------------------------------- */
$(function(){
	var title = $("head title").text();
	var body = $("body");
	var contents = jQuery.trim($("body pre").text());

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

